'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clientDb } from '@/lib/client-db';
import { showAlert } from '@/lib/sweetalert';

/**
 * Hook to enforce single-device active session:
 * Sends heartbeat every 15s. If session was taken over by another device,
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

        if (res.status === 401 || res.status === 403) {
          handleSessionTakenOver();
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (data.valid === false && data.reason === 'SESSION_TAKEN_OVER') {
          handleSessionTakenOver();
        }
      } catch (err) {
        // Network temporary failure, ignore
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

      router.push('/login');
    };

    // Initial check
    checkSession();

    // Periodic heartbeat every 15 seconds
    const interval = setInterval(checkSession, 15000);

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
      router.push('/login');
    }
  };

  return { handleLogout };
}
