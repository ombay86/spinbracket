import { NextResponse } from 'next/server';
import { createUser, getUserByUsername, validateAndRegisterSession } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password, name, deviceId, deviceName } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Semua kolom wajib diisi' }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
    }

    const newUser = await createUser(username, password, name);

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    const sessionRes = await validateAndRegisterSession(
      newUser.id,
      deviceId || `dev_${Date.now()}`,
      deviceName || 'Perangkat Browser',
      ip,
      true
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
      },
      sessionId: sessionRes.sessionId,
    });

    attachSessionCookie(response, newUser.id, sessionRes.sessionId!);
    return response;
  } catch (error: any) {
    console.error('Register error', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
