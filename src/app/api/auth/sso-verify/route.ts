import { NextResponse } from 'next/server';
import { createUser, getUserByUsername, validateAndRegisterSession, User } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, deviceId, deviceName } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token SSO wajib disertakan' }, { status: 400 });
    }

    // Resolve Jurnal Ombay host
    const jurnalHost =
      process.env.NEXT_PUBLIC_JURNALOMBAY_HOST ||
      (process.env.NODE_ENV === 'production' ? 'https://jurnalombay.my.id' : 'http://localhost:4000');

    // Verify token with Jurnal Ombay SSO endpoint
    const verifyRes = await fetch(`${jurnalHost}/sso/verify?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error || 'Token SSO tidak valid atau sudah kadaluarsa' },
        { status: 401 }
      );
    }

    const verifyData = await verifyRes.json();
    if (!verifyData.valid || !verifyData.user) {
      return NextResponse.json({ error: 'Verifikasi SSO gagal' }, { status: 401 });
    }

    const ssoUser = verifyData.user;
    const username = ssoUser.username || ssoUser.email.split('@')[0];
    const name = ssoUser.fullName || ssoUser.name || username;

    // Check if user exists locally or create sync
    let localUser = await getUserByUsername(username);
    if (!localUser) {
      try {
        localUser = await createUser(username, 'sso_authenticated', name);
      } catch (err) {
        localUser = await getUserByUsername(username);
      }
    }

    if (!localUser) {
      localUser = {
        id: ssoUser.id || `usr_sso_${Date.now()}`,
        username,
        name,
        passwordHash: 'sso_authenticated',
        createdAt: new Date().toISOString(),
      };
    }

    // Register active session
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    let sessionRes: any;
    try {
      sessionRes = await validateAndRegisterSession(
        localUser.id,
        deviceId || `dev_sso_${Date.now()}`,
        deviceName || 'Browser SSO',
        ip,
        true // SSO takeover
      );
    } catch {
      sessionRes = {
        allowed: true,
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };
    }

    const sessionId = sessionRes.sessionId || `sess_${Date.now()}`;
    const response = NextResponse.json({
      success: true,
      user: {
        id: localUser.id,
        username: localUser.username,
        name: localUser.name,
      },
      sessionId,
      token,
    });

    attachSessionCookie(response, localUser.id, sessionId);
    return response;
  } catch (err: any) {
    console.error('SSO verify error:', err);
    return NextResponse.json({ error: err.message || 'Gagal memproses SSO' }, { status: 500 });
  }
}
