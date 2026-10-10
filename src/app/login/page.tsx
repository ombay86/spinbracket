'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Coffee, Lock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { clientDb } from '@/lib/client-db';
import { showAlert } from '@/lib/sweetalert';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const deviceId = clientDb.getDeviceId();
      const deviceName = clientDb.getDeviceName();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceId, deviceName }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // System rejected: account already in use on another device!
        setLoading(false);
        const activeDevice = data.activeDevice || 'Perangkat Lain';
        const lastActiveTime = data.lastActiveAt
          ? new Date(data.lastActiveAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : 'baru saja';

        const takeover = await showAlert.confirm({
          title: 'Akses Ditolak: Akun Sedang Digunakan!',
          html: `
            <div style="text-align: left; font-size: 13px; line-height: 1.6; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); padding: 14px 16px; border-radius: 14px; margin-bottom: 14px;">
              <p style="margin: 0 0 8px 0; color: #fca5a5; font-weight: 700;">
                Akun <strong>"${username}"</strong> saat ini sedang aktif digunakan di:
              </p>
              <div style="background: rgba(0,0,0,0.5); padding: 10px 14px; border-radius: 10px; color: #fef08a; font-weight: 800; border: 1px solid rgba(234,179,8,0.3);">
                💻 ${activeDevice} <span style="font-weight: 400; color: #c4a482; font-size: 11px;">(Aktif: ${lastActiveTime})</span>
              </div>
              <p style="margin: 12px 0 0 0; color: #fecaca; font-size: 12px;">
                ⚠️ <strong>Kebijakan Sistem:</strong> 1 akun hanya dapat terlogin di 1 perangkat secara bersamaan agar data pertandingan tetap sinkron dan tidak bentrok.
              </p>
            </div>
            <div style="font-size: 13px; color: #e5cbb5; text-align: center;">
              Apakah Anda ingin <strong>memutus paksa</strong> perangkat tersebut dan masuk di perangkat ini?
            </div>
          `,
          confirmText: '⚠️ Paksa Logout Perangkat Lain & Masuk',
          cancelText: 'Batalkan Login',
          isDanger: true,
          icon: 'warning',
        });

        if (takeover) {
          setLoading(true);
          const forceRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, deviceId, deviceName, forceTakeover: true }),
          });
          const forceData = await forceRes.json();
          if (!forceRes.ok) {
            throw new Error(forceData.error || 'Gagal mengambil alih sesi');
          }
          clientDb.setSessionId(forceData.sessionId);
          clientDb.setCurrentUser(forceData.user);
          showAlert.success('Berhasil Masuk!', 'Perangkat lama telah di-logout otomatis.', 2000);
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 800);
          return;
        } else {
          setError(`Login ditolak: Akun sedang aktif di ${activeDevice}. Silakan logout dari perangkat tersebut.`);
          return;
        }
      }

      if (!res.ok) {
        // Fallback to local client DB (essential when serverless DB is ephemeral/offline)
        const localAttempt = clientDb.login(username, password);
        if (localAttempt.user) {
          window.location.href = '/dashboard';
          return;
        }
        throw new Error(data.error || 'Username atau password salah');
      }

      // Login success
      if (data.sessionId) {
        clientDb.setSessionId(data.sessionId);
      }
      clientDb.setCurrentUser(data.user);
      window.location.href = '/dashboard';
    } catch (err: any) {
      // Offline / Serverless cold start fallback
      const localAttempt = clientDb.login(username, password);
      if (localAttempt.user) {
        window.location.href = '/dashboard';
        return;
      }
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-coffee-950 via-coffee-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-coffee-900/90 border border-gold-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/20 border border-gold-500/50 mb-4 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
            <Trophy className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-gold-300 to-amber-400 tracking-tight">
            TOURNAMENT THROWDOWN
          </h1>
          <p className="text-xs text-coffee-300 mt-1 uppercase tracking-widest font-semibold">
            Interactive Knockdown Arena • OMBAY
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl pl-11 pr-4 py-3 text-white placeholder-coffee-500 focus:outline-none focus:ring-1 focus:ring-gold-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl pl-11 pr-4 py-3 text-white placeholder-coffee-500 focus:outline-none focus:ring-1 focus:ring-gold-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-base shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Sedang Masuk...' : 'Masuk ke Aplikasi'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-coffee-800 text-center flex flex-col gap-2">
          <p className="text-xs text-coffee-400">
            Belum punya akun panitia?{' '}
            <Link href="/register" className="text-gold-400 hover:underline font-bold">
              Daftar Akun Baru
            </Link>
          </p>
          <div className="text-[11px] text-coffee-400 bg-coffee-950/60 p-2 rounded-lg border border-coffee-800/80">
            Akun Demo Bawaan: <b>admin</b> / <b>admin123</b>
          </div>
        </div>
      </div>
    </div>
  );
}
