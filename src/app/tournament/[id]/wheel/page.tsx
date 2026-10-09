'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shuffle,
  Tv,
  ArrowLeft,
  Users,
  CheckCircle,
  RotateCcw,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { clientDb, Tournament, Participant, Match } from '@/lib/client-db';
import { SpinWheel } from '@/components/SpinWheel';
import { showAlert } from '@/lib/sweetalert';
import { useSessionGuard } from '@/hooks/useSessionGuard';

export default function SpinWheelPage() {
  const router = useRouter();
  useSessionGuard();
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const fetchTournament = () => {
    try {
      const t = clientDb.getTournamentById(tournamentId);
      if (!t) {
        router.push('/dashboard');
        return;
      }
      setTournament(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center text-gold-400 font-bold">
        Memuat Undian Spinwheel...
      </div>
    );
  }

  // Get list of Round 1 matches
  const round1Matches: Match[] = (tournament.rounds[0]?.matchIds || [])
    .map((id) => tournament.matches[id])
    .filter(Boolean);

  // Find assigned participant IDs
  const assignedIds = new Set<string>();
  round1Matches.forEach((m) => {
    if (m.participantA?.participantId) assignedIds.add(m.participantA.participantId);
    if (m.participantB?.participantId) assignedIds.add(m.participantB.participantId);
  });

  // Remaining participants for wheel
  const availableParticipants = tournament.participants.filter(
    (p) => !assignedIds.has(p.id)
  );

  // Determine current target open slot
  let targetMatch: Match | null = null;
  let targetSlot: 'A' | 'B' | null = null;

  for (const m of round1Matches) {
    if (!m.participantA?.participantId) {
      targetMatch = m;
      targetSlot = 'A';
      break;
    }
    if (!m.participantB?.participantId) {
      targetMatch = m;
      targetSlot = 'B';
      break;
    }
  }

  const targetSlotLabel = targetMatch
    ? `${targetMatch.label} (${targetSlot === 'A' ? 'Sudut Merah / Brewer 1' : 'Sudut Biru / Brewer 2'})`
    : 'Semua Slot Babak 1 Selesai Diundi! 🎉';

  // Handle slot assignment when wheel stops
  const handleAssignWinner = async (chosen: Participant) => {
    if (!targetMatch || !targetSlot) return;

    const updatedMatches = { ...tournament.matches };
    const matchCopy = { ...updatedMatches[targetMatch.id] };

    const slotData = {
      participantId: chosen.id,
      name: chosen.name,
      affiliation: chosen.affiliation,
      photo: chosen.photo,
    };

    if (targetSlot === 'A') {
      matchCopy.participantA = slotData;
    } else {
      matchCopy.participantB = slotData;
    }

    // If both slots are now filled, mark match as ready
    if (matchCopy.participantA?.participantId && matchCopy.participantB?.participantId) {
      matchCopy.status = 'ready';
    }

    updatedMatches[targetMatch.id] = matchCopy;

    // Save to local storage
    try {
      const updatedTournament: Tournament = {
        ...tournament,
        matches: updatedMatches,
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      };
      clientDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
      setSaveStatus('');
    } catch (e) {
      console.error(e);
      setSaveStatus('Gagal menyimpan undian');
    }
  };

  // Auto-draw all remaining participants randomly
  const handleAutoDrawAll = async () => {
    if (availableParticipants.length === 0) return;
    const confirmed = await showAlert.confirm({
      title: 'Acak Sisa Slot Otomatis?',
      text: `${availableParticipants.length} peserta yang belum terundi akan dipasangkan ke slot kosong secara acak.`,
      confirmText: 'Ya, Acak Sekarang',
      cancelText: 'Batal',
      icon: 'question',
    });
    if (!confirmed) return;

    // Shuffle remaining participants
    const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5);
    const updatedMatches = { ...tournament.matches };

    let sIdx = 0;
    for (const m of round1Matches) {
      const matchCopy = { ...updatedMatches[m.id] };
      if (!matchCopy.participantA?.participantId && sIdx < shuffled.length) {
        const p = shuffled[sIdx++];
        matchCopy.participantA = {
          participantId: p.id,
          name: p.name,
          affiliation: p.affiliation,
          photo: p.photo,
        };
      }
      if (!matchCopy.participantB?.participantId && sIdx < shuffled.length) {
        const p = shuffled[sIdx++];
        matchCopy.participantB = {
          participantId: p.id,
          name: p.name,
          affiliation: p.affiliation,
          photo: p.photo,
        };
      }
      if (matchCopy.participantA?.participantId && matchCopy.participantB?.participantId) {
        matchCopy.status = 'ready';
      }
      updatedMatches[m.id] = matchCopy;
    }

    try {
      const updatedTournament: Tournament = {
        ...tournament,
        matches: updatedMatches,
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      };
      clientDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
      setSaveStatus('');
      showAlert.success('Selesai Diundi!', 'Semua slot Babak 1 telah terisi.');
    } catch (e) {
      console.error(e);
      showAlert.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan hasil undian.');
    }
  };

  // Reset drawing
  const handleResetDraw = async () => {
    const confirmed = await showAlert.confirm({
      title: 'Reset Undian Babak 1?',
      text: 'Semua pasangan hasil undian Babak 1 akan dikosongkan kembali dan seluruh peserta dapat diundi ulang.',
      confirmText: 'Ya, Reset Undian',
      cancelText: 'Batal',
      isDanger: true,
    });
    if (!confirmed) return;

    const updatedMatches = { ...tournament.matches };
    round1Matches.forEach((m) => {
      updatedMatches[m.id] = {
        ...updatedMatches[m.id],
        participantA: null,
        participantB: null,
        winnerId: null,
        status: 'pending',
      };
    });

    try {
      const updatedTournament: Tournament = {
        ...tournament,
        matches: updatedMatches,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      };
      clientDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
      setSaveStatus('');
      showAlert.success('Undian Direset!', 'Semua pasangan Babak 1 telah dikosongkan.');
    } catch (e) {
      console.error(e);
      showAlert.error('Gagal Reset', 'Terjadi kesalahan saat mengosongkan pasangan undian.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-coffee-950 via-coffee-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-coffee-800">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-coffee-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{tournament.title}</h1>
                <span className="text-xs bg-gold-500/20 text-gold-300 border border-gold-500/40 px-3 py-0.5 rounded-full font-bold">
                  Undian Live Spinwheel
                </span>
              </div>
              <p className="text-xs text-coffee-300">
                Sisa {availableParticipants.length} dari {tournament.participants.length} peserta belum terundi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDraw}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coffee-800 hover:bg-red-950/60 text-coffee-300 hover:text-red-300 border border-coffee-700 text-xs font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" /> Reset Undian
            </button>

            <Link
              href={`/tournament/${tournamentId}/setup`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-coffee-200 border border-coffee-700 text-xs font-semibold transition"
            >
              <Users className="w-4 h-4" /> Edit Peserta
            </Link>

            <Link
              href={`/tournament/${tournamentId}/tv`}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 text-sm font-black shadow transition active:scale-95"
            >
              <Tv className="w-4 h-4" /> Buka Layar TV (Bagan)
            </Link>
          </div>
        </div>

        {saveStatus && (
          <div className="mb-4 text-center text-xs font-mono text-gold-300 animate-pulse">
            {saveStatus}
          </div>
        )}

        {/* Content Grid: Left Spinwheel, Right Match Pairings List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Spinwheel Engine */}
          <div className="lg:col-span-7 bg-coffee-900/70 border border-gold-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            <SpinWheel
              candidates={availableParticipants}
              targetSlotLabel={targetSlotLabel}
              onSelected={handleAssignWinner}
              onAutoDrawAll={handleAutoDrawAll}
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
            />
          </div>

          {/* Right Column: Live Match Pairing Queue */}
          <div className="lg:col-span-5 bg-coffee-900/60 border border-coffee-800 rounded-3xl p-6 flex flex-col h-[750px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-coffee-800">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-gold-400" /> Pairing Babak 1 ({round1Matches.length} Battle)
              </h2>
              <span className="text-xs text-gold-300 font-mono font-bold">
                {assignedIds.size} / {tournament.participants.length} Terisi
              </span>
            </div>

            {/* Scrollable match pairing list */}
            <div className="overflow-y-auto space-y-3 pr-2 flex-1">
              {round1Matches.map((m) => {
                const isCurrentTarget = targetMatch?.id === m.id;

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3 transition ${
                      isCurrentTarget
                        ? 'bg-gold-500/10 border-gold-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                        : 'bg-coffee-950/80 border-coffee-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-coffee-400 mb-2">
                      <span className="text-gold-300">{m.label}</span>
                      {m.participantA?.participantId && m.participantB?.participantId ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Lengkap
                        </span>
                      ) : isCurrentTarget ? (
                        <span className="text-amber-400 animate-pulse">Menunggu Undian...</span>
                      ) : (
                        <span className="text-coffee-600">Pending</span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {/* Slot A */}
                      <div
                        className={`p-2 rounded-xl flex items-center justify-between ${
                          m.participantA?.participantId
                            ? 'bg-coffee-900 border border-coffee-700 text-white'
                            : isCurrentTarget && targetSlot === 'A'
                            ? 'bg-amber-500/20 border border-amber-400 text-amber-300 animate-pulse'
                            : 'bg-coffee-950 border border-dashed border-coffee-800 text-coffee-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-4 h-4 rounded-full bg-red-600/80 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            A
                          </span>
                          <span className="font-semibold truncate">
                            {m.participantA?.name || 'Slot Kosong'}
                          </span>
                        </div>
                        <span className="text-[10px] text-coffee-400 truncate max-w-[120px]">
                          {m.participantA?.affiliation || ''}
                        </span>
                      </div>

                      {/* Slot B */}
                      <div
                        className={`p-2 rounded-xl flex items-center justify-between ${
                          m.participantB?.participantId
                            ? 'bg-coffee-900 border border-coffee-700 text-white'
                            : isCurrentTarget && targetSlot === 'B'
                            ? 'bg-blue-500/20 border border-blue-400 text-blue-300 animate-pulse'
                            : 'bg-coffee-950 border border-dashed border-coffee-800 text-coffee-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-4 h-4 rounded-full bg-blue-600/80 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            B
                          </span>
                          <span className="font-semibold truncate">
                            {m.participantB?.name || 'Slot Kosong'}
                          </span>
                        </div>
                        <span className="text-[10px] text-coffee-400 truncate max-w-[120px]">
                          {m.participantB?.affiliation || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
