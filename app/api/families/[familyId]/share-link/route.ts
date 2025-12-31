import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { randomBytes } from 'crypto';
import { checkFamilyAdmin, generateId } from '@/lib/api-helpers';

// GET - Listar links ativos da família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;

    // Verificar se o usuário é admin da família
    const isAdmin = await checkFamilyAdmin(familyId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar links não utilizados e não expirados
    const shareLinks = await client`
      SELECT * FROM family_share_links
      WHERE family_id = ${familyId}
        AND used_at IS NULL
        AND expires_at >= NOW()
      ORDER BY created_at DESC
    `;

    return NextResponse.json(shareLinks);
  } catch (error) {
    console.error('Error fetching share links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}

// POST - Criar novo link compartilhável
export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await params;

    // Verificar se o usuário é admin da família
    const isAdmin = await checkFamilyAdmin(familyId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role = 'member', expiresInDays = 7 } = body;

    // Validar role
    if (role !== 'member' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "member" or "admin"' },
        { status: 400 }
      );
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex');

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const linkId = generateId();
    const shareLink = await client`
      INSERT INTO family_share_links (
        id, family_id, token, role, created_by, expires_at, created_at
      )
      VALUES (
        ${linkId}, ${familyId}, ${token}, ${role}, ${session.user.id}, ${expiresAt}, NOW()
      )
      RETURNING *
    `;

    const family = await client`
      SELECT id, name FROM families WHERE id = ${familyId} LIMIT 1
    `;

    return NextResponse.json(
      {
        ...shareLink[0],
        family: family[0],
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// DELETE - Invalidar link compartilhável
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
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    // Verificar se o usuário é admin da família
    const isAdmin = await checkFamilyAdmin(familyId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Deletar o link
    await client`
      DELETE FROM family_share_links
      WHERE id = ${linkId} AND family_id = ${familyId}
    `;

    return NextResponse.json({ message: 'Share link deleted' });
  } catch (error) {
    console.error('Error deleting share link:', error);
    return NextResponse.json(
      { error: 'Failed to delete share link' },
      { status: 500 }
    );
  }
}
