import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { client } from '@/src/db';
import { checkFamilyMembership, generateId } from '@/lib/api-helpers';

// GET - Listar tags de uma família
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

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tags = await client`
      SELECT * FROM tags
      WHERE family_id = ${familyId}
      ORDER BY name ASC
    `;

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST - Criar tag
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

    // Verificar se o usuário é membro da família
    const member = await checkFamilyMembership(familyId, session.user.id);

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const id = generateId();
    
    try {
      const tag = await client`
        INSERT INTO tags (id, name, color, family_id, created_at)
        VALUES (${id}, ${name.trim()}, ${color || '#6B7280'}, ${familyId}, NOW())
        RETURNING *
      `;
      
      return NextResponse.json(tag[0], { status: 201 });
    } catch (dbError: any) {
      // Verificar erro de duplicação (unique constraint violation)
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
