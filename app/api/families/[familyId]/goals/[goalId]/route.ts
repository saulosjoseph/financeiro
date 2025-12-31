import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership } from '@/lib/api-helpers';

// GET - Obter detalhes de uma meta específica
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

    const goal = await client`
      SELECT 
        sg.*,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', gc.id,
                'goalId', gc.goal_id,
                'entradaId', gc.entrada_id,
                'amount', gc.amount,
                'description', gc.description,
                'date', gc.date,
                'createdAt', gc.created_at,
                'entrada', CASE 
                  WHEN e.id IS NOT NULL THEN json_build_object(
                    'id', e.id,
                    'description', e.description,
                    'date', e.date
                  )
                  ELSE NULL
                END
              ) ORDER BY gc.date DESC
            )
            FROM goal_contributions gc
            LEFT JOIN entradas e ON e.id = gc.entrada_id
            WHERE gc.goal_id = sg.id
          ),
          '[]'::json
        ) as contributions,
        (
          SELECT COUNT(*)::int
          FROM goal_contributions
          WHERE goal_id = sg.id
        ) as contributions_count
      FROM savings_goals sg
      WHERE sg.id = ${goalId} AND sg.family_id = ${familyId}
      LIMIT 1
    `;

    if (goal.length === 0) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    return NextResponse.json(goal[0]);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar meta
export async function PUT(
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
    const existingGoal = await client`
      SELECT * FROM savings_goals
      WHERE id = ${goalId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (existingGoal.length === 0) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      targetAmount, 
      targetDate, 
      priority, 
      isEmergencyFund, 
      monthlyExpenses, 
      targetMonths,
      isCompleted
    } = body;

    // Recalcular targetAmount se for reserva de emergência e mudou os parâmetros
    let finalTargetAmount = targetAmount;
    if (isEmergencyFund && monthlyExpenses && targetMonths) {
      finalTargetAmount = monthlyExpenses * targetMonths;
    }

    // Se mudou para concluída, adicionar data de conclusão
    const completedAt = isCompleted && !existingGoal[0].is_completed ? new Date() : existingGoal[0].completed_at;

    // Construir query dinâmica apenas com campos fornecidos
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = $' + (values.length + 1));
      values.push(description);
    }
    if (finalTargetAmount !== undefined) {
      updates.push('target_amount = $' + (values.length + 1));
      values.push(finalTargetAmount);
    }
    if (targetDate !== undefined) {
      updates.push('target_date = $' + (values.length + 1));
      values.push(targetDate ? new Date(targetDate) : null);
    }
    if (priority !== undefined) {
      updates.push('priority = $' + (values.length + 1));
      values.push(priority);
    }
    if (isEmergencyFund !== undefined) {
      updates.push('is_emergency_fund = $' + (values.length + 1));
      values.push(isEmergencyFund);
      if (isEmergencyFund) {
        updates.push('monthly_expenses = $' + (values.length + 1));
        values.push(monthlyExpenses);
        updates.push('target_months = $' + (values.length + 1));
        values.push(targetMonths);
      } else {
        updates.push('monthly_expenses = NULL');
        updates.push('target_months = NULL');
      }
    }
    if (isCompleted !== undefined) {
      updates.push('is_completed = $' + (values.length + 1));
      values.push(isCompleted);
      updates.push('completed_at = $' + (values.length + 1));
      values.push(completedAt);
    }
    
    updates.push('updated_at = NOW()');
    
    values.push(goalId);
    const goal = await client.unsafe(
      `UPDATE savings_goals SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return NextResponse.json(goal[0]);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar meta
export async function DELETE(
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
    const existingGoal = await client`
      SELECT * FROM savings_goals
      WHERE id = ${goalId} AND family_id = ${familyId}
      LIMIT 1
    `;

    if (existingGoal.length === 0) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    // Deletar meta (contribuições serão deletadas em cascade)
    await client`
      DELETE FROM savings_goals
      WHERE id = ${goalId}
    `;

    return NextResponse.json({ message: 'Meta deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
