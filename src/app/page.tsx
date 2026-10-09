'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { clientDb } from '@/lib/client-db';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0c0806] flex items-center justify-center text-amber-400 font-bold">
      Mengarahkan ke Dashboard...
    </div>
  );
}
