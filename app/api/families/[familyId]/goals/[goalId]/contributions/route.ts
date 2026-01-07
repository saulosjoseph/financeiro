import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar contribuições de uma meta
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string; goalId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, goalId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar se a meta existe e pertence à família
    const goal = await client`
      SELECT * FROM savings_goals
      WHERE id = ${goalId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (goal.length === 0) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    const contributions = await client`
      SELECT 
        gc.*,
        CASE 
          WHEN e.id IS NOT NULL THEN json_build_object(
            'id', e.id,
            'description', e.description,
            'date', e.date,
            'user', json_build_object(
              'name', u.name,
              'email', u.email
            )
          )
          ELSE NULL
        END as entrada
      FROM goal_contributions gc
      LEFT JOIN entradas e ON e.id = gc.entrada_id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE gc.goal_id = ${goalId}
      ORDER BY gc.date DESC
    `;

    return NextResponse.json(contributions);
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Adicionar contribuição a uma meta
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string; goalId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, goalId } = await params;

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verificar se a meta existe e pertence à família
    const goal = await client`
      SELECT * FROM savings_goals
      WHERE id = ${goalId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (goal.length === 0) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { amount, description, date, entradaId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Se entradaId foi fornecido, verificar se existe e pertence à família
    if (entradaId) {
      const entrada = await client`
        SELECT * FROM entradas
        WHERE id = ${entradaId} AND family_id = ${familyId}
        LIMIT 1
      `;

      if (entrada.length === 0) {
        return NextResponse.json(
          { error: 'Entrada não encontrada' },
          { status: 404 }
        );
      }
    }

    // Criar contribuição e atualizar currentAmount da meta em uma transação
    const contributionId = generateId();
    await client.begin(async (tx) => {
      await tx`
        INSERT INTO goal_contributions (id, goal_id, entrada_id, amount, description, date, created_at)
        VALUES (${contributionId}, ${goalId}, ${entradaId || null}, ${amount}, ${description || null}, ${date ? new Date(date).toISOString() : new Date().toISOString()}, NOW())
      `;
      
      await tx`
        UPDATE savings_goals
        SET current_amount = current_amount + ${amount}, updated_at = NOW()
        WHERE id = ${goalId}
      `;
    });

    // Buscar contribution criada
    const contribution = await client`
      SELECT 
        gc.*,
        CASE 
          WHEN e.id IS NOT NULL THEN json_build_object(
            'id', e.id,
            'description', e.description,
            'date', e.date
          )
          ELSE NULL
        END as entrada
      FROM goal_contributions gc
      LEFT JOIN entradas e ON e.id = gc.entrada_id
      WHERE gc.id = ${contributionId}
      LIMIT 1
    `;

    // Verificar se a meta foi atingida
    const updatedGoal = await client`
      SELECT * FROM savings_goals WHERE id = ${goalId} LIMIT 1
    `;
    
    if (!updatedGoal[0].is_completed && parseFloat(updatedGoal[0].current_amount) >= parseFloat(updatedGoal[0].target_amount)) {
      await client`
        UPDATE savings_goals
        SET is_completed = TRUE, completed_at = NOW(), updated_at = NOW()
        WHERE id = ${goalId}
      `;
    }

    return NextResponse.json(contribution[0]);
  } catch (error) {
    console.error('Error creating contribution:', error);
    return NextResponse.json(
      { error: 'Failed to create contribution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
