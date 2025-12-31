import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { generateId } from '@/lib/api-helpers';

// POST - Aceitar convite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    // Buscar convite pelo token
    const invitation = await client`
      SELECT 
        fi.*,
        json_build_object('id', f.id, 'name', f.name) as family
      FROM family_invitations fi
      JOIN families f ON f.id = fi.family_id
      WHERE fi.token = ${token}
      LIMIT 1
    `;

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const inv = invitation[0];

    // Verificar se o convite já foi aceito
    if (inv.accepted_at) {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      );
    }

    // Verificar se o convite expirou
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation expired' },
        { status: 400 }
      );
    }

    // Verificar se o email do usuário logado corresponde ao email do convite
    if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Verificar se o usuário já é membro
    const existingMember = await client`
      SELECT * FROM family_members
      WHERE family_id = ${inv.family_id} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: 'You are already a member of this family' },
        { status: 400 }
      );
    }

    // Criar membro e marcar convite como aceito em transação
    const memberId = generateId();
    await client.begin(async (tx) => {
      await tx`
        INSERT INTO family_members (id, family_id, user_id, role, created_at)
        VALUES (${memberId}, ${inv.family_id}, ${session.user.id}, ${inv.role}, NOW())
      `;
      
      await tx`
        UPDATE family_invitations
        SET accepted_at = NOW()
        WHERE id = ${inv.id}
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
      message: 'Invitation accepted successfully',
      member: member[0],
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

// GET - Obter informações do convite
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await client`
      SELECT 
        fi.*,
        f.name as family_name
      FROM family_invitations fi
      JOIN families f ON f.id = fi.family_id
      WHERE fi.token = ${token}
      LIMIT 1
    `;

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const inv = invitation[0];

    // Verificar se o convite já foi aceito
    if (inv.accepted_at) {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      );
    }

    // Verificar se o convite expirou
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation expired' },
        { status: 400 }
      );
    }

    // Retornar informações do convite (sem informações sensíveis)
    return NextResponse.json({
      familyName: inv.family_name,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expires_at,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}
