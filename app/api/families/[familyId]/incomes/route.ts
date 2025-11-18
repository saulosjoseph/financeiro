import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET - Listar rendas de uma família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('GET /api/families/[familyId]/incomes - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('GET incomes - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('GET incomes - familyId:', familyId, 'userId:', session.user.id);

    // Verificar se o usuário é membro da família
    const member = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: session.user.id,
        },
      },
    });

    console.log('GET incomes - member found:', !!member);

    if (!member) {
      console.log('GET incomes - Forbidden: User is not a member');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const incomes = await prisma.income.findMany({
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

    console.log('GET incomes - Found', incomes.length, 'incomes');
    return NextResponse.json(incomes);
  } catch (error) {
    console.error('Error fetching incomes:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch incomes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Adicionar renda
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('POST /api/families/[familyId]/incomes - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('POST income - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('POST income - familyId:', familyId, 'userId:', session.user.id);

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
    const { amount, description, source, date, isRecurring, recurringType, recurringDay, recurringEndDate, tagIds } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const income = await prisma.income.create({
      data: {
        familyId,
        userId: session.user.id,
        amount,
        description,
        source,
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

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create income', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar renda
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
    const { id, amount, description, source, date, tagIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Income ID is required' }, { status: 400 });
    }

    // Verificar se a renda pertence à família
    const existingIncome = await prisma.income.findUnique({
      where: { id },
    });

    if (!existingIncome || existingIncome.familyId !== familyId) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    // Remover tags antigas
    await prisma.incomeTag.deleteMany({
      where: { incomeId: id },
    });

    // Atualizar renda
    const income = await prisma.income.update({
      where: { id },
      data: {
        amount,
        description,
        source,
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

    return NextResponse.json(income);
  } catch (error) {
    console.error('Error updating income:', error);
    return NextResponse.json(
      { error: 'Failed to update income', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir renda
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
      return NextResponse.json({ error: 'Income ID is required' }, { status: 400 });
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

    // Verificar se a renda pertence à família
    const existingIncome = await prisma.income.findUnique({
      where: { id },
    });

    if (!existingIncome || existingIncome.familyId !== familyId) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    // Excluir tags associadas
    await prisma.incomeTag.deleteMany({
      where: { incomeId: id },
    });

    // Excluir renda
    await prisma.income.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Error deleting income:', error);
    return NextResponse.json(
      { error: 'Failed to delete income', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
