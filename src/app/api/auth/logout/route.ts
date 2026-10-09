import { NextResponse } from 'next/server';
import { clearSessionCookieOnResponse, SESSION_COOKIE_NAME, SESSION_ID_COOKIE_NAME } from '@/lib/auth';
import { clearUserActiveSession } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cookieStore = cookies();
    const uid = body.userId || cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sid = body.sessionId || cookieStore.get(SESSION_ID_COOKIE_NAME)?.value;

    if (uid) {
      await clearUserActiveSession(uid, sid);
    }

    const response = NextResponse.json({ success: true });
    clearSessionCookieOnResponse(response);
    return response;
  } catch (err) {
    const response = NextResponse.json({ success: true });
    clearSessionCookieOnResponse(response);
    return response;
  }
}
