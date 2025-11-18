import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET - Listar gastos de uma família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('GET /api/families/[familyId]/expenses - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('GET expenses - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('GET expenses - familyId:', familyId, 'userId:', session.user.id);

    // Verificar se o usuário é membro da família
    const member = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: session.user.id,
        },
      },
    });

    console.log('GET expenses - member found:', !!member);

    if (!member) {
      console.log('GET expenses - Forbidden: User is not a member');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        familyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    console.log('GET expenses - Found', expenses.length, 'expenses');
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Adicionar gasto
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('POST /api/families/[familyId]/expenses - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('POST expense - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('POST expense - familyId:', familyId, 'userId:', session.user.id);

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
    const { amount, description, category, date, isRecurring, recurringType, recurringDay, recurringEndDate, tagIds } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        familyId,
        userId: session.user.id,
        amount,
        description,
        category,
        date: date ? new Date(date) : new Date(),
        isRecurring: isRecurring || false,
        recurringType: isRecurring ? recurringType : null,
        recurringDay: isRecurring && recurringDay !== undefined ? recurringDay : null,
        recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate) : null,
        tags: tagIds && Array.isArray(tagIds) && tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar gasto
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
    const { id, amount, description, category, date, tagIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Verificar se o gasto pertence à família
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense || existingExpense.familyId !== familyId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Remover tags antigas
    await prisma.expenseTag.deleteMany({
      where: { expenseId: id },
    });

    // Atualizar gasto
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        amount,
        description,
        category,
        date: date ? new Date(date) : undefined,
        tags: tagIds && Array.isArray(tagIds) && tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir gasto
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
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

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

    // Verificar se o gasto pertence à família
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense || existingExpense.familyId !== familyId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Excluir tags associadas
    await prisma.expenseTag.deleteMany({
      where: { expenseId: id },
    });

    // Excluir gasto
    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
