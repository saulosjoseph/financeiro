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
