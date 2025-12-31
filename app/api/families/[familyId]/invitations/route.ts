import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { randomBytes } from 'crypto';
import { checkFamilyAdmin, generateId } from '@/lib/api-helpers';

// GET - Listar convites pendentes da família
export async function GET(
  request: Request,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId} = await params;

    // Verificar se o usuário é admin da família
    const isAdmin = await checkFamilyAdmin(familyId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar convites pendentes (não aceitos e não expirados)
    const invitations = await client`
      SELECT * FROM family_invitations
      WHERE family_id = ${familyId}
        AND accepted_at IS NULL
        AND expires_at >= NOW()
      ORDER BY created_at DESC
    `;

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// POST - Criar novo convite
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
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Verificar se o email já é membro
    const existingUser = await client`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existingUser.length > 0) {
      const existingMember = await client`
        SELECT * FROM family_members
        WHERE family_id = ${familyId} AND user_id = ${existingUser[0].id}
        LIMIT 1
      `;

      if (existingMember.length > 0) {
        return NextResponse.json(
          { error: 'User is already a member' },
          { status: 400 }
        );
      }
    }

    // Verificar se já existe um convite pendente
    const existingInvitation = await client`
      SELECT * FROM family_invitations
      WHERE family_id = ${familyId}
        AND email = ${email}
        AND accepted_at IS NULL
        AND expires_at >= NOW()
      LIMIT 1
    `;

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        { error: 'An invitation is already pending for this email' },
        { status: 400 }
      );
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex');

    // Criar convite com validade de 7 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitationId = generateId();
    const invitation = await client`
      INSERT INTO family_invitations (
        id, family_id, email, token, role, invited_by, expires_at, created_at
      )
      VALUES (
        ${invitationId}, ${familyId}, ${email}, ${token}, ${role}, 
        ${session.user.id}, ${expiresAt}, NOW()
      )
      RETURNING *
    `;

    // Buscar dados da família
    const family = await client`
      SELECT id, name FROM families WHERE id = ${familyId} LIMIT 1
    `;

    // TODO: Enviar email com o link de convite
    // const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
    // await sendInvitationEmail(email, family[0].name, inviteLink);

    return NextResponse.json(
      {
        ...invitation[0],
        family: family[0],
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar convite
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
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Verificar se o usuário é admin da família
    const isAdmin = await checkFamilyAdmin(familyId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Deletar o convite
    await client`
      DELETE FROM family_invitations
      WHERE id = ${invitationId} AND family_id = ${familyId}
    `;

    return NextResponse.json({ message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
