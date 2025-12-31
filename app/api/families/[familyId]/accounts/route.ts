import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar contas de uma família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accounts = await client`
      SELECT 
        fa.*,
        (
          SELECT COALESCE(
            fa.initial_balance + 
            COALESCE(SUM(e.amount), 0) - 
            COALESCE((SELECT SUM(s.amount) FROM saidas s WHERE s.account_id = fa.id), 0),
            fa.initial_balance
          )
          FROM entradas e
          WHERE e.account_id = fa.id
        ) as current_balance,
        (
          SELECT COUNT(*)::int FROM entradas WHERE account_id = fa.id
        ) as entradas_count,
        (
          SELECT COUNT(*)::int FROM saidas WHERE account_id = fa.id
        ) as saidas_count
      FROM financial_accounts fa
      WHERE fa.family_id = ${familyId}
      ORDER BY fa.display_order ASC, fa.created_at DESC
    `;

    // Converter snake_case para camelCase
    const accountsFormatted = accounts.map((acc: any) => ({
      id: acc.id,
      familyId: acc.family_id,
      name: acc.name,
      type: acc.type,
      initialBalance: parseFloat(acc.initial_balance || 0),
      creditLimit: acc.credit_limit ? parseFloat(acc.credit_limit) : undefined,
      color: acc.color,
      icon: acc.icon,
      description: acc.description,
      isDefault: acc.is_default,
      isActive: acc.is_active,
      displayOrder: acc.display_order,
      createdAt: acc.created_at,
      updatedAt: acc.updated_at,
      currentBalance: acc.current_balance ? parseFloat(acc.current_balance) : parseFloat(acc.initial_balance || 0),
      entradasCount: acc.entradas_count || 0,
      saidasCount: acc.saidas_count || 0,
    }));

    return NextResponse.json(accountsFormatted);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST - Criar nova conta
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      type, 
      initialBalance = 0, 
      creditLimit, 
      color = '#6B7280', 
      icon = 'wallet',
      description,
      isDefault = false,
      isActive = true 
    } = body;

    // Validações
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome da conta é obrigatório' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Tipo da conta é obrigatório' },
        { status: 400 }
      );
    }

    const validTypes = ['checking', 'savings', 'cash', 'credit_card', 'investment'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de conta inválido' },
        { status: 400 }
      );
    }

    // Se for cartão de crédito, creditLimit é obrigatório
    if (type === 'credit_card' && !creditLimit) {
      return NextResponse.json(
        { error: 'Limite de crédito é obrigatório para cartões de crédito' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma conta com o mesmo nome
    const existing = await client`
      SELECT id FROM financial_accounts
      WHERE family_id = ${familyId} AND name = ${name.trim()}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Já existe uma conta com este nome' },
        { status: 400 }
      );
    }

    // Se for marcada como padrão, desmarcar outras
    if (isDefault) {
      await client`
        UPDATE financial_accounts
        SET is_default = FALSE
        WHERE family_id = ${familyId}
      `;
    }

    // Buscar próximo display_order
    const maxOrder = await client`
      SELECT COALESCE(MAX(display_order), -1) as max_order
      FROM financial_accounts
      WHERE family_id = ${familyId}
    `;
    const displayOrder = (maxOrder[0]?.max_order ?? -1) + 1;

    const accountId = generateId();
    const [account] = await client`
      INSERT INTO financial_accounts (
        id, family_id, name, type, initial_balance, credit_limit,
        color, icon, description, is_default, is_active, display_order,
        created_at, updated_at
      )
      VALUES (
        ${accountId}, ${familyId}, ${name.trim()}, ${type}, ${initialBalance},
        ${creditLimit || null}, ${color}, ${icon}, ${description || null},
        ${isDefault}, ${isActive}, ${displayOrder}, NOW(), NOW()
      )
      RETURNING *
    `;

    // Converter snake_case para camelCase
    const accountFormatted = {
      id: account.id,
      familyId: account.family_id,
      name: account.name,
      type: account.type,
      initialBalance: parseFloat(account.initial_balance || 0),
      creditLimit: account.credit_limit ? parseFloat(account.credit_limit) : undefined,
      color: account.color,
      icon: account.icon,
      description: account.description,
      isDefault: account.is_default,
      isActive: account.is_active,
      displayOrder: account.display_order,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };

    return NextResponse.json(accountFormatted, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
