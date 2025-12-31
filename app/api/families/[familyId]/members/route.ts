import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { auth } from '@/auth';
import { checkFamilyAdmin, generateId } from '@/lib/api-helpers';

// POST - Adicionar membro à família
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email
    const user = await client`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verificar se já é membro
    const existingMember = await client`
      SELECT * FROM family_members 
      WHERE family_id = ${familyId} AND user_id = ${user[0].id}
      LIMIT 1
    `;

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 400 }
      );
    }

    const memberId = generateId();
    const member = await client`
      INSERT INTO family_members (id, family_id, user_id, role, created_at)
      VALUES (${memberId}, ${familyId}, ${user[0].id}, 'member', NOW())
      RETURNING *
    `;

    return NextResponse.json({
      ...member[0],
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        image: user[0].image
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding family member:', error);
    return NextResponse.json(
      { error: 'Failed to add family member' },
      { status: 500 }
    );
  }
}
