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
  Flame,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Swords,
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

  // Live Battle Timer state for in-progress match popup
  const [battleSeconds, setBattleSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Auto start and reset timer when selectedMatch opens
  useEffect(() => {
    if (selectedMatch) {
      setBattleSeconds(0);
      setIsTimerRunning(true);
    }
  }, [selectedMatch?.id]);

  useEffect(() => {
    let interval: any;
    if (selectedMatch && isTimerRunning) {
      interval = setInterval(() => {
        setBattleSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [selectedMatch, isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
          LIVE MATCH ARENA MODAL (In-Progress Battle & Winner Selection)
      ========================================================================= */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-b from-[#1e130c] via-[#140c07] to-[#0c0806] border-2 border-gold-500/90 rounded-[2.5rem] p-6 md:p-8 max-w-4xl w-full shadow-[0_0_80px_rgba(234,179,8,0.35)] text-center overflow-hidden">
            {/* Ambient Lighting Gradients */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />

            {/* Top Bar: Live Indicator & Match Duration Stopwatch */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-coffee-800/80 pb-4">
              {/* Pulsing Live Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/90 text-red-200 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-live-pulse">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                {selectedMatch.participantB?.isBye ? 'SLOT BYPASS' : 'LIVE MATCH • SEDANG BERLANGSUNG'}
              </div>

              {/* Stopwatch Timer Widget */}
              {!selectedMatch.participantB?.isBye && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-gold-500/40 text-xs shadow-inner">
                  <Timer className="w-4 h-4 text-gold-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-coffee-300 uppercase tracking-wider">Durasi Sesi:</span>
                  <span className="font-mono font-black text-base text-gold-300 tracking-wider">
                    {formatTimer(battleSeconds)}
                  </span>
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1 rounded-md hover:bg-gold-500/20 text-gold-400 transition"
                    title={isTimerRunning ? 'Jeda Timer' : 'Lanjutkan Timer'}
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setBattleSeconds(0)}
                    className="p-1 rounded-md hover:bg-gold-500/20 text-coffee-400 hover:text-gold-400 transition"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Match Label & Stage Info */}
            <div className="relative z-10 mb-6">
              <h3 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-gold-300 to-amber-400 tracking-tight drop-shadow mb-1">
                {selectedMatch.label}
              </h3>
              <p className="text-xs md:text-sm text-coffee-300 font-medium">
                {selectedMatch.participantB?.isBye
                  ? 'Peserta ini berhak langsung melaju ke babak berikutnya tanpa tanding:'
                  : 'Sesi tanding sedang berlangsung di panggung. Klik nama peserta untuk menentukan pemenang saat penilaian selesai.'}
              </p>
            </div>

            {/* Duel Arena Grid */}
            {selectedMatch.participantB?.isBye ? (
              /* Single Participant Bypass Card */
              <div className="relative z-10 max-w-md mx-auto mb-6 bg-gradient-to-b from-amber-950/70 via-coffee-900 to-coffee-950 border-2 border-gold-400 rounded-3xl p-6 text-center shadow-2xl">
                <div className="w-28 h-28 mx-auto rounded-full border-4 border-gold-400 overflow-hidden bg-black/60 mb-4 flex items-center justify-center shadow-lg">
                  {selectedMatch.participantA?.photo ? (
                    <img
                      src={selectedMatch.participantA.photo}
                      alt={selectedMatch.participantA.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">⚡</span>
                  )}
                </div>

                <div className="text-2xl font-black text-white mb-1">
                  {selectedMatch.participantA?.name || 'Peserta Belum Diundi'}
                </div>
                <div className="text-xs text-coffee-300 mb-6">
                  {selectedMatch.participantA?.affiliation || '-'}
                </div>

                <button
                  disabled={!selectedMatch.participantA?.participantId}
                  onClick={() => handleSelectWinner(selectedMatch, 'A')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-coffee-950 font-black text-sm shadow-xl active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  LOLOSKAN SEKARANG (BYPASS KE BABAK BERIKUTNYA)
                </button>
              </div>
            ) : (
              /* 2-Participant Battle Stage with VS Clash */
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-6">
                {/* Center "VS" Clash Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:flex flex-col items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full border-2 border-gold-400/40 animate-ping pointer-events-none" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-amber-600 border-4 border-[#140c07] text-coffee-950 font-black text-xl flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.85)] animate-vs-glow">
                    VS
                  </div>
                  <div className="mt-1 px-3 py-0.5 rounded-full bg-black/90 border border-gold-500/60 text-[10px] font-black text-gold-300 uppercase tracking-widest shadow">
                    ARENA DUEL
                  </div>
                </div>

                {/* RED CORNER (Sudut Merah) */}
                <div
                  onClick={() => handleSelectWinner(selectedMatch, 'A')}
                  className="cursor-pointer group relative rounded-3xl bg-gradient-to-b from-[#2d120d] via-[#1c0c09] to-[#120705] border-2 border-red-500/80 hover:border-red-400 p-6 flex flex-col items-center transition-all duration-300 shadow-xl active:scale-95 animate-red-corner"
                >
                  {/* Corner Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500 text-red-300 text-xs font-black uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    SUDUT MERAH
                  </div>

                  {/* Avatar with Animated Radar Ping */}
                  <div className="relative mb-4">
                    <div className="absolute -inset-2 rounded-full border-2 border-red-500/60 animate-ping opacity-60 pointer-events-none" />
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-red-500 overflow-hidden bg-black/60 shadow-[0_0_35px_rgba(239,68,68,0.6)] flex items-center justify-center">
                      {selectedMatch.participantA?.photo ? (
                        <img
                          src={selectedMatch.participantA.photo}
                          alt={selectedMatch.participantA.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        />
                      ) : (
                        <span className="text-5xl">☕</span>
                      )}
                    </div>
                    {/* Flame Battle Icon */}
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-2 rounded-full border-2 border-black shadow-lg">
                      <Flame className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>

                  <div className="text-xl md:text-2xl font-black text-white group-hover:text-red-300 transition mb-1 text-center line-clamp-1">
                    {selectedMatch.participantA?.name || 'Slot Kosong'}
                  </div>
                  <div className="text-xs text-coffee-300 mb-5 text-center font-medium line-clamp-1">
                    {selectedMatch.participantA?.affiliation || '-'}
                  </div>

                  {/* Active In-Progress Indicator */}
                  <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-950/70 px-3.5 py-1 rounded-full border border-red-800/80">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Sedang Bertanding
                  </div>

                  {/* Winner Action Button */}
                  <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-xs md:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_30px_rgba(234,179,8,0.8)] group-hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" /> PILIH SEBAGAI PEMENANG
                  </button>
                </div>

                {/* BLUE CORNER (Sudut Biru) */}
                <div
                  onClick={() => handleSelectWinner(selectedMatch, 'B')}
                  className="cursor-pointer group relative rounded-3xl bg-gradient-to-b from-[#0f1d30] via-[#0b1422] to-[#060b14] border-2 border-blue-500/80 hover:border-blue-400 p-6 flex flex-col items-center transition-all duration-300 shadow-xl active:scale-95 animate-blue-corner"
                >
                  {/* Corner Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/90 border border-blue-500 text-blue-300 text-xs font-black uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    SUDUT BIRU
                  </div>

                  {/* Avatar with Animated Radar Ping */}
                  <div className="relative mb-4">
                    <div className="absolute -inset-2 rounded-full border-2 border-blue-500/60 animate-ping opacity-60 pointer-events-none" />
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-blue-500 overflow-hidden bg-black/60 shadow-[0_0_35px_rgba(59,130,246,0.6)] flex items-center justify-center">
                      {selectedMatch.participantB?.photo ? (
                        <img
                          src={selectedMatch.participantB.photo}
                          alt={selectedMatch.participantB.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        />
                      ) : (
                        <span className="text-5xl">☕</span>
                      )}
                    </div>
                    {/* Flame Battle Icon */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full border-2 border-black shadow-lg">
                      <Flame className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>

                  <div className="text-xl md:text-2xl font-black text-white group-hover:text-blue-300 transition mb-1 text-center line-clamp-1">
                    {selectedMatch.participantB?.name || 'Slot Kosong'}
                  </div>
                  <div className="text-xs text-coffee-300 mb-5 text-center font-medium line-clamp-1">
                    {selectedMatch.participantB?.affiliation || '-'}
                  </div>

                  {/* Active In-Progress Indicator */}
                  <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold text-blue-400 bg-blue-950/70 px-3.5 py-1 rounded-full border border-blue-800/80">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Sedang Bertanding
                  </div>

                  {/* Winner Action Button */}
                  <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-xs md:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_30px_rgba(234,179,8,0.8)] group-hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" /> PILIH SEBAGAI PEMENANG
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="relative z-10 pt-2 flex items-center justify-center">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition active:scale-95"
              >
                Kembali ke Bagan Turnamen
              </button>
            </div>
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
