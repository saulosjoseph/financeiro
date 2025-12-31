import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar metas de uma família
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

    const goals = await client`
      SELECT 
        sg.*,
        COALESCE(
          (
            SELECT json_agg(gc.* ORDER BY gc.date DESC)
            FROM (
              SELECT * FROM goal_contributions 
              WHERE goal_id = sg.id 
              ORDER BY date DESC 
              LIMIT 5
            ) gc
          ),
          '[]'::json
        ) as contributions,
        (
          SELECT COUNT(*)::int
          FROM goal_contributions
          WHERE goal_id = sg.id
        ) as contributions_count
      FROM savings_goals sg
      WHERE sg.family_id = ${familyId}
      ORDER BY 
        sg.is_completed ASC,
        sg.priority DESC,
        sg.created_at DESC
    `;

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Criar nova meta
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
      description, 
      targetAmount, 
      targetDate, 
      priority, 
      isEmergencyFund, 
      monthlyExpenses, 
      targetMonths 
    } = body;

    // Validações
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome da meta é obrigatório' },
        { status: 400 }
      );
    }

    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Valor alvo deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Se for reserva de emergência, calcular targetAmount baseado em despesas mensais
    let finalTargetAmount = targetAmount;
    if (isEmergencyFund && monthlyExpenses && targetMonths) {
      finalTargetAmount = monthlyExpenses * targetMonths;
    }

    const goalId = generateId();
    const goal = await client`
      INSERT INTO savings_goals (
        id, family_id, name, description, target_amount, target_date,
        priority, is_emergency_fund, monthly_expenses, target_months,
        created_at, updated_at
      )
      VALUES (
        ${goalId}, ${familyId}, ${name}, ${description || null}, ${finalTargetAmount}, 
        ${targetDate ? new Date(targetDate) : null}, ${priority !== undefined ? priority : 0}, 
        ${isEmergencyFund || false}, ${isEmergencyFund ? monthlyExpenses : null}, 
        ${isEmergencyFund ? targetMonths : null}, NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      ...goal[0],
      contributions: [],
      contributions_count: 0
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
