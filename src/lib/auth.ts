import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById, User } from './db';

export const SESSION_COOKIE_NAME = 'tournament_session_user';
export const SESSION_ID_COOKIE_NAME = 'tournament_session_id';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value;
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user) return null;

  // If another device took over the session, reject cookie access
  if (user.activeSessionId && sessionId && user.activeSessionId !== sessionId) {
    return null;
  }

  return user;
}

export function attachSessionCookie(response: NextResponse, userId: string, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  response.cookies.set(SESSION_ID_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export function clearSessionCookieOnResponse(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(SESSION_ID_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
