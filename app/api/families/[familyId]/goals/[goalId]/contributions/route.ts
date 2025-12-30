import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { Decimal } from '@prisma/client/runtime/library';

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
    const goal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        familyId,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    const contributions = await prisma.goalContribution.findMany({
      where: {
        goalId,
      },
      include: {
        entrada: {
          select: {
            id: true,
            description: true,
            date: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

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
    const goal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        familyId,
      },
    });

    if (!goal) {
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
      const entrada = await prisma.entrada.findFirst({
        where: {
          id: entradaId,
          familyId,
        },
      });

      if (!entrada) {
        return NextResponse.json(
          { error: 'Entrada não encontrada' },
          { status: 404 }
        );
      }
    }

    // Criar contribuição e atualizar currentAmount da meta em uma transação
    const [contribution, updatedGoal] = await prisma.$transaction([
      prisma.goalContribution.create({
        data: {
          goalId,
          entradaId: entradaId || null,
          amount,
          description,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          entrada: {
            select: {
              id: true,
              description: true,
              date: true,
            },
          },
        },
      }),
      prisma.savingsGoal.update({
        where: {
          id: goalId,
        },
        data: {
          currentAmount: {
            increment: amount,
          },
        },
      }),
    ]);

    // Verificar se a meta foi atingida
    if (!updatedGoal.isCompleted && new Decimal(updatedGoal.currentAmount).gte(updatedGoal.targetAmount)) {
      await prisma.savingsGoal.update({
        where: {
          id: goalId,
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(contribution);
  } catch (error) {
    console.error('Error creating contribution:', error);
    return NextResponse.json(
      { error: 'Failed to create contribution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
