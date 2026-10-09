import { NextResponse } from 'next/server';
import { heartbeatUserSession } from '@/lib/db';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SESSION_ID_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cookieStore = cookies();
    const userId = body.userId || cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessionId = body.sessionId || cookieStore.get(SESSION_ID_COOKIE_NAME)?.value;

    if (!userId || !sessionId) {
      return NextResponse.json({ valid: false, reason: 'NO_SESSION' }, { status: 401 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : undefined;

    const res = await heartbeatUserSession(userId, sessionId, ip);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
