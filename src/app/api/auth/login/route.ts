import { NextResponse } from 'next/server';
import { getUserByUsername, validateAndRegisterSession } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, deviceId, deviceName, forceTakeover } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    let user = await getUserByUsername(username);
    let isAuthenticated = !!(user && user.passwordHash === password);

    // Primary & Fallback: check Jurnal Ombay SSO login endpoints (both production & local)
    if (!isAuthenticated) {
      const hosts = [
        process.env.NEXT_PUBLIC_JURNALOMBAY_HOST,
        'https://jurnalombay.my.id',
        'http://localhost:4000',
      ].filter(Boolean) as string[];

      for (const host of hosts) {
        try {
          const ssoLoginRes = await fetch(`${host}/sso/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: username, password }),
          });

          if (ssoLoginRes.ok) {
            const ssoData = await ssoLoginRes.json();
            if (ssoData.success && ssoData.user) {
              if (!user) {
                try {
                  const { createUser } = await import('@/lib/db');
                  user = await createUser(username, password, ssoData.user.fullName || username);
                } catch {
                  user = await getUserByUsername(username);
                }
              } else {
                // Update local passwordHash to match SSO password
                user.passwordHash = password;
              }
              isAuthenticated = true;
              break;
            }
          }
        } catch (e) {
          // try next host
        }
      }
    }

    if (!user || !isAuthenticated) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // Determine client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    let sessionRes: any;
    try {
      sessionRes = await validateAndRegisterSession(
        user.id,
        deviceId || `dev_${Date.now()}`,
        deviceName || 'Perangkat Browser',
        ip,
        !!forceTakeover
      );
    } catch (sessionErr) {
      console.warn('Session registration warning (fallback active):', sessionErr);
      sessionRes = {
        allowed: true,
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user,
      };
    }

    if (!sessionRes.allowed) {
      return NextResponse.json(
        {
          error: 'Akun ini sedang aktif digunakan di perangkat lain.',
          code: 'ACCOUNT_ALREADY_LOGGED_IN',
          activeDevice: sessionRes.activeDevice,
          lastActiveAt: sessionRes.lastActiveAt,
        },
        { status: 409 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
      sessionId: sessionRes.sessionId,
      deviceId: sessionRes.user?.activeDeviceId,
      deviceName: sessionRes.user?.activeDeviceName,
    });

    attachSessionCookie(response, user.id, sessionRes.sessionId!);
    return response;
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
