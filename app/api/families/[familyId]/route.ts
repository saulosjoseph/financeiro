import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { client } from '@/src/db';
import { checkFamilyAdmin } from '@/lib/api-helpers';

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
    const { name } = body;

    // Verificar se o usuário é admin da família
    const isAdmin = await checkFamilyAdmin(familyId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can update family settings' }, { status: 403 });
    }

    // Atualizar família
    const updatedFamily = await client`
      UPDATE families
      SET name = COALESCE(${name}, name),
          updated_at = NOW()
      WHERE id = ${familyId}
      RETURNING *
    `;

    if (updatedFamily.length === 0) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Buscar membros e contagens
    const members = await client`
      SELECT 
        fm.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'image', u.image
        ) as user
      FROM family_members fm
      JOIN users u ON u.id = fm.user_id
      WHERE fm.family_id = ${familyId}
    `;

    const [entradasCount, saidasCount] = await Promise.all([
      client`SELECT COUNT(*)::int as count FROM entradas WHERE family_id = ${familyId}`,
      client`SELECT COUNT(*)::int as count FROM saidas WHERE family_id = ${familyId}`
    ]);

    return NextResponse.json({
      ...updatedFamily[0],
      members,
      _count: {
        entradas: entradasCount[0].count,
        saidas: saidasCount[0].count
      }
    });
  } catch (error) {
    console.error('Error updating family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
