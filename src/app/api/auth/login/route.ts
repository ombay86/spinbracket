import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user || user.passwordHash !== password) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });

    attachSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
