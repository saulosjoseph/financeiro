import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar saídas de uma família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('GET /api/families/[familyId]/saidas - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('GET saidas - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('GET saidas - familyId:', familyId, 'userId:', session.user.id);

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    console.log('GET saidas - member found:', !!member);

    if (!member) {
      console.log('GET saidas - Forbidden: User is not a member');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const saidas = await client`
      SELECT 
        s.*,
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
                'id', st.id,
                'saidaId', st.saida_id,
                'tagId', st.tag_id,
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'color', t.color,
                  'familyId', t.family_id,
                  'createdAt', t.created_at
                )
              )
            )
            FROM saida_tags st
            JOIN tags t ON t.id = st.tag_id
            WHERE st.saida_id = s.id
          ),
          '[]'::json
        ) as tags
      FROM saidas s
      JOIN users u ON u.id = s.user_id
      WHERE s.family_id = ${familyId}
      ORDER BY s.date DESC
    `;

    console.log('GET saidas - Found', saidas.length, 'saidas');
    return NextResponse.json(saidas);
  } catch (error) {
    console.error('Error fetching saidas:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch saidas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Adicionar saída
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('POST /api/families/[familyId]/saidas - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('POST saida - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('POST saida - familyId:', familyId, 'userId:', session.user.id);

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
      category, 
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

    const saidaId = generateId();
    const saidaDate = date ? new Date(date) : new Date();
    const recurringEndDateParsed = isRecurring && recurringEndDate ? new Date(recurringEndDate) : null;

    // Inserir saída usando transação
    await client.begin(async (tx) => {
      // Inserir saída
      await tx`
        INSERT INTO saidas (
          id, family_id, account_id, user_id, amount, description, category, 
          date, is_recurring, recurring_type, recurring_day, recurring_end_date,
          created_at, updated_at
        )
        VALUES (
          ${saidaId}, ${familyId}, ${accountId}, ${session.user.id}, ${amount}, 
          ${description || null}, ${category || null}, ${saidaDate},
          ${isRecurring || false}, ${isRecurring ? recurringType : null}, 
          ${isRecurring && recurringDay !== undefined ? recurringDay : null},
          ${recurringEndDateParsed},
          NOW(), NOW()
        )
      `;

      // Inserir tags se fornecidas
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        for (const tagId of tagIds) {
          const saidaTagId = generateId();
          await tx`
            INSERT INTO saida_tags (id, saida_id, tag_id)
            VALUES (${saidaTagId}, ${saidaId}, ${tagId})
          `;
        }
      }
    });

    // Buscar saída criada com relações
    const saida = await client`
      SELECT 
        s.*,
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
                'id', st.id,
                'saidaId', st.saida_id,
                'tagId', st.tag_id,
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'color', t.color,
                  'familyId', t.family_id,
                  'createdAt', t.created_at
                )
              )
            )
            FROM saida_tags st
            JOIN tags t ON t.id = st.tag_id
            WHERE st.saida_id = s.id
          ),
          '[]'::json
        ) as tags
      FROM saidas s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ${saidaId}
    `;

    return NextResponse.json(saida[0], { status: 201 });
  } catch (error) {
    console.error('Error creating saida:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create saida', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar saída
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
    const { id, accountId, amount, description, category, date, tagIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Saida ID is required' }, { status: 400 });
    }

    // Verificar se a saída pertence à família
    const existingSaida = await client`
      SELECT * FROM saidas WHERE id = ${id} AND family_id = ${familyId} LIMIT 1
    `;

    if (existingSaida.length === 0) {
      return NextResponse.json({ error: 'Saida not found' }, { status: 404 });
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

    // Atualizar saída e tags usando transação
    await client.begin(async (tx) => {
      // Atualizar saída
      await tx`
        UPDATE saidas
        SET 
          account_id = COALESCE(${accountId}, account_id),
          amount = COALESCE(${amount}, amount),
          description = COALESCE(${description}, description),
          category = COALESCE(${category}, category),
          date = COALESCE(${date ? new Date(date) : null}, date),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Remover tags antigas
      await tx`DELETE FROM saida_tags WHERE saida_id = ${id}`;

      // Inserir novas tags se fornecidas
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        for (const tagId of tagIds) {
          const saidaTagId = generateId();
          await tx`
            INSERT INTO saida_tags (id, saida_id, tag_id)
            VALUES (${saidaTagId}, ${id}, ${tagId})
          `;
        }
      }
    });

    // Buscar saída atualizada com relações
    const saida = await client`
      SELECT 
        s.*,
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
                'id', st.id,
                'saidaId', st.saida_id,
                'tagId', st.tag_id,
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'color', t.color,
                  'familyId', t.family_id,
                  'createdAt', t.created_at
                )
              )
            )
            FROM saida_tags st
            JOIN tags t ON t.id = st.tag_id
            WHERE st.saida_id = s.id
          ),
          '[]'::json
        ) as tags
      FROM saidas s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ${id}
    `;

    return NextResponse.json(saida[0]);
  } catch (error) {
    console.error('Error updating saida:', error);
    return NextResponse.json(
      { error: 'Failed to update saida', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir saída
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
      return NextResponse.json({ error: 'Saida ID is required' }, { status: 400 });
    }

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar se a saída pertence à família
    const existingSaida = await client`
      SELECT * FROM saidas WHERE id = ${id} AND family_id = ${familyId} LIMIT 1
    `;

    if (existingSaida.length === 0) {
      return NextResponse.json({ error: 'Saida not found' }, { status: 404 });
    }

    // Excluir saída (cascade irá deletar tags associadas)
    await client`DELETE FROM saidas WHERE id = ${id}`;

    return NextResponse.json({ message: 'Saida deleted successfully' });
  } catch (error) {
    console.error('Error deleting saida:', error);
    return NextResponse.json(
      { error: 'Failed to delete saida', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
