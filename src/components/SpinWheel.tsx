'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '@/lib/audio';
import { Sparkles, Play, Shuffle } from 'lucide-react';
import { Participant } from '@/lib/db';

interface SpinWheelProps {
  candidates: Participant[];
  targetSlotLabel: string;
  onSelected: (winner: Participant) => void;
  onAutoDrawAll?: () => void;
  isSpinning: boolean;
  setIsSpinning: (val: boolean) => void;
}

const PALETTE = [
  '#eab308', // Gold
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#845c43', // Coffee bronze
  '#6366f1', // Indigo
];

export const SpinWheel: React.FC<SpinWheelProps> = ({
  candidates,
  targetSlotLabel,
  onSelected,
  onAutoDrawAll,
  isSpinning,
  setIsSpinning,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const [selectedBrewer, setSelectedBrewer] = useState<Participant | null>(null);

  // Draw wheel on canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, width, height);

    if (candidates.length === 0) {
      // Empty wheel
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#221610';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Semua Peserta Sudah Diundi!', centerX, centerY);
      return;
    }

    const numSegments = candidates.length;
    const sliceAngle = (Math.PI * 2) / numSegments;

    // Draw outer golden ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 10;
    ctx.shadowColor = 'rgba(234, 179, 8, 0.6)';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();

    // Draw segments
    for (let i = 0; i < numSegments; i++) {
      const startAngle = angle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Segment color
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = '#0c0806';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;

      const participantName = candidates[i].name;
      // Truncate name if too long
      const displayName = participantName.length > 18 ? participantName.slice(0, 16) + '..' : participantName;
      ctx.fillText(displayName, radius - 25, 5);

      ctx.restore();
    }

    // Draw Center Hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#18100c';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☕', centerX, centerY);
    ctx.restore();
  };

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [candidates]);

  // Spin Wheel function with realistic deceleration
  const handleSpin = () => {
    if (isSpinning || candidates.length === 0) return;

    setIsSpinning(true);
    setSelectedBrewer(null);

    // Pick random winner index
    const targetIndex = Math.floor(Math.random() * candidates.length);
    const numSegments = candidates.length;
    const sliceAngle = (Math.PI * 2) / numSegments;

    // Arrow is at the right side (0 radians) or top (-PI/2).
    // Let's set pointer at top: angle = -Math.PI / 2
    // To land targetIndex at top pointer:
    // angle + targetIndex * sliceAngle + sliceAngle/2 = 3*Math.PI/2 (mod 2PI)
    const randomExtraRotations = 5 + Math.floor(Math.random() * 4); // 5 - 8 full rounds
    const currentAngle = currentAngleRef.current % (Math.PI * 2);

    // Target slice center
    const desiredSliceCenter = -(Math.PI / 2);
    const targetSliceAngle = targetIndex * sliceAngle + sliceAngle / 2;
    const targetFinalAngle =
      currentAngle +
      randomExtraRotations * Math.PI * 2 +
      (desiredSliceCenter - (currentAngle + targetSliceAngle));

    const totalAngleDelta = targetFinalAngle - currentAngle;
    const duration = 5500; // ms
    const startTime = performance.now();
    let lastTickSlice = -1;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic or quintic for dramatic slowing
      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      const angle = currentAngle + totalAngleDelta * easeOut;
      currentAngleRef.current = angle;

      drawWheel(angle);

      // Calculate which slice is currently under the pointer for sound tick
      const normalizedAngle = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const currentSlice = Math.floor(normalizedAngle / sliceAngle);
      if (currentSlice !== lastTickSlice) {
        sounds.playTick();
        lastTickSlice = currentSlice;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin finished!
        setIsSpinning(false);
        sounds.playWheelWin();
        const winner = candidates[targetIndex];
        setSelectedBrewer(winner);
        onSelected(winner);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Target Slot Banner */}
      <div className="w-full max-w-lg mb-4 bg-gradient-to-r from-coffee-800 to-coffee-900 border border-gold-500/50 rounded-2xl p-4 text-center shadow-lg">
        <span className="text-xs font-semibold text-coffee-300 tracking-wider uppercase block mb-1">
          Target Pengundian Slot:
        </span>
        <div className="text-xl font-extrabold text-gold-300 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-gold-400" />
          <span>{targetSlotLabel || 'Semua Slot Terisi'}</span>
          <Sparkles className="w-5 h-5 text-gold-400" />
        </div>
      </div>

      {/* Wheel Container with Pointer */}
      <div className="relative w-[440px] h-[440px] flex items-center justify-center">
        {/* Top Pointer Arrow */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[32px] border-t-yellow-300 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] filter" />

        <canvas
          ref={canvasRef}
          width={440}
          height={440}
          className="rounded-full select-none"
        />
      </div>

      {/* Control Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={handleSpin}
          disabled={isSpinning || candidates.length === 0}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-xl shadow-[0_0_30px_rgba(234,179,8,0.5)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition"
        >
          <Play className="w-6 h-6 fill-coffee-950" />
          {isSpinning ? 'Sedang Memutar...' : 'PUTAR RODA SEKARANG!'}
        </button>

        {onAutoDrawAll && candidates.length > 0 && (
          <button
            onClick={onAutoDrawAll}
            disabled={isSpinning}
            className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-coffee-800 hover:bg-coffee-700 text-coffee-200 border border-coffee-600 font-bold text-sm shadow transition"
          >
            <Shuffle className="w-4 h-4" />
            Acak Sisa Otomatis
          </button>
        )}
      </div>

      {/* Selected Brewer Notification */}
      {selectedBrewer && (
        <div className="mt-5 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-center animate-in zoom-in duration-300 max-w-md w-full">
          <div className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-1">
            Peserta Terpilih:
          </div>
          <div className="text-2xl font-black text-white">
            {selectedBrewer.name}
          </div>
          {selectedBrewer.affiliation && (
            <div className="text-sm text-emerald-200/90 font-medium">
              {selectedBrewer.affiliation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
