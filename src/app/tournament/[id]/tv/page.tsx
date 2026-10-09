'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Maximize,
  Minimize,
  Sparkles,
  ArrowLeft,
  Crown,
  Check,
  Award,
  ChevronRight,
  Shuffle,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import { clientDb, Tournament, Match, Participant } from '@/lib/client-db';
import { WinnerCelebrationModal } from '@/components/WinnerCelebrationModal';
import { GrandChampionModal } from '@/components/GrandChampionModal';

export default function TvBracketPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullView, setIsFullView] = useState(false);

  // Selected match for adjudication modal
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Grand Finalist Selection Modal (for Juara 1, 2, 3)
  const [showGrandFinalModal, setShowGrandFinalModal] = useState(false);
  const [p1WinnerId, setP1WinnerId] = useState<string>('');
  const [p2WinnerId, setP2WinnerId] = useState<string>('');
  const [p3WinnerId, setP3WinnerId] = useState<string>('');

  // Celebration Modals
  const [celebrationData, setCelebrationData] = useState<{
    isOpen: boolean;
    name: string;
    affiliation?: string;
    photo?: string;
    matchLabel: string;
    nextStageLabel?: string;
  }>({
    isOpen: false,
    name: '',
    matchLabel: '',
  });

  const [showGrandChampionModal, setShowGrandChampionModal] = useState(false);

  // Fetch tournament data
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

  // TV Viewport Scaling: Fixed 1920 x 1080 fit to screen without scrolling
  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1920;
      const targetHeight = 1080;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const scaleFactor = Math.min(windowWidth / targetWidth, windowHeight / targetHeight);
      setScale(scaleFactor);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  if (loading || !tournament) {
    return (
      <div className="fixed inset-0 bg-[#0c0806] flex items-center justify-center text-gold-400 font-bold text-xl">
        Memuat Tampilan Bagan TV...
      </div>
    );
  }

  // Handle Match Winner Click & Dynamic Progression
  const handleSelectWinner = async (match: Match, winnerSlot: 'A' | 'B') => {
    if (!tournament) return;
    const winnerData = winnerSlot === 'A' ? match.participantA : match.participantB;

    if (!winnerData || !winnerData.participantId) return;

    const updatedMatches = { ...tournament.matches };
    const matchCopy = { ...updatedMatches[match.id] };
    matchCopy.winnerId = winnerData.participantId;
    matchCopy.status = 'completed';
    updatedMatches[match.id] = matchCopy;

    let nextStageLabel = '';

    // If match has nextMatchId, forward winner
    if (match.nextMatchId && updatedMatches[match.nextMatchId]) {
      const nextM = { ...updatedMatches[match.nextMatchId] };
      const slot = match.nextMatchSlot || 'A';
      const forwardedSlot = {
        participantId: winnerData.participantId,
        name: winnerData.name,
        affiliation: winnerData.affiliation,
        photo: winnerData.photo,
      };

      if (slot === 'A') {
        nextM.participantA = forwardedSlot;
      } else {
        nextM.participantB = forwardedSlot;
      }

      // Check if opponent is BYE, auto resolve
      if (nextM.participantB?.isBye) {
        nextM.winnerId = winnerData.participantId;
        nextM.status = 'completed';
        if (nextM.nextMatchId && updatedMatches[nextM.nextMatchId]) {
          const afterBye = { ...updatedMatches[nextM.nextMatchId] };
          if (nextM.nextMatchSlot === 'A') {
            afterBye.participantA = forwardedSlot;
          } else {
            afterBye.participantB = forwardedSlot;
          }
          if (afterBye.participantA?.participantId && afterBye.participantB?.participantId) {
            afterBye.status = 'ready';
          }
          updatedMatches[nextM.nextMatchId] = afterBye;
        }
      } else if (nextM.participantA?.participantId && nextM.participantB?.participantId) {
        nextM.status = 'ready';
      }

      updatedMatches[match.nextMatchId] = nextM;
      nextStageLabel = nextM.label;
    }

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
    } catch (e) {
      console.error(e);
    } finally {
      setSelectedMatch(null);

      // Trigger Winner Gimmick Pop-up!
      setCelebrationData({
        isOpen: true,
        name: winnerData.name || 'Brewer',
        affiliation: winnerData.affiliation,
        photo: winnerData.photo,
        matchLabel: match.label,
        nextStageLabel,
      });
    }
  };

  // Submit Grand Throwdown Winners (Juara 1, 2, 3)
  const handleSaveGrandWinners = async () => {
    if (!p1WinnerId || !p2WinnerId || !p3WinnerId) {
      alert('Pilih Juara 1, 2, dan 3 terlebih dahulu!');
      return;
    }

    const first = tournament.participants.find((p) => p.id === p1WinnerId) || null;
    const second = tournament.participants.find((p) => p.id === p2WinnerId) || null;
    const third = tournament.participants.find((p) => p.id === p3WinnerId) || null;

    try {
      const updatedTournament: Tournament = {
        ...tournament,
        winners: { first, second, third },
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };
      clientDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
      setShowGrandFinalModal(false);
      // Trigger Mega Finale Gimmick!
      setShowGrandChampionModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenGrandFinale = () => {
    setShowGrandChampionModal(true);
  };

  // Check if a round is completed (all matches have a winner or are bye)
  const isRoundCompleted = (rIndex: number) => {
    const r = tournament.rounds[rIndex];
    if (!r || !r.matchIds.length) return false;
    return r.matchIds.every((mId) => {
      const m = tournament.matches[mId];
      return m && (m.status === 'completed' || !!m.winnerId || m.participantB?.isBye);
    });
  };

  // Check if a round is Quarter Final or beyond
  // "hingga sampai ke seperempat final baru tidak ada kolom yang menghilang lagi"
  const isQuarterFinalOrLater = (rIndex: number) => {
    const r = tournament.rounds[rIndex];
    if (!r) return false;
    const nameLower = r.name.toLowerCase();
    if (
      nameLower.includes('quarter') ||
      nameLower.includes('seperempat') ||
      nameLower.includes('semi') ||
      nameLower.includes('final')
    ) {
      return true;
    }
    // Also if it's within the last 3 rounds (Quarter, Semi, Final)
    if (tournament.rounds.length >= 3 && rIndex >= tournament.rounds.length - 3) {
      return true;
    }
    return false;
  };

  // Filter visible rounds:
  // - If isFullView -> show all rounds!
  // - If Quarter Final or later -> NEVER hide!
  // - If before Quarter Final -> collapses / disappears when completed!
  const visibleRounds = tournament.rounds.filter((r, idx) => {
    if (isFullView) return true;
    if (isQuarterFinalOrLater(idx)) return true;
    return !isRoundCompleted(idx);
  });

  const displayedRounds = visibleRounds.length > 0 ? visibleRounds : tournament.rounds;
  const hiddenCount = tournament.rounds.length - displayedRounds.length;

  return (
    <div className="fixed inset-0 bg-[#0c0806] overflow-hidden flex items-center justify-center select-none">
      {/* 
        FIXED 1920 x 1080 TV CANVAS
        Scales cleanly with CSS transform to fit any TV screen or monitor without scrollbars!
      */}
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="relative bg-gradient-to-b from-[#140d09] via-[#0d0806] to-[#070403] text-white flex flex-col justify-between p-6 shadow-2xl border border-coffee-800/40"
      >
        {/* =========================================================================
            HEADER BAR
        ========================================================================= */}
        <header className="flex items-center justify-between pb-3 border-b-2 border-gold-500/40">
          {/* Left Brand Badge */}
          <div className="flex items-center gap-4 bg-[#1e130c] border border-gold-500/50 rounded-2xl px-5 py-2 shadow-lg">
            <div className="w-11 h-11 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400">
              <span className="text-2xl">☕</span>
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white uppercase truncate max-w-xs">
                {tournament.title}
              </div>
              <div className="text-[11px] text-gold-300 font-bold tracking-widest uppercase">
                {tournament.subtitle || 'MANUAL BREWING TOURNAMENT'}
              </div>
            </div>
          </div>

          {/* Center Stage & Participant Info */}
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-gold-400 to-amber-500 uppercase">
              BAGAN TURNAMEN ({tournament.participants?.length || 0} PESERTA)
            </h1>
            <p className="text-xs text-coffee-300 font-semibold tracking-wider mt-0.5">
              {tournament.location} &nbsp;|&nbsp; {tournament.date}
            </p>
          </div>

          {/* Right Action & TV Controls */}
          <div className="flex items-center gap-3">
            {/* Toggle Full View / Focus View */}
            <button
              onClick={() => setIsFullView((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition shadow ${
                isFullView
                  ? 'bg-gold-500 text-coffee-950 border-gold-400 font-black'
                  : 'bg-[#2a1a12] border-gold-500/40 text-gold-300 hover:bg-[#382318]'
              }`}
              title={isFullView ? 'Kembali ke Mode Fokus Auto-Zoom' : 'Tampilkan Semua Babak (Full View)'}
            >
              {isFullView ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Mode Fokus</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Full View {hiddenCount > 0 ? `(+${hiddenCount})` : ''}</span>
                </>
              )}
            </button>

            {tournament.winners?.first && (
              <button
                onClick={handleOpenGrandFinale}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-coffee-950 font-black text-xs shadow-[0_0_15px_rgba(234,179,8,0.5)] active:scale-95 transition"
              >
                <Trophy className="w-4 h-4" />
                Lihat Juara
              </button>
            )}

            <button
              onClick={() => setShowGrandFinalModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2a1a12] border border-gold-500/40 text-gold-300 font-bold text-xs hover:bg-[#382318] transition"
            >
              <Crown className="w-4 h-4 text-gold-400" />
              Tentukan Juara 1, 2, 3
            </button>

            <Link
              href={`/tournament/${tournamentId}/wheel`}
              className="p-2.5 rounded-xl bg-[#1e130c] hover:bg-[#2e1d13] border border-coffee-700 text-gold-300 hover:text-white transition"
              title="Undian Spinwheel"
            >
              <Shuffle className="w-4 h-4" />
            </Link>

            <Link
              href={`/tournament/${tournamentId}/setup`}
              className="p-2.5 rounded-xl bg-[#1e130c] hover:bg-[#2e1d13] border border-coffee-700 text-coffee-300 hover:text-white transition"
              title="Kelola Peserta"
            >
              <Users className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl bg-[#1e130c] hover:bg-[#2e1d13] border border-coffee-700 text-coffee-300 hover:text-white transition"
              title="Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/50 text-gold-300 transition"
              title="Fullscreen Layar TV"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* =========================================================================
            DYNAMIC BRACKET BOARD
            Automatically auto-zooms / expands visible rounds!
        ========================================================================= */}
        <div
          style={{
            gridTemplateColumns: `repeat(${displayedRounds.length}, minmax(0, 1fr))`,
          }}
          className="grid gap-3.5 h-[870px] items-stretch pt-2 transition-all duration-500"
        >
          {/* RENDER VISIBLE TOURNAMENT ROUNDS DYNAMICALLY */}
          {displayedRounds.map((round, rIdx) => {
            const matchIds = round.matchIds || [];
            const matchCount = matchIds.length;
            const colCount = displayedRounds.length;

            // Responsive sizing based on columns count & matches count
            const isSpaciousCol = colCount <= 3;
            const isMediumCol = colCount === 4;

            const isLowMatch = matchCount <= 4;
            const isMediumMatch = matchCount > 4 && matchCount <= 8;

            // Header classes
            const headerPadClass = isSpaciousCol ? 'py-3 px-3 mb-2.5 rounded-2xl' : 'py-2 px-2 mb-1.5 rounded-xl';
            const headerTitleClass = isSpaciousCol ? 'text-base md:text-lg font-black' : isMediumCol ? 'text-sm md:text-base font-black' : 'text-xs md:text-sm font-black';
            const headerSubClass = isSpaciousCol ? 'text-xs font-bold text-coffee-950/90' : 'text-[10px] md:text-[11px] font-bold text-coffee-950/80';

            // Dynamic Card classes
            const isBigCard = (isSpaciousCol && matchCount <= 6) || isLowMatch;
            const isMediumCard = (isMediumCol || isMediumMatch) && !isBigCard;

            const cardPadClass = isBigCard
              ? 'p-3.5 rounded-2xl border-2'
              : isMediumCard
              ? 'p-2.5 rounded-xl border-2'
              : 'px-2.5 py-1.5 rounded-lg border';

            const labelTextClass = isBigCard
              ? 'text-xs md:text-sm font-black'
              : isMediumCard
              ? 'text-xs font-black'
              : 'text-[11px] font-bold';

            const nameTextClass = isBigCard
              ? 'text-base md:text-lg font-black tracking-tight'
              : isMediumCard
              ? 'text-sm font-black'
              : 'text-xs font-bold';

            const rowPadClass = isBigCard
              ? 'px-3 py-2 rounded-xl'
              : isMediumCard
              ? 'px-2.5 py-1.5 rounded-lg'
              : 'px-2 py-0.5 rounded';

            const iconClass = isBigCard ? 'w-4 h-4' : isMediumCard ? 'w-3.5 h-3.5' : 'w-3 h-3';

            const bypassPadClass = isBigCard ? 'p-4 rounded-2xl border-2' : isMediumCard ? 'p-3 rounded-xl border-2' : 'p-2.5 rounded-xl border-2';
            const bypassTitleClass = isBigCard ? 'text-xs md:text-sm font-black' : 'text-[11px] font-black';
            const bypassNameClass = isBigCard ? 'text-base md:text-lg font-black' : isMediumCard ? 'text-sm font-black' : 'text-xs font-black';
            const bypassSubClass = isBigCard ? 'text-xs font-bold' : 'text-[10px] font-bold';

            return (
              <div
                key={`round_${round.index}`}
                className="flex flex-col h-full bg-[#160e0a]/90 rounded-2xl border border-coffee-800 p-2.5 overflow-hidden shadow-xl transition-all duration-300"
              >
                {/* Round Header */}
                <div className={`text-center bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-coffee-950 uppercase tracking-wider shadow ${headerPadClass}`}>
                  <div className={`truncate ${headerTitleClass}`}>{round.name}</div>
                  <div className={`truncate mt-0.5 ${headerSubClass}`}>
                    {round.subTitle}
                  </div>
                </div>

                {/* Match Cards List (Independent vertical scroll per column) */}
                {(() => {
                  // Ensure bypass match is always placed at the end of the column
                  const sortedMatchIds = [...matchIds].sort((a, b) => {
                    const isByeA = tournament.matches[a]?.participantB?.isBye ? 1 : 0;
                    const isByeB = tournament.matches[b]?.participantB?.isBye ? 1 : 0;
                    return isByeA - isByeB;
                  });

                  return (
                    <div
                      className={`flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1 py-1 column-scrollbar ${
                        matchCount <= 4 ? 'justify-around' : 'justify-start'
                      }`}
                    >
                      {sortedMatchIds.map((matchId) => {
                        const match = tournament.matches[matchId];
                        if (!match) return null;

                        const isCompleted = match.status === 'completed';
                        const isBye = match.participantB?.isBye;

                        if (isBye) {
                          return (
                            <div
                              key={matchId}
                              onClick={() => setSelectedMatch(match)}
                              className={`cursor-pointer shrink-0 border-2 border-dashed text-center transition hover:scale-[1.02] shadow-[0_0_20px_rgba(234,179,8,0.25)] mt-1 ${bypassPadClass} ${
                                isCompleted
                                  ? 'bg-[#1e130c] border-emerald-500/90'
                                  : 'bg-gradient-to-r from-amber-950/90 via-[#2a1b13] to-coffee-900 border-gold-400'
                              }`}
                            >
                              <div className={`text-gold-300 uppercase flex items-center justify-center gap-1.5 ${bypassTitleClass}`}>
                                <Sparkles className="w-4 h-4 text-gold-400 animate-spin" />
                                <span>⚡ BYPASS TICKET (LOLOS LANGSUNG)</span>
                              </div>
                              <div className={`text-white truncate mt-1.5 ${bypassNameClass}`}>
                                {match.participantA?.name || 'Menunggu Peserta...'}
                              </div>
                              <div className={`text-emerald-400 mt-1 flex items-center justify-center gap-1 ${bypassSubClass}`}>
                                {isCompleted ? '✓ Telah Lolos ke Babak Selanjutnya' : '✨ Klik untuk Meloloskan Otomatis'}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={matchId}
                            onClick={() => setSelectedMatch(match)}
                            className={`cursor-pointer shrink-0 flex flex-col justify-center transition hover:scale-[1.01] ${cardPadClass} ${
                              isCompleted
                                ? 'bg-[#1e130c] border-gold-500/80 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
                                : match.participantA?.participantId && match.participantB?.participantId
                                ? 'bg-[#241710] border-coffee-700 hover:border-gold-400'
                                : 'bg-[#140d09] border-coffee-900 text-coffee-600'
                            }`}
                          >
                            {/* Match Title & Status */}
                            <div className={`flex items-center justify-between text-gold-400 mb-1.5 ${labelTextClass}`}>
                              <span className="truncate">{match.label}</span>
                              {isCompleted ? (
                                <Check className={`text-emerald-400 shrink-0 ${iconClass}`} />
                              ) : (
                                <ChevronRight className={`text-coffee-500 shrink-0 ${iconClass}`} />
                              )}
                            </div>

                            {/* Brewer A */}
                            <div
                              className={`flex items-center justify-between mb-1 ${rowPadClass} ${
                                match.winnerId === match.participantA?.participantId
                                  ? 'bg-gold-500 text-coffee-950 font-black shadow-md'
                                  : 'bg-black/50 text-white'
                              }`}
                            >
                              <span className={`truncate ${nameTextClass}`}>
                                {match.participantA?.name || 'Slot Kosong'}
                              </span>
                              {match.winnerId === match.participantA?.participantId && (
                                <Award className={`shrink-0 ${iconClass}`} />
                              )}
                            </div>

                            {/* Brewer B */}
                            <div
                              className={`flex items-center justify-between ${rowPadClass} ${
                                match.winnerId === match.participantB?.participantId
                                  ? 'bg-gold-500 text-coffee-950 font-black shadow-md'
                                  : 'bg-black/50 text-white'
                              }`}
                            >
                              <span className={`truncate ${nameTextClass}`}>
                                {match.participantB?.name || 'Slot Kosong'}
                              </span>
                              {match.winnerId === match.participantB?.participantId && (
                                <Award className={`shrink-0 ${iconClass}`} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            BOTTOM FOOTER STATUS FLOW
        ========================================================================= */}
        <footer className="pt-2 border-t border-coffee-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="px-3 py-1 rounded-lg bg-[#221610] text-gold-300 text-xs font-bold border border-gold-500/40">
              {tournament.participants?.length || 0} PESERTA
            </div>
            {tournament.rounds.map((r, i) => (
              <React.Fragment key={i}>
                <span className="text-coffee-600">→</span>
                <div className="px-3 py-1 rounded-lg bg-[#221610] text-gold-300 text-xs font-bold border border-gold-500/40">
                  {r.name}
                </div>
              </React.Fragment>
            ))}
            <span className="text-coffee-600">→</span>
            <div className="px-4 py-1 rounded-lg bg-gradient-to-r from-gold-500 to-amber-500 text-coffee-950 text-xs font-black shadow">
              JUARA 1, 2, 3 🏆
            </div>
          </div>

          <div className="text-xs text-coffee-400 font-medium">
            Klik pada kotak pertandingan untuk memilih pemenang secara langsung
          </div>
        </footer>
      </div>

      {/* =========================================================================
          MATCH ADJUDICATION MODAL (Choose Winner for a Match)
      ========================================================================= */}
      {selectedMatch && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1c120c] border-2 border-gold-500/80 rounded-3xl p-6 max-w-2xl w-full shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/40 text-[11px] font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {selectedMatch.participantB?.isBye
                ? 'SLOT BYPASS (LOLOS OTOMATIS KARENA JUMLAH GANJIL)'
                : 'PENENTUAN PEMENANG PERTANDINGAN'}
            </div>

            <h3 className="text-2xl font-black text-gold-300 mb-1">{selectedMatch.label}</h3>
            <p className="text-xs text-coffee-300 mb-6">
              {selectedMatch.participantB?.isBye
                ? 'Peserta ini berhak langsung lolos (bypass) ke babak berikutnya tanpa bertanding:'
                : 'Pilih salah satu peserta untuk melaju ke babak berikutnya:'}
            </p>

            {selectedMatch.participantB?.isBye ? (
              /* Single Participant Bypass Card */
              <div className="max-w-md mx-auto mb-6 bg-gradient-to-b from-amber-950/70 to-coffee-950 border-2 border-gold-400 rounded-3xl p-6 text-center shadow-2xl">
                <div className="w-24 h-24 mx-auto rounded-full border-4 border-gold-400 overflow-hidden bg-black/60 mb-3 flex items-center justify-center shadow-lg">
                  {selectedMatch.participantA?.photo ? (
                    <img
                      src={selectedMatch.participantA.photo}
                      alt={selectedMatch.participantA.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">⚡</span>
                  )}
                </div>

                <div className="text-xl font-black text-white mb-1">
                  {selectedMatch.participantA?.name || 'Peserta Belum Diundi'}
                </div>
                <div className="text-xs text-coffee-300 mb-5">
                  {selectedMatch.participantA?.affiliation || '-'}
                </div>

                <button
                  disabled={!selectedMatch.participantA?.participantId}
                  onClick={() => handleSelectWinner(selectedMatch, 'A')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-coffee-950 font-black text-sm shadow-xl active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  LOLOSKAN SEKARANG (BYPASS KE BABAK BERIKUTNYA)
                </button>
              </div>
            ) : (
              /* Standard 2-Participant Match */
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Brewer A */}
                <div
                  onClick={() => handleSelectWinner(selectedMatch, 'A')}
                  className="cursor-pointer group rounded-2xl bg-[#281911] hover:bg-gold-500/20 border-2 border-coffee-700 hover:border-gold-400 p-5 flex flex-col items-center transition shadow-lg active:scale-95"
                >
                  <div className="w-24 h-24 rounded-full border-4 border-red-500/80 overflow-hidden bg-black/50 mb-3 flex items-center justify-center">
                    {selectedMatch.participantA?.photo ? (
                      <img
                        src={selectedMatch.participantA.photo}
                        alt={selectedMatch.participantA.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">☕</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                    Sudut Merah
                  </div>
                  <div className="text-lg font-black text-white group-hover:text-gold-300 mb-1">
                    {selectedMatch.participantA?.name || 'Slot Kosong'}
                  </div>
                  <div className="text-xs text-coffee-300 mb-3">
                    {selectedMatch.participantA?.affiliation || '-'}
                  </div>

                  <button className="px-5 py-2 rounded-xl bg-gold-500 text-coffee-950 font-black text-xs group-hover:bg-gold-400 transition shadow flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> PILIH PEMENANG
                  </button>
                </div>

                {/* Brewer B */}
                <div
                  onClick={() => handleSelectWinner(selectedMatch, 'B')}
                  className="cursor-pointer group rounded-2xl bg-[#281911] hover:bg-gold-500/20 border-2 border-coffee-700 hover:border-gold-400 p-5 flex flex-col items-center transition shadow-lg active:scale-95"
                >
                  <div className="w-24 h-24 rounded-full border-4 border-blue-500/80 overflow-hidden bg-black/50 mb-3 flex items-center justify-center">
                    {selectedMatch.participantB?.photo ? (
                      <img
                        src={selectedMatch.participantB.photo}
                        alt={selectedMatch.participantB.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">☕</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                    Sudut Biru
                  </div>
                  <div className="text-lg font-black text-white group-hover:text-gold-300 mb-1">
                    {selectedMatch.participantB?.name || 'Slot Kosong'}
                  </div>
                  <div className="text-xs text-coffee-300 mb-3">
                    {selectedMatch.participantB?.affiliation || '-'}
                  </div>

                  <button className="px-5 py-2 rounded-xl bg-gold-500 text-coffee-950 font-black text-xs group-hover:bg-gold-400 transition shadow flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> PILIH PEMENANG
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedMatch(null)}
              className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
            >
              Tutup / Batal
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          GRAND THROWDOWN WINNER SELECTOR MODAL (Juara 1, 2, 3)
      ========================================================================= */}
      {showGrandFinalModal && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1c120c] border-2 border-gold-500 rounded-3xl p-8 max-w-xl w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-gold-500/20 text-gold-400 mb-2">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gold-300">Tentukan Juara 1, 2, dan 3</h3>
              <p className="text-xs text-coffee-300">
                Pilih juara turnamen untuk memicu perayaan Grand Finale di layar TV
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* JUARA 1 */}
              <div>
                <label className="block text-xs font-black text-yellow-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400" /> JUARA 1 (1ST CHAMPION)
                </label>
                <select
                  value={p1WinnerId}
                  onChange={(e) => setP1WinnerId(e.target.value)}
                  className="w-full bg-[#2a1b13] border border-gold-500/70 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Juara 1 --</option>
                  {tournament.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.affiliation || 'Brewer'})
                    </option>
                  ))}
                </select>
              </div>

              {/* JUARA 2 */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  🥈 JUARA 2 (2ND PLACE)
                </label>
                <select
                  value={p2WinnerId}
                  onChange={(e) => setP2WinnerId(e.target.value)}
                  className="w-full bg-[#2a1b13] border border-slate-500/70 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Juara 2 --</option>
                  {tournament.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.affiliation || 'Brewer'})
                    </option>
                  ))}
                </select>
              </div>

              {/* JUARA 3 */}
              <div>
                <label className="block text-xs font-black text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  🥉 JUARA 3 (3RD PLACE)
                </label>
                <select
                  value={p3WinnerId}
                  onChange={(e) => setP3WinnerId(e.target.value)}
                  className="w-full bg-[#2a1b13] border border-amber-600/70 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Juara 3 --</option>
                  {tournament.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.affiliation || 'Brewer'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-coffee-800">
              <button
                onClick={() => setShowGrandFinalModal(false)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveGrandWinners}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-coffee-950 text-xs font-black shadow-lg transition active:scale-95"
              >
                Simpan & Mulai Perayaan Juara 🏆
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          WINNER POPUP GIMMICK MODAL (Per Match Winner Celebration)
      ========================================================================= */}
      <WinnerCelebrationModal
        isOpen={celebrationData.isOpen}
        onClose={() => setCelebrationData((prev) => ({ ...prev, isOpen: false }))}
        winnerName={celebrationData.name}
        winnerAffiliation={celebrationData.affiliation}
        winnerPhoto={celebrationData.photo}
        matchLabel={celebrationData.matchLabel}
        nextStageLabel={celebrationData.nextStageLabel}
      />

      {/* =========================================================================
          GRAND CHAMPION FINALE GIMMICK MODAL (Spectacular Podium + Fireworks)
      ========================================================================= */}
      <GrandChampionModal
        isOpen={showGrandChampionModal}
        onClose={() => setShowGrandChampionModal(false)}
        tournamentTitle={tournament.title}
        firstPlace={tournament.winners?.first}
        secondPlace={tournament.winners?.second}
        thirdPlace={tournament.winners?.third}
      />
    </div>
  );
}
