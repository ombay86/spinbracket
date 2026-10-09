'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Coffee, Lock, User, ArrowRight } from 'lucide-react';
import { clientDb } from '@/lib/client-db';

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
      const result = clientDb.login(username, password);
      if (result.error) {
        throw new Error(result.error);
      }
      router.push('/dashboard');
    } catch (err: any) {
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
            SPINBRACKET
          </h1>
          <p className="text-xs text-coffee-300 mt-1 uppercase tracking-widest font-semibold">
            Sistem Bagan Knockdown & TV Display Interaktif
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
