import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById, User } from './db';

export const SESSION_COOKIE_NAME = 'tournament_session_user';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!userId) return null;
  const user = getUserById(userId);
  return user || null;
}

export function attachSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

export function clearSessionCookieOnResponse(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
