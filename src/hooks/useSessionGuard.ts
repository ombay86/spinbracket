'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clientDb } from '@/lib/client-db';
import { showAlert } from '@/lib/sweetalert';

/**
 * Hook to enforce single-device active session:
 * Sends heartbeat every 20s. If session was taken over by another device,
 * alerts user and logs out immediately.
 */
export function useSessionGuard() {
  const router = useRouter();
  const alertShownRef = useRef(false);

  useEffect(() => {
    const user = clientDb.getCurrentUser();
    const sessionId = clientDb.getSessionId();

    if (!user) {
      router.push('/login');
      return;
    }

    // Function to check session validity with server
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            sessionId: sessionId || 'default',
          }),
        });

        // ONLY kick out if server explicitly reports SESSION_TAKEN_OVER
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.valid === false && data.reason === 'SESSION_TAKEN_OVER') {
            handleSessionTakenOver();
          }
        }
      } catch (err) {
        // Network temporary failure or offline, ignore to keep app functional
      }
    };

    const handleSessionTakenOver = async () => {
      if (alertShownRef.current) return;
      alertShownRef.current = true;

      await clientDb.logout();

      await showAlert.warning(
        'Sesi Telah Berakhir',
        'Akun Anda baru saja digunakan untuk login di perangkat lain. Sistem hanya mengizinkan 1 perangkat aktif.'
      );

      window.location.href = '/login';
    };

    // Periodic heartbeat every 20 seconds (don't execute instantly to allow render)
    const interval = setInterval(checkSession, 20000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    const confirmed = await showAlert.confirm({
      title: 'Keluar dari Akun?',
      text: 'Anda akan logout sehingga perangkat lain dapat menggunakan akun ini.',
      confirmText: 'Ya, Logout',
      cancelText: 'Batal',
    });

    if (confirmed) {
      await clientDb.logout();
      window.location.href = '/login';
    }
  };

  return { handleLogout };
}
