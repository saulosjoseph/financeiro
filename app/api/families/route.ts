import { NextResponse } from 'next/server';
import { client } from '@/src/db';
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

    // Query SQL raw para buscar famílias do usuário
    const families = await client`
      SELECT 
        f.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', fm.id,
              'familyId', fm.family_id,
              'userId', fm.user_id,
              'role', fm.role,
              'createdAt', fm.created_at,
              'user', json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'image', u.image
              )
            )
          )
          FROM family_members fm
          JOIN users u ON u.id = fm.user_id
          WHERE fm.family_id = f.id
        ) as members,
        (
          SELECT COUNT(*)::int
          FROM entradas
          WHERE family_id = f.id
        ) as entradas_count,
        (
          SELECT COUNT(*)::int
          FROM saidas
          WHERE family_id = f.id
        ) as saidas_count
      FROM families f
      WHERE EXISTS (
        SELECT 1 
        FROM family_members fm 
        WHERE fm.family_id = f.id 
        AND fm.user_id = ${session.user.id}
      )
    `;

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

    // Usar transaction para criar família e membro atomicamente
    const familyId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    
    await client.begin(async (tx) => {
      await tx`
        INSERT INTO families (id, name, created_at, updated_at)
        VALUES (${familyId}, ${name}, NOW(), NOW())
      `;
      
      await tx`
        INSERT INTO family_members (id, family_id, user_id, role, created_at)
        VALUES (${memberId}, ${familyId}, ${session.user.id}, 'admin', NOW())
      `;
    });

    // Buscar família criada com membros
    const family = await client`
      SELECT 
        f.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', fm.id,
              'familyId', fm.family_id,
              'userId', fm.user_id,
              'role', fm.role,
              'createdAt', fm.created_at,
              'user', json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'image', u.image
              )
            )
          )
          FROM family_members fm
          JOIN users u ON u.id = fm.user_id
          WHERE fm.family_id = f.id
        ) as members
      FROM families f
      WHERE f.id = ${familyId}
    `;

    return NextResponse.json(family[0], { status: 201 });
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
