import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar transferências de uma família
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

    const transfers = await client`
      SELECT 
        t.*,
        json_build_object(
          'id', fa_from.id,
          'name', fa_from.name,
          'type', fa_from.type,
          'color', fa_from.color,
          'icon', fa_from.icon
        ) as from_account,
        json_build_object(
          'id', fa_to.id,
          'name', fa_to.name,
          'type', fa_to.type,
          'color', fa_to.color,
          'icon', fa_to.icon
        ) as to_account
      FROM transfers t
      JOIN financial_accounts fa_from ON fa_from.id = t.from_account_id
      JOIN financial_accounts fa_to ON fa_to.id = t.to_account_id
      WHERE t.family_id = ${familyId}
      ORDER BY t.date DESC, t.created_at DESC
    `;

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

// POST - Criar nova transferência
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
    const { fromAccountId, toAccountId, amount, description, date } = body;

    // Validações
    if (!fromAccountId || !toAccountId) {
      return NextResponse.json(
        { error: 'Contas de origem e destino são obrigatórias' },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: 'Conta de origem e destino não podem ser iguais' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verificar se ambas contas existem e pertencem à família
    const accounts = await client`
      SELECT id FROM financial_accounts
      WHERE family_id = ${familyId} AND id IN (${fromAccountId}, ${toAccountId})
    `;

    if (accounts.length !== 2) {
      return NextResponse.json(
        { error: 'Uma ou ambas contas não encontradas' },
        { status: 404 }
      );
    }

    const transferDate = date ? new Date(date).toISOString() : new Date().toISOString();

    // Criar transferência e transações associadas em uma transação
    const transferId = generateId();
    const entradaId = generateId();
    const saidaId = generateId();

    await client.begin(async (tx) => {
      // Criar registro de transferência
      await tx`
        INSERT INTO transfers (
          id, family_id, from_account_id, to_account_id, amount, description, date, created_at, updated_at
        )
        VALUES (
          ${transferId}, ${familyId}, ${fromAccountId}, ${toAccountId}, ${amount}, 
          ${description || null}, ${transferDate}, NOW(), NOW()
        )
      `;

      // Criar saída na conta de origem
      await tx`
        INSERT INTO saidas (
          id, family_id, account_id, user_id, amount, description, category, date, created_at, updated_at
        )
        VALUES (
          ${saidaId}, ${familyId}, ${fromAccountId}, ${session.user.id}, ${amount},
          ${description ? `Transferência: ${description}` : 'Transferência'}, 
          'transferencia', ${transferDate}, NOW(), NOW()
        )
      `;

      // Criar entrada na conta de destino
      await tx`
        INSERT INTO entradas (
          id, family_id, account_id, user_id, amount, description, source, date, created_at, updated_at
        )
        VALUES (
          ${entradaId}, ${familyId}, ${toAccountId}, ${session.user.id}, ${amount},
          ${description ? `Transferência: ${description}` : 'Transferência'},
          'transferencia', ${transferDate}, NOW(), NOW()
        )
      `;
    });

    // Buscar transferência criada com detalhes
    const transfer = await client`
      SELECT 
        t.*,
        json_build_object(
          'id', fa_from.id,
          'name', fa_from.name,
          'type', fa_from.type,
          'color', fa_from.color,
          'icon', fa_from.icon
        ) as from_account,
        json_build_object(
          'id', fa_to.id,
          'name', fa_to.name,
          'type', fa_to.type,
          'color', fa_to.color,
          'icon', fa_to.icon
        ) as to_account
      FROM transfers t
      JOIN financial_accounts fa_from ON fa_from.id = t.from_account_id
      JOIN financial_accounts fa_to ON fa_to.id = t.to_account_id
      WHERE t.id = ${transferId}
      LIMIT 1
    `;

    return NextResponse.json(transfer[0], { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}
