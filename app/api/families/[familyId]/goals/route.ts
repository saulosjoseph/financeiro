import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

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
    const member = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: session.user.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const goals = await prisma.savingsGoal.findMany({
      where: {
        familyId,
      },
      include: {
        contributions: {
          orderBy: {
            date: 'desc',
          },
          take: 5, // últimas 5 contribuições
        },
        _count: {
          select: {
            contributions: true,
          },
        },
      },
      orderBy: [
        { isCompleted: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

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
    const member = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: session.user.id,
        },
      },
    });

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

    const goal = await prisma.savingsGoal.create({
      data: {
        familyId,
        name,
        description,
        targetAmount: finalTargetAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
        priority: priority !== undefined ? priority : 0,
        isEmergencyFund: isEmergencyFund || false,
        monthlyExpenses: isEmergencyFund ? monthlyExpenses : null,
        targetMonths: isEmergencyFund ? targetMonths : null,
      },
      include: {
        contributions: true,
        _count: {
          select: {
            contributions: true,
          },
        },
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
