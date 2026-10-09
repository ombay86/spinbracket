'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '@/lib/audio';
import { Crown, Trophy, Sparkles, X, RotateCcw } from 'lucide-react';
import { Participant } from '@/lib/db';

interface GrandChampionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentTitle: string;
  firstPlace?: Participant | null;
  secondPlace?: Participant | null;
  thirdPlace?: Participant | null;
}

export const GrandChampionModal: React.FC<GrandChampionModalProps> = ({
  isOpen,
  onClose,
  tournamentTitle,
  firstPlace,
  secondPlace,
  thirdPlace,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Play Grand Victory Fanfare
    sounds.playGrandFanfare();

    // Continuous fireworks confetti cannon for 7 seconds
    const duration = 7 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 70, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 60 * (timeLeft / duration);

      // Left blast
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ffd700', '#ffae19', '#ffffff', '#e5cbb5', '#ff4d4d'],
      });

      // Right blast
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ffd700', '#ffae19', '#ffffff', '#e5cbb5', '#22c55e'],
      });
    }, 280);

    return () => clearInterval(interval);
  }, [isOpen]);

  const triggerAgain = () => {
    sounds.playGrandFanfare();
    confetti({
      particleCount: 200,
      spread: 160,
      origin: { y: 0.6 },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-gold-500/20 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Floating Sparkle Icons in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Sparkles className="absolute top-12 left-16 w-12 h-12 text-gold-400/40 animate-pulse" />
        <Sparkles className="absolute top-24 right-24 w-16 h-16 text-yellow-300/40 animate-pulse delay-300" />
        <Crown className="absolute bottom-16 left-32 w-14 h-14 text-gold-500/30 animate-crown" />
      </div>

      <div className="relative max-w-6xl w-full mx-6 flex flex-col items-center justify-center py-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-4 p-3 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition z-10"
        >
          <X className="w-7 h-7" />
        </button>

        {/* Title Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-gold-500/20 border-2 border-gold-400/60 shadow-[0_0_30px_rgba(234,179,8,0.5)] mb-3">
            <Trophy className="w-6 h-6 text-gold-400 animate-bounce" />
            <span className="text-gold-300 font-extrabold tracking-widest uppercase text-base md:text-lg">
              GRAND FINAL THROWDOWN CHAMPIONS
            </span>
            <Trophy className="w-6 h-6 text-gold-400 animate-bounce" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-gold-300 to-amber-500 uppercase tracking-tight">
            {tournamentTitle}
          </h1>
        </div>

        {/* 3-Tier Podium Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end w-full max-w-5xl mb-10 px-4">
          {/* JUARA 2 (Silver) */}
          <div className="order-2 md:order-1 flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-28 h-28 rounded-full border-4 border-slate-300 overflow-hidden bg-slate-900 shadow-[0_0_25px_rgba(203,213,225,0.4)] flex items-center justify-center">
                {secondPlace?.photo ? (
                  <img src={secondPlace.photo} alt={secondPlace.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🥈</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-1 bg-slate-300 text-slate-950 font-black text-sm px-2.5 py-0.5 rounded-full border border-white shadow">
                2nd
              </div>
            </div>
            <div className="w-full bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-600 rounded-2xl p-5 text-center shadow-xl">
              <div className="text-slate-300 font-bold text-sm uppercase tracking-wider mb-1">JUARA 2</div>
              <div className="text-xl font-bold text-white mb-1 truncate">{secondPlace?.name || 'TBA'}</div>
              <div className="text-xs text-slate-400 truncate">{secondPlace?.affiliation || '-'}</div>
            </div>
          </div>

          {/* JUARA 1 (Gold - EXTRA HEBOH & GIGANTIC) */}
          <div className="order-1 md:order-2 flex flex-col items-center -translate-y-4">
            {/* Animated Floating Crown */}
            <div className="animate-crown mb-1">
              <Crown className="w-16 h-16 text-yellow-300 drop-shadow-[0_0_20px_rgba(253,224,71,0.9)]" />
            </div>

            <div className="relative mb-4">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-200 animate-spin blur-lg opacity-85" />
              <div className="relative w-44 h-44 rounded-full border-4 border-yellow-300 overflow-hidden bg-coffee-950 shadow-[0_0_50px_rgba(234,179,8,0.8)] flex items-center justify-center">
                {firstPlace?.photo ? (
                  <img src={firstPlace.photo} alt={firstPlace.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">👑</span>
                )}
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-coffee-950 font-black text-base px-5 py-1 rounded-full border-2 border-white shadow-xl flex items-center gap-1.5 whitespace-nowrap">
                <Trophy className="w-4 h-4" /> 1ST CHAMPION
              </div>
            </div>

            <div className="w-full bg-gradient-to-b from-yellow-950/80 via-coffee-900 to-black border-2 border-gold-400 rounded-3xl p-6 text-center shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-pulse-glow">
              <div className="text-gold-300 font-extrabold text-sm uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" /> THE GRAND WINNER <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-gold-300 to-amber-400 mb-2 truncate">
                {firstPlace?.name || 'TBA'}
              </div>
              <div className="text-base text-coffee-200 font-semibold truncate">
                {firstPlace?.affiliation || 'Coffee Champion'}
              </div>
            </div>
          </div>

          {/* JUARA 3 (Bronze) */}
          <div className="order-3 flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-28 h-28 rounded-full border-4 border-amber-700 overflow-hidden bg-amber-950 shadow-[0_0_25px_rgba(180,83,9,0.4)] flex items-center justify-center">
                {thirdPlace?.photo ? (
                  <img src={thirdPlace.photo} alt={thirdPlace.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🥉</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-1 bg-amber-700 text-white font-black text-sm px-2.5 py-0.5 rounded-full border border-white shadow">
                3rd
              </div>
            </div>
            <div className="w-full bg-gradient-to-b from-amber-950/60 to-slate-950 border border-amber-800 rounded-2xl p-5 text-center shadow-xl">
              <div className="text-amber-500 font-bold text-sm uppercase tracking-wider mb-1">JUARA 3</div>
              <div className="text-xl font-bold text-white mb-1 truncate">{thirdPlace?.name || 'TBA'}</div>
              <div className="text-xs text-amber-300/80 truncate">{thirdPlace?.affiliation || '-'}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={triggerAgain}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-coffee-950 font-bold hover:bg-gold-400 transition shadow-lg active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            Rayakan Lagi (Fanfare & Confetti)
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition"
          >
            Kembali ke Bagan
          </button>
        </div>
      </div>
    </div>
  );
};
