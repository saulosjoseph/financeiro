import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership } from '@/lib/api-helpers';

// GET - Obter detalhes de uma conta
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string; accountId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, accountId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const account = await client`
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
      WHERE fa.id = ${accountId} AND fa.family_id = ${familyId}
      LIMIT 1
    `;

    if (account.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Converter snake_case para camelCase
    const acc = account[0];
    const accountFormatted = {
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
    };

    return NextResponse.json(accountFormatted);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar conta
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ familyId: string; accountId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, accountId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar se a conta existe
    const existing = await client`
      SELECT * FROM financial_accounts
      WHERE id = ${accountId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      type,
      initialBalance,
      creditLimit, 
      color, 
      icon,
      description,
      isDefault,
      isActive,
      displayOrder
    } = body;

    // Se mudar para padrão, desmarcar outras
    if (isDefault && !existing[0].is_default) {
      await client`
        UPDATE financial_accounts
        SET is_default = FALSE
        WHERE family_id = ${familyId} AND id != ${accountId}
      `;
    }

    // Construir query dinâmica
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(name);
    }
    if (type !== undefined) {
      updates.push('type = $' + (values.length + 1));
      values.push(type);
    }
    if (initialBalance !== undefined) {
      updates.push('initial_balance = $' + (values.length + 1));
      values.push(initialBalance);
    }
    if (creditLimit !== undefined) {
      updates.push('credit_limit = $' + (values.length + 1));
      values.push(creditLimit);
    }
    if (color !== undefined) {
      updates.push('color = $' + (values.length + 1));
      values.push(color);
    }
    if (icon !== undefined) {
      updates.push('icon = $' + (values.length + 1));
      values.push(icon);
    }
    if (description !== undefined) {
      updates.push('description = $' + (values.length + 1));
      values.push(description);
    }
    if (isDefault !== undefined) {
      updates.push('is_default = $' + (values.length + 1));
      values.push(isDefault);
    }
    if (isActive !== undefined) {
      updates.push('is_active = $' + (values.length + 1));
      values.push(isActive);
    }
    if (displayOrder !== undefined) {
      updates.push('display_order = $' + (values.length + 1));
      values.push(displayOrder);
    }
    
    updates.push('updated_at = NOW()');
    
    values.push(accountId);
    const [account] = await client.unsafe(
      `UPDATE financial_accounts SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

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

    return NextResponse.json(accountFormatted);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar conta
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ familyId: string; accountId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, accountId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar se a conta existe
    const existing = await client`
      SELECT * FROM financial_accounts
      WHERE id = ${accountId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Verificar se a conta tem transações
    const hasTransactions = await client`
      SELECT 
        (SELECT COUNT(*) FROM entradas WHERE account_id = ${accountId}) +
        (SELECT COUNT(*) FROM saidas WHERE account_id = ${accountId}) as total
    `;

    if (hasTransactions[0].total > 0) {
      return NextResponse.json(
        { error: 'Não é possível deletar conta com transações. Desative-a em vez disso.' },
        { status: 400 }
      );
    }

    // Deletar conta
    await client`
      DELETE FROM financial_accounts
      WHERE id = ${accountId}
    `;

    return NextResponse.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
