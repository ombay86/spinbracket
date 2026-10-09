import { NextResponse } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password, name } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Semua kolom wajib diisi' }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 });
    }

    const existing = getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
    }

    const newUser = createUser(username, password, name);
    const response = NextResponse.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
      },
    });

    attachSessionCookie(response, newUser.id);
    return response;
  } catch (error: any) {
    console.error('Register error', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
