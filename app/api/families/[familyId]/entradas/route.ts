import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar entradas de uma família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('GET /api/families/[familyId]/entradas - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('GET entradas - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('GET entradas - familyId:', familyId, 'userId:', session.user.id);

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    console.log('GET entradas - member found:', !!member);

    if (!member) {
      console.log('GET entradas - Forbidden: User is not a member');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entradas = await client`
      SELECT 
        e.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as user,
        json_build_object(
          'id', fa.id,
          'name', fa.name,
          'type', fa.type,
          'color', fa.color,
          'icon', fa.icon
        ) as account,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', et.id,
                'entradaId', et.entrada_id,
                'tagId', et.tag_id,
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'color', t.color,
                  'familyId', t.family_id,
                  'createdAt', t.created_at
                )
              )
            )
            FROM entrada_tags et
            JOIN tags t ON t.id = et.tag_id
            WHERE et.entrada_id = e.id
          ),
          '[]'::json
        ) as tags
      FROM entradas e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN financial_accounts fa ON fa.id = e.account_id
      WHERE e.family_id = ${familyId}
      ORDER BY e.date DESC
    `;

    console.log('GET entradas - Found', entradas.length, 'entradas');
    return NextResponse.json(entradas);
  } catch (error) {
    console.error('Error fetching entradas:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch entradas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Adicionar entrada
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('POST /api/families/[familyId]/entradas - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('POST entrada - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('POST entrada - familyId:', familyId, 'userId:', session.user.id);

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      accountId,
      amount, 
      description, 
      source, 
      date, 
      isRecurring, 
      recurringType, 
      recurringDay, 
      recurringEndDate, 
      tagIds 
    } = body;

    // Validar accountId
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Validar se a conta pertence à família
    const account = await client`
      SELECT id FROM financial_accounts
      WHERE id = ${accountId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (account.length === 0) {
      return NextResponse.json(
        { error: 'Account not found or does not belong to this family' },
        { status: 404 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const entradaId = generateId();
    const entradaDate = date ? new Date(date) : new Date();
    const recurringEndDateParsed = isRecurring && recurringEndDate ? new Date(recurringEndDate) : null;

    // Inserir entrada usando transação
    await client.begin(async (tx) => {
      // Inserir entrada
      await tx`
        INSERT INTO entradas (
          id, family_id, account_id, user_id, amount, description, source, 
          date, is_recurring, recurring_type, recurring_day, recurring_end_date,
          created_at, updated_at
        )
        VALUES (
          ${entradaId}, ${familyId}, ${accountId}, ${session.user.id}, ${amount}, 
          ${description || null}, ${source || null}, ${entradaDate},
          ${isRecurring || false}, ${isRecurring ? recurringType : null}, 
          ${isRecurring && recurringDay !== undefined ? recurringDay : null},
          ${recurringEndDateParsed},
          NOW(), NOW()
        )
      `;

      // Inserir tags se fornecidas
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        for (const tagId of tagIds) {
          const entradaTagId = generateId();
          await tx`
            INSERT INTO entrada_tags (id, entrada_id, tag_id)
            VALUES (${entradaTagId}, ${entradaId}, ${tagId})
          `;
        }
      }
    });

    // Buscar entrada criada com relações
    const entrada = await client`
      SELECT 
        e.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as user,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', et.id,
                'entradaId', et.entrada_id,
                'tagId', et.tag_id,
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'color', t.color,
                  'familyId', t.family_id,
                  'createdAt', t.created_at
                )
              )
            )
            FROM entrada_tags et
            JOIN tags t ON t.id = et.tag_id
            WHERE et.entrada_id = e.id
          ),
          '[]'::json
        ) as tags
      FROM entradas e
      JOIN users u ON u.id = e.user_id
      WHERE e.id = ${entradaId}
    `;

    return NextResponse.json(entrada[0], { status: 201 });
  } catch (error) {
    console.error('Error creating entrada:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create entrada', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar entrada
export async function PUT(
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
    const { id, accountId, amount, description, source, date, tagIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entrada ID is required' }, { status: 400 });
    }

    // Verificar se a entrada pertence à família
    const existingEntrada = await client`
      SELECT * FROM entradas WHERE id = ${id} AND family_id = ${familyId} LIMIT 1
    `;

    if (existingEntrada.length === 0) {
      return NextResponse.json({ error: 'Entrada not found' }, { status: 404 });
    }

    // Se accountId fornecido, validar
    if (accountId) {
      const account = await client`
        SELECT id FROM financial_accounts
        WHERE id = ${accountId} AND family_id = ${familyId}
        LIMIT 1
      `;

      if (account.length === 0) {
        return NextResponse.json(
          { error: 'Account not found or does not belong to this family' },
          { status: 404 }
        );
      }
    }

    // Atualizar entrada e tags usando transação
    await client.begin(async (tx) => {
      // Atualizar entrada
      await tx`
        UPDATE entradas
        SET 
          account_id = COALESCE(${accountId}, account_id),
          amount = COALESCE(${amount}, amount),
          description = COALESCE(${description}, description),
          source = COALESCE(${source}, source),
          date = COALESCE(${date ? new Date(date) : null}, date),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Remover tags antigas
      await tx`DELETE FROM entrada_tags WHERE entrada_id = ${id}`;

      // Inserir novas tags se fornecidas
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        for (const tagId of tagIds) {
          const entradaTagId = generateId();
          await tx`
            INSERT INTO entrada_tags (id, entrada_id, tag_id)
            VALUES (${entradaTagId}, ${id}, ${tagId})
          `;
        }
      }
    });

    // Buscar entrada atualizada com relações
    const entrada = await client`
      SELECT 
        e.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as user,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', et.id,
                'entradaId', et.entrada_id,
                'tagId', et.tag_id,
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'color', t.color,
                  'familyId', t.family_id,
                  'createdAt', t.created_at
                )
              )
            )
            FROM entrada_tags et
            JOIN tags t ON t.id = et.tag_id
            WHERE et.entrada_id = e.id
          ),
          '[]'::json
        ) as tags
      FROM entradas e
      JOIN users u ON u.id = e.user_id
      WHERE e.id = ${id}
    `;

    return NextResponse.json(entrada[0]);
  } catch (error) {
    console.error('Error updating entrada:', error);
    return NextResponse.json(
      { error: 'Failed to update entrada', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir entrada
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entrada ID is required' }, { status: 400 });
    }

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar se a entrada pertence à família
    const existingEntrada = await client`
      SELECT * FROM entradas WHERE id = ${id} AND family_id = ${familyId} LIMIT 1
    `;

    if (existingEntrada.length === 0) {
      return NextResponse.json({ error: 'Entrada not found' }, { status: 404 });
    }

    // Excluir entrada (cascade irá deletar tags associadas)
    await client`DELETE FROM entradas WHERE id = ${id}`;

    return NextResponse.json({ message: 'Entrada deleted successfully' });
  } catch (error) {
    console.error('Error deleting entrada:', error);
    return NextResponse.json(
      { error: 'Failed to delete entrada', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
