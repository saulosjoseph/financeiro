import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { generateId } from '@/lib/api-helpers';

// GET - Obter informações do link compartilhado
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const shareLink = await client`
      SELECT 
        sl.*,
        f.name as family_name
      FROM family_share_links sl
      JOIN families f ON f.id = sl.family_id
      WHERE sl.token = ${token}
      LIMIT 1
    `;

    if (shareLink.length === 0) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    const link = shareLink[0];

    // Verificar se o link já foi usado
    if (link.used_at) {
      return NextResponse.json(
        { error: 'This link has already been used' },
        { status: 400 }
      );
    }

    // Verificar se o link expirou
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 400 }
      );
    }

    // Retornar informações do link (sem informações sensíveis)
    return NextResponse.json({
      familyName: link.family_name,
      role: link.role,
      expiresAt: link.expires_at,
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
    const shareLink = await client`
      SELECT 
        sl.*,
        json_build_object('id', f.id, 'name', f.name) as family
      FROM family_share_links sl
      JOIN families f ON f.id = sl.family_id
      WHERE sl.token = ${token}
      LIMIT 1
    `;

    if (shareLink.length === 0) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    const link = shareLink[0];

    // Verificar se o link já foi usado
    if (link.used_at) {
      return NextResponse.json(
        { error: 'This link has already been used' },
        { status: 400 }
      );
    }

    // Verificar se o link expirou
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já é membro
    const existingMember = await client`
      SELECT * FROM family_members
      WHERE family_id = ${link.family_id} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: 'You are already a member of this family' },
        { status: 400 }
      );
    }

    // Criar membro e marcar link como usado em transação
    const memberId = generateId();
    await client.begin(async (tx) => {
      await tx`
        INSERT INTO family_members (id, family_id, user_id, role, created_at)
        VALUES (${memberId}, ${link.family_id}, ${session.user.id}, ${link.role}, NOW())
      `;
      
      await tx`
        UPDATE family_share_links
        SET used_by = ${session.user.id}, used_at = NOW()
        WHERE id = ${link.id}
      `;
    });

    // Buscar membro criado com detalhes
    const member = await client`
      SELECT 
        fm.*,
        json_build_object('id', f.id, 'name', f.name) as family,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'image', u.image) as user
      FROM family_members fm
      JOIN families f ON f.id = fm.family_id
      JOIN users u ON u.id = fm.user_id
      WHERE fm.id = ${memberId}
      LIMIT 1
    `;

    return NextResponse.json({
      message: 'Successfully joined the family',
      member: member[0],
    });
  } catch (error) {
    console.error('Error joining family via share link:', error);
    return NextResponse.json(
      { error: 'Failed to join family' },
      { status: 500 }
    );
  }
}
