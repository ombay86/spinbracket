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
  GripVertical,
  ArrowRightLeft,
  X,
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
  const [draggedItem, setDraggedItem] = useState<{
    type: 'slot' | 'unassigned';
    matchId?: string;
    slot?: 'A' | 'B';
    participant: any;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

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

    clientDb.fetchTournamentByIdAsync(tournamentId).then((fresh) => {
      if (fresh) setTournament(fresh);
    });

    const handleSynced = () => {
      const fresh = clientDb.getTournamentById(tournamentId);
      if (fresh) setTournament(fresh);
    };

    window.addEventListener('spinbracket_data_synced', handleSynced);
    return () => window.removeEventListener('spinbracket_data_synced', handleSynced);
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

  // Drag and Drop: Reshuffle and swap player between slots or from unassigned pool
  const handleDropOnSlot = (targetMatchId: string, targetSlot: 'A' | 'B') => {
    if (!draggedItem || !tournament) return;

    const updatedMatches = { ...tournament.matches };
    const destMatch = { ...updatedMatches[targetMatchId] };
    const currentDestSlot = targetSlot === 'A' ? destMatch.participantA : destMatch.participantB;

    if (draggedItem.type === 'slot') {
      const sourceMatchId = draggedItem.matchId!;
      const sourceSlot = draggedItem.slot!;

      // If dropped onto the exact same slot, do nothing
      if (sourceMatchId === targetMatchId && sourceSlot === targetSlot) {
        setDraggedItem(null);
        setDragOverTarget(null);
        return;
      }

      const srcMatch = sourceMatchId === targetMatchId ? destMatch : { ...updatedMatches[sourceMatchId] };
      const sourceParticipant = sourceSlot === 'A' ? srcMatch.participantA : srcMatch.participantB;

      // Swap contents: target gets sourceParticipant, source gets currentDestSlot
      if (targetSlot === 'A') {
        destMatch.participantA = sourceParticipant ? { ...sourceParticipant } : null;
      } else {
        destMatch.participantB = sourceParticipant ? { ...sourceParticipant } : null;
      }

      if (sourceSlot === 'A') {
        srcMatch.participantA = currentDestSlot ? { ...currentDestSlot } : null;
      } else {
        srcMatch.participantB = currentDestSlot ? { ...currentDestSlot } : null;
      }

      // Recheck readiness
      destMatch.status = destMatch.participantA?.participantId && destMatch.participantB?.participantId ? 'ready' : 'pending';
      srcMatch.status = srcMatch.participantA?.participantId && srcMatch.participantB?.participantId ? 'ready' : 'pending';

      updatedMatches[targetMatchId] = destMatch;
      if (sourceMatchId !== targetMatchId) {
        updatedMatches[sourceMatchId] = srcMatch;
      }
    } else if (draggedItem.type === 'unassigned') {
      // Dragging directly from unassigned pool into a slot
      const p = draggedItem.participant as Participant;
      const slotData = {
        participantId: p.id,
        name: p.name,
        affiliation: p.affiliation,
        photo: p.photo,
      };

      if (targetSlot === 'A') {
        destMatch.participantA = slotData;
      } else {
        destMatch.participantB = slotData;
      }

      destMatch.status = destMatch.participantA?.participantId && destMatch.participantB?.participantId ? 'ready' : 'pending';
      updatedMatches[targetMatchId] = destMatch;
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
      setSaveStatus('Perubahan posisi pemain tersimpan ✓');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (e) {
      console.error(e);
      showAlert.error('Gagal Memindahkan', 'Terjadi kesalahan saat memindahkan pemain.');
    } finally {
      setDraggedItem(null);
      setDragOverTarget(null);
    }
  };

  // Remove participant from slot back to pool
  const handleRemoveFromSlot = (matchId: string, slot: 'A' | 'B', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tournament) return;

    const updatedMatches = { ...tournament.matches };
    const m = { ...updatedMatches[matchId] };

    if (slot === 'A') {
      m.participantA = null;
    } else {
      m.participantB = null;
    }
    m.status = 'pending';
    updatedMatches[matchId] = m;

    try {
      const updatedTournament: Tournament = {
        ...tournament,
        matches: updatedMatches,
        updatedAt: new Date().toISOString(),
      };
      clientDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
    } catch (err) {
      console.error(err);
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
                  Spinwheel Player Shuffler
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
          {/* Left Column: Spinwheel Engine & Unassigned Candidates Pool */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-coffee-900/70 border border-gold-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
              <SpinWheel
                candidates={availableParticipants}
                targetSlotLabel={targetSlotLabel}
                onSelected={handleAssignWinner}
                onAutoDrawAll={handleAutoDrawAll}
                isSpinning={isSpinning}
                setIsSpinning={setIsSpinning}
              />
            </div>

            {/* Unassigned Candidates Drag Pool */}
            {availableParticipants.length > 0 && (
              <div className="bg-coffee-900/60 border border-coffee-800 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-coffee-800/80">
                  <div className="flex items-center gap-2 text-sm font-bold text-gold-300">
                    <Users className="w-4 h-4 text-gold-400" />
                    <span>Peserta Belum Masuk Slot ({availableParticipants.length})</span>
                  </div>
                  <span className="text-[11px] text-coffee-400">
                    Bisa di-drag langsung ke slot sebelah kanan 👉
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {availableParticipants.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => {
                        setDraggedItem({
                          type: 'unassigned',
                          participant: p,
                        });
                      }}
                      onDragEnd={() => {
                        setDraggedItem(null);
                        setDragOverTarget(null);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-coffee-950/90 border border-coffee-700 hover:border-gold-400 text-xs text-white font-medium cursor-grab active:cursor-grabbing hover:bg-coffee-800 transition select-none group"
                    >
                      <GripVertical className="w-3 h-3 text-coffee-500 group-hover:text-gold-400" />
                      <span className="font-bold">{p.name}</span>
                      {p.affiliation && (
                        <span className="text-[10px] text-coffee-400 font-normal truncate max-w-[80px]">
                          ({p.affiliation})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Match Pairing Queue & Drag-and-Drop Arena */}
          <div className="lg:col-span-5 bg-coffee-900/60 border border-coffee-800 rounded-3xl p-6 flex flex-col h-[750px]">
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-coffee-800">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-gold-400" /> Pairing Babak 1 ({round1Matches.length} Battle)
              </h2>
              <span className="text-xs text-gold-300 font-mono font-bold">
                {assignedIds.size} / {tournament.participants.length} Terisi
              </span>
            </div>

            {/* Instruction tooltip */}
            <div className="mb-3 px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center gap-2 text-[11px] text-gold-300">
              <ArrowRightLeft className="w-4 h-4 shrink-0 text-gold-400" />
              <span>
                <b>Tips Reshuffle:</b> Tarik (drag) nama pemain dan lepas (drop) ke slot lain untuk bertukar posisi atau mengisi slot.
              </span>
            </div>

            {/* Scrollable match pairing list */}
            <div className="overflow-y-auto space-y-3 pr-2 flex-1">
              {round1Matches.map((m) => {
                const isCurrentTarget = targetMatch?.id === m.id;
                const isOverA = dragOverTarget === `${m.id}-A`;
                const isOverB = dragOverTarget === `${m.id}-B`;

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

                    <div className="space-y-2 text-xs">
                      {/* Slot A */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverTarget(`${m.id}-A`);
                        }}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnSlot(m.id, 'A');
                        }}
                        className={`p-2 rounded-xl flex items-center justify-between transition-all select-none ${
                          isOverA
                            ? 'bg-gold-500/30 border-2 border-gold-400 scale-[1.02] shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                            : m.participantA?.participantId
                            ? 'bg-coffee-900 border border-coffee-700 hover:border-gold-500/60 text-white cursor-grab active:cursor-grabbing'
                            : isCurrentTarget && targetSlot === 'A'
                            ? 'bg-amber-500/20 border-2 border-dashed border-amber-400 text-amber-300 animate-pulse'
                            : 'bg-coffee-950 border border-dashed border-coffee-800 text-coffee-500 hover:border-coffee-600'
                        }`}
                        draggable={!!m.participantA?.participantId}
                        onDragStart={() => {
                          if (m.participantA?.participantId) {
                            setDraggedItem({
                              type: 'slot',
                              matchId: m.id,
                              slot: 'A',
                              participant: m.participantA,
                            });
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverTarget(null);
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {m.participantA?.participantId ? (
                            <GripVertical className="w-3.5 h-3.5 text-coffee-500 hover:text-gold-400 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="w-4 h-4 rounded-full bg-red-600/80 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            A
                          </span>
                          <span className="font-semibold truncate">
                            {m.participantA?.name || (isOverA ? 'Lepas di sini untuk pasang' : 'Slot Kosong')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-coffee-400 truncate max-w-[100px]">
                            {m.participantA?.affiliation || ''}
                          </span>
                          {m.participantA?.participantId && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFromSlot(m.id, 'A', e)}
                              className="p-1 rounded hover:bg-red-950/60 text-coffee-500 hover:text-red-400 transition"
                              title="Keluarkan pemain ke daftar acak"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slot B */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverTarget(`${m.id}-B`);
                        }}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnSlot(m.id, 'B');
                        }}
                        className={`p-2 rounded-xl flex items-center justify-between transition-all select-none ${
                          isOverB
                            ? 'bg-gold-500/30 border-2 border-gold-400 scale-[1.02] shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                            : m.participantB?.participantId
                            ? 'bg-coffee-900 border border-coffee-700 hover:border-gold-500/60 text-white cursor-grab active:cursor-grabbing'
                            : isCurrentTarget && targetSlot === 'B'
                            ? 'bg-blue-500/20 border-2 border-dashed border-blue-400 text-blue-300 animate-pulse'
                            : 'bg-coffee-950 border border-dashed border-coffee-800 text-coffee-500 hover:border-coffee-600'
                        }`}
                        draggable={!!m.participantB?.participantId}
                        onDragStart={() => {
                          if (m.participantB?.participantId) {
                            setDraggedItem({
                              type: 'slot',
                              matchId: m.id,
                              slot: 'B',
                              participant: m.participantB,
                            });
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverTarget(null);
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {m.participantB?.participantId ? (
                            <GripVertical className="w-3.5 h-3.5 text-coffee-500 hover:text-gold-400 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="w-4 h-4 rounded-full bg-blue-600/80 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            B
                          </span>
                          <span className="font-semibold truncate">
                            {m.participantB?.name || (isOverB ? 'Lepas di sini untuk pasang' : 'Slot Kosong')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-coffee-400 truncate max-w-[100px]">
                            {m.participantB?.affiliation || ''}
                          </span>
                          {m.participantB?.participantId && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFromSlot(m.id, 'B', e)}
                              className="p-1 rounded hover:bg-red-950/60 text-coffee-500 hover:text-red-400 transition"
                              title="Keluarkan pemain ke daftar acak"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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
