'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sounds } from '@/lib/audio';
import { Award, Sparkles, X } from 'lucide-react';

interface WinnerCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  winnerName: string;
  winnerAffiliation?: string;
  winnerPhoto?: string;
  matchLabel: string;
  nextStageLabel?: string;
}

export const WinnerCelebrationModal: React.FC<WinnerCelebrationModalProps> = ({
  isOpen,
  onClose,
  winnerName,
  winnerAffiliation,
  winnerPhoto,
  matchLabel,
  nextStageLabel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Play triumphant sound
    sounds.playMatchWinner();

    // Trigger celebratory confetti burst from both sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      colors: ['#eab308', '#facc15', '#aa7c5c', '#ffffff', '#3b82f6'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });

    // Auto close after 4.5 seconds or let user click
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-xl w-full mx-4 bg-gradient-to-b from-coffee-800 via-coffee-900 to-coffee-950 border-2 border-gold-500/80 rounded-3xl p-8 text-center shadow-2xl animate-pulse-glow"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gold-300/70 hover:text-gold-300 hover:bg-gold-500/10 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/20 border border-gold-500/50 text-gold-400 font-semibold text-sm tracking-wider uppercase mb-6">
          <Sparkles className="w-4 h-4 text-gold-400 animate-spin" />
          <span>PEMENANG {matchLabel}</span>
          <Sparkles className="w-4 h-4 text-gold-400 animate-spin" />
        </div>

        {/* Winner Photo with Ring */}
        <div className="relative mx-auto w-44 h-44 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gold-600 via-amber-400 to-yellow-200 animate-spin blur-md opacity-75" />
          <div className="relative w-full h-full rounded-full border-4 border-gold-400 overflow-hidden bg-coffee-900 flex items-center justify-center shadow-inner">
            {winnerPhoto ? (
              <img
                src={winnerPhoto}
                alt={winnerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-6xl select-none">☕</div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gold-500 text-coffee-950 p-3 rounded-full shadow-lg border-2 border-white">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Winner Name */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-gold-400 to-amber-500 tracking-tight mb-2">
          {winnerName}
        </h2>

        {/* Winner Affiliation */}
        {winnerAffiliation && (
          <p className="text-lg md:text-xl text-coffee-200 font-medium mb-4">
            {winnerAffiliation}
          </p>
        )}

        {/* Next Round Notice */}
        {nextStageLabel && (
          <div className="mt-4 pt-4 border-t border-coffee-700/60 text-sm font-semibold text-emerald-400 tracking-wide flex items-center justify-center gap-2">
            <span>✨ Lolos melaju ke: {nextStageLabel}</span>
          </div>
        )}

        <div className="mt-6 text-xs text-coffee-400">
          Klik di mana saja atau tunggu beberapa detik untuk kembali ke bagan
        </div>
      </div>
    </div>
  );
};
