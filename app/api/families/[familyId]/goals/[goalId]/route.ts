import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

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

    const goal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        familyId,
      },
      include: {
        contributions: {
          include: {
            entrada: {
              select: {
                id: true,
                description: true,
                date: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
        _count: {
          select: {
            contributions: true,
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    return NextResponse.json(goal);
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

    // Verificar se a meta existe e pertence à família
    const existingGoal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        familyId,
      },
    });

    if (!existingGoal) {
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
    const completedAt = isCompleted && !existingGoal.isCompleted ? new Date() : existingGoal.completedAt;

    const goal = await prisma.savingsGoal.update({
      where: {
        id: goalId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        targetAmount: finalTargetAmount !== undefined ? finalTargetAmount : undefined,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
        priority: priority !== undefined ? priority : undefined,
        isEmergencyFund: isEmergencyFund !== undefined ? isEmergencyFund : undefined,
        monthlyExpenses: isEmergencyFund !== undefined ? (isEmergencyFund ? monthlyExpenses : null) : undefined,
        targetMonths: isEmergencyFund !== undefined ? (isEmergencyFund ? targetMonths : null) : undefined,
        isCompleted: isCompleted !== undefined ? isCompleted : undefined,
        completedAt,
      },
      include: {
        contributions: {
          orderBy: {
            date: 'desc',
          },
          take: 5,
        },
        _count: {
          select: {
            contributions: true,
          },
        },
      },
    });

    return NextResponse.json(goal);
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

    // Verificar se a meta existe e pertence à família
    const existingGoal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        familyId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    await prisma.savingsGoal.delete({
      where: {
        id: goalId,
      },
    });

    return NextResponse.json({ message: 'Meta deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
