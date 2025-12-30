import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

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
    const member = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: session.user.id,
        },
      },
    });

    console.log('GET saidas - member found:', !!member);

    if (!member) {
      console.log('GET saidas - Forbidden: User is not a member');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const saidas = await prisma.saida.findMany({
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

    const saida = await prisma.saida.create({
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

    return NextResponse.json(saida, { status: 201 });
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
      return NextResponse.json({ error: 'Saida ID is required' }, { status: 400 });
    }

    // Verificar se a saída pertence à família
    const existingSaida = await prisma.saida.findUnique({
      where: { id },
    });

    if (!existingSaida || existingSaida.familyId !== familyId) {
      return NextResponse.json({ error: 'Saida not found' }, { status: 404 });
    }

    // Remover tags antigas
    await prisma.saidaTag.deleteMany({
      where: { saidaId: id },
    });

    // Atualizar saída
    const saida = await prisma.saida.update({
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

    return NextResponse.json(saida);
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

    // Verificar se a saída pertence à família
    const existingSaida = await prisma.saida.findUnique({
      where: { id },
    });

    if (!existingSaida || existingSaida.familyId !== familyId) {
      return NextResponse.json({ error: 'Saida not found' }, { status: 404 });
    }

    // Excluir tags associadas
    await prisma.saidaTag.deleteMany({
      where: { saidaId: id },
    });

    // Excluir saída
    await prisma.saida.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Saida deleted successfully' });
  } catch (error) {
    console.error('Error deleting saida:', error);
    return NextResponse.json(
      { error: 'Failed to delete saida', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
