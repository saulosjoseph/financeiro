import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET - Listar famílias do usuário
export async function GET() {
  try {
    const session = await auth();
    console.log('GET /api/families - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('GET /api/families - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const families = await prisma.family.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            entradas: true,
            saidas: true,
          },
        },
      },
    });

    return NextResponse.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch families', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Criar nova família
export async function POST(request: Request) {
  try {
    const session = await auth();
    console.log('POST /api/families - Session:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.id) {
      console.log('POST /api/families - Unauthorized: No user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Family name is required' },
        { status: 400 }
      );
    }

    console.log('POST /api/families - Creating family:', name, 'for user:', session.user.id);

    const family = await prisma.family.create({
      data: {
        name,
        members: {
          create: {
            userId: session.user.id,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    console.error('Error creating family:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create family', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
