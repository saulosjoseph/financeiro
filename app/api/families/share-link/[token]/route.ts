import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET - Obter informações do link compartilhado
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const shareLink = await prisma.familyShareLink.findUnique({
      where: { token },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Verificar se o link já foi usado
    if (shareLink.usedAt) {
      return NextResponse.json(
        { error: 'This link has already been used' },
        { status: 400 }
      );
    }

    // Verificar se o link expirou
    if (shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 400 }
      );
    }

    // Retornar informações do link (sem informações sensíveis)
    return NextResponse.json({
      familyName: shareLink.family.name,
      role: shareLink.role,
      expiresAt: shareLink.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching share link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share link' },
      { status: 500 }
    );
  }
}

// POST - Entrar na família através do link compartilhado
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // Buscar link pelo token
    const shareLink = await prisma.familyShareLink.findUnique({
      where: { token },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Verificar se o link já foi usado
    if (shareLink.usedAt) {
      return NextResponse.json(
        { error: 'This link has already been used' },
        { status: 400 }
      );
    }

    // Verificar se o link expirou
    if (shareLink.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já é membro
    const existingMember = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: shareLink.familyId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this family' },
        { status: 400 }
      );
    }

    // Criar membro e marcar link como usado em uma transação
    const [member, updatedLink] = await prisma.$transaction([
      prisma.familyMember.create({
        data: {
          familyId: shareLink.familyId,
          userId: session.user.id,
          role: shareLink.role,
        },
        include: {
          family: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.familyShareLink.update({
        where: { id: shareLink.id },
        data: {
          usedBy: session.user.id,
          usedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Successfully joined the family',
      member,
    });
  } catch (error) {
    console.error('Error joining family via share link:', error);
    return NextResponse.json(
      { error: 'Failed to join family' },
      { status: 500 }
    );
  }
}
