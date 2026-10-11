'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  ArrowLeft,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  RotateCcw,
  Coffee,
  Tv,
  Users,
  Award,
  Flame,
  CheckCircle2,
  Calendar,
  MapPin,
} from 'lucide-react';
import { clientDb, Tournament, Participant } from '@/lib/client-db';
import { sounds } from '@/lib/audio';
import { useSessionGuard } from '@/hooks/useSessionGuard';

export default function TournamentResultsPage() {
  const router = useRouter();
  useSessionGuard();
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const confettiIntervalRef = useRef<any>(null);

  // Fetch tournament and resolve winners
  useEffect(() => {
    const t = clientDb.getTournamentById(tournamentId);
    if (!t) {
      router.push('/dashboard');
      return;
    }
    setTournament(t);
    setLoading(false);

    // Initial fanfare and confetti celebration
    try {
      sounds.playGrandFanfare();
    } catch {}

    launchContinuousCelebration();

    return () => {
      if (confettiIntervalRef.current) {
        clearInterval(confettiIntervalRef.current);
      }
    };
  }, [tournamentId]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Launch confetti fireworks
  const launchContinuousCelebration = () => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
    }

    const duration = 8 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 70, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    confettiIntervalRef.current = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(confettiIntervalRef.current);
        return;
      }
      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.35), y: Math.random() - 0.2 },
        colors: ['#ffd700', '#ffae19', '#ffffff', '#e5cbb5', '#ef4444'],
      });

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.65, 0.9), y: Math.random() - 0.2 },
        colors: ['#ffd700', '#ffae19', '#ffffff', '#e5cbb5', '#3b82f6'],
      });
    }, 320);
  };

  const handleReplayCelebration = () => {
    if (!isAudioMuted) {
      try {
        sounds.playGrandFanfare();
      } catch {}
    }
    launchContinuousCelebration();
  };

  // Helper to resolve photo fallback
  const resolvePhoto = (p?: Participant | null) => {
    if (!p) return undefined;
    if (p.photo && p.photo.trim()) return p.photo;
    if (tournament && p.id) {
      const found = tournament.participants?.find((item) => item.id === p.id);
      if (found?.photo) return found.photo;
    }
    return undefined;
  };

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gold-400 font-bold">
        Memuat Hasil Turnamen...
      </div>
    );
  }

  // Derive Winners from tournament.winners or matches (Grand Final & Juara 3)
  const winners = tournament.winners || {};
  let firstPlace = winners.first;
  let secondPlace = winners.second;
  let thirdPlace = winners.third;

  // Fallback to inspect matches if winners object not fully populated
  if (!firstPlace || !secondPlace || !thirdPlace) {
    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    if (finalRound) {
      // Grand final match is usually matchIds[0]
      const gfMatch = tournament.matches[finalRound.matchIds[0]];
      if (gfMatch && gfMatch.status === 'completed' && gfMatch.winnerId) {
        const isWinnerA = gfMatch.winnerId === gfMatch.participantA?.participantId;
        const gfWinSlot = isWinnerA ? gfMatch.participantA : gfMatch.participantB;
        const gfLoseSlot = isWinnerA ? gfMatch.participantB : gfMatch.participantA;

        if (!firstPlace && gfWinSlot && gfWinSlot.participantId) {
          firstPlace = {
            id: gfWinSlot.participantId,
            name: gfWinSlot.name || 'Juara 1',
            affiliation: gfWinSlot.affiliation,
            photo: gfWinSlot.photo,
          };
        }
        if (!secondPlace && gfLoseSlot && gfLoseSlot.participantId) {
          secondPlace = {
            id: gfLoseSlot.participantId,
            name: gfLoseSlot.name || 'Juara 2',
            affiliation: gfLoseSlot.affiliation,
            photo: gfLoseSlot.photo,
          };
        }
      }

      // Third place match is matchIds[1] if exists
      if (finalRound.matchIds.length > 1) {
        const tpMatch = tournament.matches[finalRound.matchIds[1]];
        if (tpMatch && tpMatch.status === 'completed' && tpMatch.winnerId) {
          const tpWinnerSlot =
            tpMatch.winnerId === tpMatch.participantA?.participantId
              ? tpMatch.participantA
              : tpMatch.participantB;
          if (!thirdPlace && tpWinnerSlot && tpWinnerSlot.participantId) {
            thirdPlace = {
              id: tpWinnerSlot.participantId,
              name: tpWinnerSlot.name || 'Juara 3',
              affiliation: tpWinnerSlot.affiliation,
              photo: tpWinnerSlot.photo,
            };
          }
        }
      }
    }
  }

  const firstPhoto = resolvePhoto(firstPlace);
  const secondPhoto = resolvePhoto(secondPlace);
  const thirdPhoto = resolvePhoto(thirdPlace);

  return (
    <div className="relative min-h-screen w-full bg-[#0a0604] text-white flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Background Lighting & Stage Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-radial from-amber-500/25 via-gold-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Mesh Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* =========================================================================
          TOP NAVIGATION & STAGE HEADER
      ========================================================================= */}
      <header className="relative z-20 shrink-0 px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-gold-500/20 bg-[#120a06]/85 backdrop-blur-md">
        {/* Left: Back & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href={`/tournament/${tournamentId}/tv`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-coffee-900/80 hover:bg-coffee-800 border border-gold-500/30 text-gold-300 text-xs font-bold transition shadow active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
            <span>Kembali ke Bagan TV</span>
          </Link>

          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-coffee-300 text-xs font-semibold transition"
          >
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Center: Brand Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            <Trophy className="w-4 h-4 text-coffee-950 font-black" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
              {tournament.title}
            </div>
            <div className="text-[10px] text-gold-400 font-bold uppercase tracking-widest">
              OFFICIAL CEREMONY & WINNERS PODIUM
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Re-trigger Celebration */}
          <button
            onClick={handleReplayCelebration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/50 text-gold-300 text-xs font-bold transition shadow active:scale-95"
            title="Rayakan Ulang (Fanfare & Confetti)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Rayakan Lagi</span>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-coffee-300 hover:text-white transition"
            title={isAudioMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-gold-400" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-coffee-300 hover:text-white transition"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh TV'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN STAGE: PODIUM & PIALA WITH PHOTOS
      ========================================================================= */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 py-4 md:py-6 flex flex-col justify-between items-center overflow-hidden">
        {/* Stage Headline */}
        <div className="text-center shrink-0 mb-2 md:mb-4">
          <div className="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-gold-500/15 border border-gold-400/40 shadow-[0_0_20px_rgba(234,179,8,0.3)] mb-2">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span className="text-xs md:text-sm font-black text-yellow-300 uppercase tracking-widest">
              DAFTAR JUARA & PODIUM PEMENANG
            </span>
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-gold-300 to-amber-500 uppercase tracking-tight drop-shadow-sm">
            {tournament.title}
          </h1>
          <p className="text-xs md:text-sm text-coffee-300 font-semibold tracking-wider mt-1 flex items-center justify-center gap-3">
            <span>📍 {tournament.location || 'Coffee Arena'}</span>
            <span>•</span>
            <span>📅 {tournament.date || 'Final Round'}</span>
          </p>
        </div>

        {/* =====================================================================
            3-TIER GLORIOUS PODIUM (2nd - 1st - 3rd)
        ===================================================================== */}
        <div className="w-full flex-1 min-h-0 flex items-end justify-center gap-3 md:gap-8 max-w-5xl px-2 my-auto">
          {/* ===================================================================
              JUARA 2 - SILVER (PODIUM KIRI)
          =================================================================== */}
          <div className="flex-1 flex flex-col items-center max-w-[280px] md:max-w-[320px] transition-transform duration-300 hover:scale-[1.02]">
            {/* Foto & Medali */}
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-400 shadow-[0_0_30px_rgba(203,213,225,0.4)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-slate-700">
                  {secondPhoto ? (
                    <img
                      src={secondPhoto}
                      alt={secondPlace?.name || 'Juara 2'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Medal className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mb-1" />
                      <span className="text-[10px] font-bold">2nd Place</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge Juara 2 */}
              <div className="absolute -bottom-2.5 bg-gradient-to-r from-slate-300 to-slate-100 text-slate-950 font-black text-xs md:text-sm px-3.5 py-1 rounded-full border-2 border-white shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-sm">🥈</span>
                <span>JUARA 2</span>
              </div>
            </div>

            {/* Nama & Kartu Peserta */}
            <div className="w-full text-center px-2 mb-2">
              <div className="text-base sm:text-lg md:text-xl font-black text-white truncate drop-shadow">
                {secondPlace?.name || 'Belum Ditentukan'}
              </div>
              <div className="text-xs text-slate-300 font-semibold truncate">
                {secondPlace?.affiliation || 'Runner Up'}
              </div>
            </div>

            {/* Balok Podium Perak */}
            <div className="w-full h-32 sm:h-40 md:h-48 rounded-t-3xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border-t-2 border-x-2 border-slate-400/60 p-4 flex flex-col justify-between items-center shadow-[0_15px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-600/50 border border-slate-400/40 flex items-center justify-center text-slate-200 font-black text-xl md:text-2xl shadow-inner">
                2
              </div>
              <div className="text-center z-10">
                <div className="text-[11px] md:text-xs font-bold text-slate-300 uppercase tracking-wider">
                  PIALA PERAK
                </div>
                <div className="text-xs md:text-sm font-black text-white">
                  RUNNER UP
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              JUARA 1 - GOLD (PODIUM TENGAH - TERTINGGI & PALING MEGAH)
          =================================================================== */}
          <div className="flex-1 flex flex-col items-center max-w-[320px] md:max-w-[380px] -translate-y-2 md:-translate-y-6 z-10 transition-transform duration-300 hover:scale-[1.03]">
            {/* Crown Animation */}
            <div className="animate-bounce mb-1">
              <Crown className="w-12 h-12 md:w-16 md:h-16 text-yellow-300 drop-shadow-[0_0_25px_rgba(253,224,71,0.9)]" />
            </div>

            {/* Foto & Piala Emas */}
            <div className="relative mb-3 flex flex-col items-center">
              {/* Golden Rotating Aura */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-200 blur-xl opacity-75 animate-pulse" />

              <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full p-1.5 bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-100 shadow-[0_0_50px_rgba(234,179,8,0.8)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-coffee-950 flex items-center justify-center border-4 border-yellow-300">
                  {firstPhoto ? (
                    <img
                      src={firstPhoto}
                      alt={firstPlace?.name || 'Sang Juara 1'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gold-300">
                      <Trophy className="w-14 h-14 md:w-20 md:h-20 text-yellow-400 mb-1" />
                      <span className="text-xs font-black">1st Champion</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge Juara 1 */}
              <div className="absolute -bottom-3.5 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-400 text-coffee-950 font-black text-xs sm:text-sm md:text-base px-5 py-1.5 rounded-full border-2 border-white shadow-[0_0_20px_rgba(234,179,8,0.6)] flex items-center gap-1.5 whitespace-nowrap z-20">
                <Trophy className="w-4 h-4" />
                <span>CHAMPION JUARA 1</span>
              </div>
            </div>

            {/* Nama & Kartu Peserta Juara 1 */}
            <div className="w-full text-center px-2 mb-2 pt-1">
              <div className="text-lg sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-gold-300 to-amber-400 truncate drop-shadow-md">
                {firstPlace?.name || 'Belum Ditentukan'}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-coffee-200 font-bold truncate">
                {firstPlace?.affiliation || 'The Grand Champion'}
              </div>
            </div>

            {/* Balok Podium Emas */}
            <div className="w-full h-44 sm:h-56 md:h-64 rounded-t-3xl bg-gradient-to-b from-amber-600 via-amber-800 to-coffee-950 border-t-4 border-x-2 border-gold-300 p-5 flex flex-col justify-between items-center shadow-[0_20px_45px_rgba(234,179,8,0.35)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/20 via-transparent to-transparent pointer-events-none" />
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-500 border-2 border-yellow-200 flex items-center justify-center text-coffee-950 font-black text-3xl md:text-4xl shadow-lg">
                1
              </div>

              <div className="text-center z-10 space-y-0.5">
                <div className="text-xs md:text-sm font-black text-yellow-300 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>PIALA UTAMA EMAS</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="text-sm md:text-base font-black text-white">
                  GRAND MASTER BREWER
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              JUARA 3 - BRONZE (PODIUM KANAN)
          =================================================================== */}
          <div className="flex-1 flex flex-col items-center max-w-[280px] md:max-w-[320px] transition-transform duration-300 hover:scale-[1.02]">
            {/* Foto & Medali */}
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-800 shadow-[0_0_30px_rgba(180,83,9,0.4)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-950 flex items-center justify-center border-2 border-amber-900">
                  {thirdPhoto ? (
                    <img
                      src={thirdPhoto}
                      alt={thirdPlace?.name || 'Juara 3'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-500">
                      <Medal className="w-10 h-10 md:w-12 md:h-12 text-amber-600 mb-1" />
                      <span className="text-[10px] font-bold">3rd Place</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge Juara 3 */}
              <div className="absolute -bottom-2.5 bg-gradient-to-r from-amber-700 to-amber-600 text-white font-black text-xs md:text-sm px-3.5 py-1 rounded-full border-2 border-white shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-sm">🥉</span>
                <span>JUARA 3</span>
              </div>
            </div>

            {/* Nama & Kartu Peserta */}
            <div className="w-full text-center px-2 mb-2">
              <div className="text-base sm:text-lg md:text-xl font-black text-white truncate drop-shadow">
                {thirdPlace?.name || 'Belum Ditentukan'}
              </div>
              <div className="text-xs text-amber-300 font-semibold truncate">
                {thirdPlace?.affiliation || '3rd Winner'}
              </div>
            </div>

            {/* Balok Podium Perunggu */}
            <div className="w-full h-28 sm:h-36 md:h-44 rounded-t-3xl bg-gradient-to-b from-stone-800 via-amber-950 to-stone-950 border-t-2 border-x-2 border-amber-700/60 p-4 flex flex-col justify-between items-center shadow-[0_15px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-amber-900/50 border border-amber-700/40 flex items-center justify-center text-amber-300 font-black text-xl md:text-2xl shadow-inner">
                3
              </div>
              <div className="text-center z-10">
                <div className="text-[11px] md:text-xs font-bold text-amber-400 uppercase tracking-wider">
                  PIALA PERUNGGU
                </div>
                <div className="text-xs md:text-sm font-black text-white">
                  3RD WINNER
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            FOOTER SUMMARY CARD & BADGES
        ===================================================================== */}
        <div className="w-full shrink-0 max-w-4xl bg-[#180e08]/90 border border-gold-500/30 rounded-2xl p-3 md:p-4 mt-2 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white">
                Turnamen Berhasil Diselesaikan
              </div>
              <div className="text-coffee-300 text-[11px]">
                Total {tournament.participants?.length || 0} Brewer & Barista Bertanding Secara Sportif
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/tournament/${tournamentId}/tv`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coffee-800 hover:bg-coffee-700 border border-coffee-700 text-coffee-200 font-bold transition shadow"
            >
              <Tv className="w-4 h-4 text-gold-400" />
              <span>Bagan Pertandingan</span>
            </Link>

            <button
              onClick={handleReplayCelebration}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black transition shadow active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pesta Kembang Api 🎉</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
