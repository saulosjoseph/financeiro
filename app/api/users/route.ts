import { NextResponse } from 'next/server';
import { client } from '@/src/db';
import { generateId } from '@/lib/api-helpers';

export async function GET() {
  try {
    const users = await client`
      SELECT * FROM users
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const user = await client`
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES (${id}, ${email}, ${name}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json(user[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
