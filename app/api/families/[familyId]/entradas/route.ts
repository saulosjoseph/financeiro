import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET - Listar entradas de uma família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('GET /api/families/[familyId]/entradas - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('GET entradas - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('GET entradas - familyId:', familyId, 'userId:', session.user.id);

    // Verificar se o usuário é membro da família
    const member = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: session.user.id,
        },
      },
    });

    console.log('GET entradas - member found:', !!member);

    if (!member) {
      console.log('GET entradas - Forbidden: User is not a member');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entradas = await prisma.entrada.findMany({
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

    console.log('GET entradas - Found', entradas.length, 'entradas');
    return NextResponse.json(entradas);
  } catch (error) {
    console.error('Error fetching entradas:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch entradas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Adicionar entrada
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    console.log('POST /api/families/[familyId]/entradas - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('POST entrada - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    console.log('POST entrada - familyId:', familyId, 'userId:', session.user.id);

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

    const entrada = await prisma.entrada.create({
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

    return NextResponse.json(entrada, { status: 201 });
  } catch (error) {
    console.error('Error creating entrada:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create entrada', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar entrada
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
      return NextResponse.json({ error: 'Entrada ID is required' }, { status: 400 });
    }

    // Verificar se a entrada pertence à família
    const existingEntrada = await prisma.entrada.findUnique({
      where: { id },
    });

    if (!existingEntrada || existingEntrada.familyId !== familyId) {
      return NextResponse.json({ error: 'Entrada not found' }, { status: 404 });
    }

    // Remover tags antigas
    await prisma.entradaTag.deleteMany({
      where: { entradaId: id },
    });

    // Atualizar entrada
    const entrada = await prisma.entrada.update({
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

    return NextResponse.json(entrada);
  } catch (error) {
    console.error('Error updating entrada:', error);
    return NextResponse.json(
      { error: 'Failed to update entrada', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir entrada
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
      return NextResponse.json({ error: 'Entrada ID is required' }, { status: 400 });
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

    // Verificar se a entrada pertence à família
    const existingEntrada = await prisma.entrada.findUnique({
      where: { id },
    });

    if (!existingEntrada || existingEntrada.familyId !== familyId) {
      return NextResponse.json({ error: 'Entrada not found' }, { status: 404 });
    }

    // Excluir tags associadas
    await prisma.entradaTag.deleteMany({
      where: { entradaId: id },
    });

    // Excluir entrada
    await prisma.entrada.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Entrada deleted successfully' });
  } catch (error) {
    console.error('Error deleting entrada:', error);
    return NextResponse.json(
      { error: 'Failed to delete entrada', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
