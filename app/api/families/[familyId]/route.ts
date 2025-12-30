import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;
    const body = await request.json();
    const { initialBalance } = body;

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
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    // Verificar se o usuário é admin
    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update family settings' }, { status: 403 });
    }

    // Validar initialBalance
    if (initialBalance !== undefined) {
      const balance = parseFloat(initialBalance);
      if (isNaN(balance)) {
        return NextResponse.json({ error: 'Invalid initial balance value' }, { status: 400 });
      }
      if (balance < -999999999.99 || balance > 999999999.99) {
        return NextResponse.json({ error: 'Initial balance out of valid range' }, { status: 400 });
      }
    }

    // Atualizar família
    const updatedFamily = await prisma.family.update({
      where: { id: familyId },
      data: {
        initialBalance: initialBalance !== undefined ? parseFloat(initialBalance) : undefined,
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

    return NextResponse.json(updatedFamily);
  } catch (error) {
    console.error('Error updating family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
