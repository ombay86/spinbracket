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
  Medal,
  UserPlus,
  Edit3,
  X,
  Plus,
  LayoutGrid,
} from 'lucide-react';
import { clientDb, Tournament, Match, Participant } from '@/lib/client-db';
import { WinnerCelebrationModal } from '@/components/WinnerCelebrationModal';
import { GrandChampionModal } from '@/components/GrandChampionModal';
import { showAlert } from '@/lib/sweetalert';
import { useSessionGuard } from '@/hooks/useSessionGuard';

export default function TvBracketPage() {
  const router = useRouter();
  useSessionGuard();
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [viewPreference, setViewPreference] = useState<'auto' | 'bilateral' | 'linear'>('auto');

  // Selected match for adjudication modal
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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

  // Quick Participant Assignment State (Babak 1 & Babak 2)
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotTarget, setSlotTarget] = useState<{ match: Match; slot: 'A' | 'B' } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customAffiliation, setCustomAffiliation] = useState('');
  const [customPhoto, setCustomPhoto] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState('');

  // Drag and Drop Player Reshuffling in Bracket
  const [draggedSlot, setDraggedSlot] = useState<{
    matchId: string;
    slot: 'A' | 'B';
    participant: any;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

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

      // Self-heal: ensure no bypass match was prematurely auto-completed or forwarded to next rounds
      let hasChanges = false;
      const updatedMatches = { ...t.matches };

      Object.values(updatedMatches).forEach((m) => {
        // If a match is flagged with isBye or was a bypass match, but user never manually confirmed a winner
        // or it was auto-completed by the legacy generator
        if (m.participantB?.isBye) {
          // If match was auto-completed without opponent and has a next match where participantA was auto-copied
          if (m.status === 'completed' && m.winnerId === m.participantA?.participantId) {
            // Check if user has not actually selected a winner (still only 1 participant and opponent isBye)
            // Reset to pending / ready so operator can select winner or fill opponent
            m.status = 'ready';
            m.winnerId = null;
            hasChanges = true;

            // Also remove prematurely forwarded participant from next match if next match has not completed
            if (m.nextMatchId && updatedMatches[m.nextMatchId]) {
              const nextM = { ...updatedMatches[m.nextMatchId] };
              if (nextM.status !== 'completed') {
                if (m.nextMatchSlot === 'A' && nextM.participantA?.participantId === m.participantA?.participantId) {
                  nextM.participantA = null;
                  hasChanges = true;
                } else if (m.nextMatchSlot === 'B' && nextM.participantB?.participantId === m.participantA?.participantId) {
                  nextM.participantB = null;
                  hasChanges = true;
                }
                updatedMatches[m.nextMatchId] = nextM;
              }
            }
          }
        }
      });

      if (hasChanges) {
        t.matches = updatedMatches;
        clientDb.saveTournament(t);
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

    // Async fetch fresh from Jurnal Ombay master database
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
    const loserData = winnerSlot === 'A' ? match.participantB : match.participantA;

    if (!winnerData || !winnerData.participantId) return;

    // SweetAlert confirmation for operators to prevent accidental clicks
    if (match.participantB?.isBye) {
      const confirmed = await showAlert.confirm({
        title: 'Loloskan Bypass?',
        text: `Peserta "${winnerData.name}" akan langsung diloloskan ke babak berikutnya karena mendapatkan slot bypass.`,
        confirmText: 'Ya, Loloskan',
        cancelText: 'Batal',
        icon: 'question',
      });
      if (!confirmed) return;
    } else {
      const confirmed = await showAlert.confirmWinner({
        winnerName: winnerData.name || 'Brewer',
        corner: winnerSlot,
        matchLabel: match.label,
        affiliation: winnerData.affiliation,
        photo: winnerData.photo,
      });
      if (!confirmed) return;
    }

    const updatedMatches = { ...tournament.matches };
    const matchCopy = { ...updatedMatches[match.id] };
    matchCopy.winnerId = winnerData.participantId;
    matchCopy.status = 'completed';
    updatedMatches[match.id] = matchCopy;

    let nextStageLabel = '';

    // 1. Forward WINNER to nextMatchId
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

    // 2. Forward LOSER to loserMatchId (for 3rd place playoff)
    if (match.loserMatchId && updatedMatches[match.loserMatchId] && loserData?.participantId) {
      const loserM = { ...updatedMatches[match.loserMatchId] };
      const lSlot = match.loserMatchSlot || 'A';
      const forwardedLoserSlot = {
        participantId: loserData.participantId,
        name: loserData.name,
        affiliation: loserData.affiliation,
        photo: loserData.photo,
      };

      if (lSlot === 'A') {
        loserM.participantA = forwardedLoserSlot;
      } else {
        loserM.participantB = forwardedLoserSlot;
      }

      if (loserM.participantA?.participantId && loserM.participantB?.participantId) {
        loserM.status = 'ready';
      }
      updatedMatches[match.loserMatchId] = loserM;
    }

    // 3. Check if Grand Final or 3rd Place Match was decided
    const updatedWinners = { ...(tournament.winners || {}) };
    const isGrandFinalMatch = match.id.includes('grand_final') || match.label.toLowerCase().includes('grand final');
    const isThirdPlaceMatch = match.id.includes('third_place') || match.label.toLowerCase().includes('juara 3');

    if (isGrandFinalMatch) {
      updatedWinners.first = {
        id: winnerData.participantId,
        name: winnerData.name || 'Juara 1',
        affiliation: winnerData.affiliation,
        photo: winnerData.photo,
      };
      if (loserData?.participantId) {
        updatedWinners.second = {
          id: loserData.participantId,
          name: loserData.name || 'Juara 2',
          affiliation: loserData.affiliation,
          photo: loserData.photo,
        };
      }
    }

    if (isThirdPlaceMatch) {
      updatedWinners.third = {
        id: winnerData.participantId,
        name: winnerData.name || 'Juara 3',
        affiliation: winnerData.affiliation,
        photo: winnerData.photo,
      };
    }

    const isAllWinnersDecided = !!updatedWinners.first && !!updatedWinners.second && !!updatedWinners.third;

    // Save to local storage
    try {
      const updatedTournament: Tournament = {
        ...tournament,
        matches: updatedMatches,
        winners: updatedWinners,
        status: isAllWinnersDecided ? 'completed' : 'in_progress',
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

      // If Grand Final Winner decided, celebrate champion!
      if (isGrandFinalMatch) {
        setTimeout(() => {
          setShowGrandChampionModal(true);
        }, 3200);
      }
    }
  };

  const handleOpenSlotAssign = (match: Match, slot: 'A' | 'B', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSlotTarget({ match, slot });
    const current = slot === 'A' ? match.participantA : match.participantB;
    setCustomName(current?.name && !current.isBye ? current.name : '');
    setCustomAffiliation(current?.affiliation || '');
    setCustomPhoto(current?.photo || '');
    setSelectedExistingId(current?.participantId || '');
    setShowSlotModal(true);
  };

  const handleSaveSlotParticipant = async () => {
    if (!tournament || !slotTarget) return;
    const { match, slot } = slotTarget;

    let participantId = selectedExistingId;
    let participantName = customName.trim();
    let participantAff = customAffiliation.trim();
    let participantPhoto = customPhoto.trim();

    // If an existing registered participant is picked, allow updating their name/affiliation if user edited the input
    if (selectedExistingId && selectedExistingId !== 'NEW') {
      const existing = tournament.participants.find((p) => p.id === selectedExistingId);
      if (existing) {
        // If user changed the name or affiliation, update in tournament list
        existing.name = participantName;
        existing.affiliation = participantAff;
        participantPhoto = existing.photo || customPhoto.trim();
      }
    }

    if (!participantName) {
      showAlert.warning('Data Belum Lengkap', 'Silakan masukkan nama peserta.');
      return;
    }

    const updatedParticipants = [...(tournament.participants || [])];

    // If brand new participant, create & append to tournament participants list
    if (!selectedExistingId || selectedExistingId === 'NEW') {
      participantId = `p_quick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      updatedParticipants.push({
        id: participantId,
        name: participantName,
        affiliation: participantAff,
        photo: participantPhoto,
        seed: updatedParticipants.length + 1,
      });
    }

    const updatedMatches = { ...tournament.matches };
    const targetMatch = { ...updatedMatches[match.id] };

    const newSlotData = {
      participantId,
      name: participantName,
      affiliation: participantAff,
      photo: participantPhoto,
      isBye: false,
    };

    if (slot === 'A') {
      targetMatch.participantA = newSlotData;
    } else {
      targetMatch.participantB = newSlotData;
    }

    // Update match status
    if (targetMatch.participantA?.participantId && targetMatch.participantB?.participantId) {
      if (targetMatch.status !== 'completed') {
        targetMatch.status = 'ready';
      }
    }

    updatedMatches[match.id] = targetMatch;

    const updatedTournament: Tournament = {
      ...tournament,
      participants: updatedParticipants,
      matches: updatedMatches,
      updatedAt: new Date().toISOString(),
    };

    clientDb.saveTournament(updatedTournament);
    setTournament(updatedTournament);

    // If the modal was currently open for this match, refresh selectedMatch
    if (selectedMatch && selectedMatch.id === match.id) {
      setSelectedMatch(targetMatch);
    }

    setShowSlotModal(false);
    showAlert.success('Peserta Disimpan!', `Slot ${slot === 'A' ? 'Merah' : 'Biru'} pada ${match.label} berhasil diperbarui.`, 1500);
  };

  // Option: Loloskan Langsung (Bypass / Walkover) ke babak berikutnya
  const handleBypassPass = async (match: Match) => {
    if (!match.participantA?.participantId) {
      showAlert.warning('Peserta Belum Ada', 'Slot Sudut Merah harus diisi terlebih dahulu sebelum diloloskan.');
      return;
    }

    const confirmed = await showAlert.confirm({
      title: 'Loloskan Pemain (Bypass)?',
      text: `Peserta "${match.participantA.name}" akan langsung lolos ke babak berikutnya tanpa harus bertanding.`,
      confirmText: 'Ya, Loloskan Pemain',
      cancelText: 'Batal',
      icon: 'question',
    });
    if (!confirmed) return;

    setShowSlotModal(false);
    await handleSelectWinner(match, 'A');
  };

  // Option: Acak / Shuffle Lawan dari Peserta yang Kalah Sebelumnya
  const handleShuffleDefeatedOpponent = (match: Match, slot: 'A' | 'B') => {
    if (!tournament) return;

    // Collect all defeated participants from completed matches
    const defeatedMap = new Map<string, Participant>();
    Object.values(tournament.matches || {}).forEach((m) => {
      if (m.status === 'completed' && m.winnerId) {
        const loser = m.winnerId === m.participantA?.participantId ? m.participantB : m.participantA;
        if (loser && loser.participantId && !loser.isBye) {
          defeatedMap.set(loser.participantId, {
            id: loser.participantId,
            name: loser.name || 'Peserta',
            affiliation: loser.affiliation || '',
            photo: loser.photo || '',
          });
        }
      }
    });

    const defeatedList = Array.from(defeatedMap.values());
    if (defeatedList.length === 0) {
      showAlert.warning('Belum Ada Peserta yang Kalah', 'Belum ada pertandingan sebelumnya yang selesai dengan peserta kalah untuk diundi ulang.');
      return;
    }

    // Pick random loser
    const randomLoser = defeatedList[Math.floor(Math.random() * defeatedList.length)];
    setSelectedExistingId(randomLoser.id);
    setCustomName(randomLoser.name);
    setCustomAffiliation(randomLoser.affiliation || '');
    setCustomPhoto(randomLoser.photo || '');

    showAlert.success('Lawan Terpilih Acak!', `🥊 Terpilih: ${randomLoser.name} (${randomLoser.affiliation || 'Peserta Kalah'}). Silakan klik "Simpan ke Bagan".`, 2000);
  };

  // Check if round 1 can still add participants (active if round 1 not completed, or odd players remain)
  const canAddParticipantInRound = (rIndex: number): boolean => {
    if (!tournament) return false;
    const r = tournament.rounds[rIndex];
    if (!r) return false;

    // If this round is not completed yet, allowed!
    const roundDone = isRoundCompleted(rIndex);
    if (!roundDone) return true;

    // If completed, only allowed if total active players or remaining is odd
    const activeParticipants = tournament.participants.length;
    return activeParticipants % 2 !== 0;
  };

  // Drag and drop reshuffle on TV bracket
  const handleDropOnTvSlot = (targetMatchId: string, targetSlot: 'A' | 'B') => {
    if (!draggedSlot || !tournament) return;

    const sourceMatchId = draggedSlot.matchId;
    const sourceSlot = draggedSlot.slot;

    // Same slot
    if (sourceMatchId === targetMatchId && sourceSlot === targetSlot) {
      setDraggedSlot(null);
      setDragOverTarget(null);
      return;
    }

    const updatedMatches = { ...tournament.matches };
    const destMatch = { ...updatedMatches[targetMatchId] };
    const srcMatch = sourceMatchId === targetMatchId ? destMatch : { ...updatedMatches[sourceMatchId] };

    // Don't allow reshuffling completed matches
    if (destMatch.status === 'completed' || srcMatch.status === 'completed') {
      showAlert.warning('Tidak Dapat Ditukar', 'Pertandingan yang sudah selesai tidak dapat ditukar posisinya.');
      setDraggedSlot(null);
      setDragOverTarget(null);
      return;
    }

    const currentDestSlot = targetSlot === 'A' ? destMatch.participantA : destMatch.participantB;
    const currentSrcSlot = sourceSlot === 'A' ? srcMatch.participantA : srcMatch.participantB;

    // Swap slots
    if (targetSlot === 'A') {
      destMatch.participantA = currentSrcSlot ? { ...currentSrcSlot } : null;
    } else {
      destMatch.participantB = currentSrcSlot ? { ...currentSrcSlot } : null;
    }

    if (sourceSlot === 'A') {
      srcMatch.participantA = currentDestSlot ? { ...currentDestSlot } : null;
    } else {
      srcMatch.participantB = currentDestSlot ? { ...currentDestSlot } : null;
    }

    // Update readiness
    destMatch.status = destMatch.participantA?.participantId && destMatch.participantB?.participantId ? 'ready' : 'pending';
    srcMatch.status = srcMatch.participantA?.participantId && srcMatch.participantB?.participantId ? 'ready' : 'pending';

    updatedMatches[targetMatchId] = destMatch;
    if (sourceMatchId !== targetMatchId) {
      updatedMatches[sourceMatchId] = srcMatch;
    }

    const updatedTournament: Tournament = {
      ...tournament,
      matches: updatedMatches,
      updatedAt: new Date().toISOString(),
    };

    clientDb.saveTournament(updatedTournament);
    setTournament(updatedTournament);
    showAlert.success('Posisi Pemain Ditukar!', `Pemain berhasil dipindahkan ke ${destMatch.label} (Slot ${targetSlot}).`, 1500);

    setDraggedSlot(null);
    setDragOverTarget(null);
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

  // Dynamically detect Quarterfinal (Babak 4 Besar), Semifinal, and Final rounds
  const totalRounds = tournament.rounds.length;
  const qfRoundIndex = totalRounds >= 3 ? totalRounds - 3 : -1;
  const semiRoundIndex = totalRounds >= 2 ? totalRounds - 2 : -1;
  const finalRoundIndex = totalRounds >= 1 ? totalRounds - 1 : -1;

  // Have we entered the 4-besar / QF stage?
  const hasEnteredQfStage =
    qfRoundIndex >= 0 &&
    (
      // Either all prior rounds (before QF) are completed
      (qfRoundIndex === 0 || Array.from({ length: qfRoundIndex }).every((_, idx) => isRoundCompleted(idx))) ||
      // Or any match from QF onwards has a winner or is completed
      tournament.rounds.slice(qfRoundIndex).some((r) =>
        r.matchIds.some((m) => !!tournament.matches[m]?.winnerId || tournament.matches[m]?.status === 'completed')
      )
    );

  const isBilateralView =
    viewPreference === 'bilateral'
      ? true
      : viewPreference === 'linear'
      ? false
      : hasEnteredQfStage && totalRounds >= 3;

  // Linear visible rounds (for before QF or when in Linear Mode)
  const isQuarterFinalOrLater = (rIndex: number) => {
    if (totalRounds >= 3 && rIndex >= totalRounds - 3) return true;
    return false;
  };

  const visibleRounds = tournament.rounds.filter((r, idx) => {
    if (isFullView) return true;
    if (isQuarterFinalOrLater(idx)) return true;
    return !isRoundCompleted(idx);
  });

  const displayedRounds = visibleRounds.length > 0 ? visibleRounds : tournament.rounds;
  const hiddenCount = tournament.rounds.length - displayedRounds.length;

  // Rounds partition for Bilateral Wing View
  const roundBabak3 = qfRoundIndex >= 0 ? tournament.rounds[qfRoundIndex] : null;
  const roundSemi = semiRoundIndex >= 0 ? tournament.rounds[semiRoundIndex] : null;
  const roundFinal = finalRoundIndex >= 0 ? tournament.rounds[finalRoundIndex] : null;

  const b3MatchIds = roundBabak3?.matchIds || [];
  const b3LeftIds = b3MatchIds.slice(0, Math.ceil(b3MatchIds.length / 2));
  const b3RightIds = b3MatchIds.slice(Math.ceil(b3MatchIds.length / 2));

  const semiLeftId = roundSemi?.matchIds[0];
  const semiRightId = roundSemi?.matchIds[1];

  const grandFinalMatch = roundFinal && roundFinal.matchIds.length > 0 ? tournament.matches[roundFinal.matchIds[0]] : null;
  const thirdPlaceMatch = roundFinal && roundFinal.matchIds.length > 1 ? tournament.matches[roundFinal.matchIds[1]] : null;

  // Helper to dynamically calculate consecutive Battle number for any match (including previously labelled bypass matches)
  const getMatchDisplayLabel = (match: Match): string => {
    if (!tournament) return match.label;
    if (match.label && !match.label.toLowerCase().includes('bypass') && !match.label.toLowerCase().includes('bye')) {
      return match.label;
    }

    // If label is "BYPASS", calculate its sequential battle position
    let count = 0;
    for (const r of tournament.rounds) {
      for (const mId of r.matchIds) {
        count++;
        if (mId === match.id) {
          return `Battle ${count}`;
        }
      }
    }
    return match.label;
  };

  // Render a standard or prominent match card
  const renderMatchCard = (match: Match | undefined, variant: 'normal' | 'prominent' = 'normal') => {
    if (!match) return null;

    const isCompleted = match.status === 'completed' && !!match.winnerId;
    const isBye = match.participantB?.isBye;
    const isProminent = variant === 'prominent';
    const displayLabel = getMatchDisplayLabel(match);

    const hasSlotA = !!match.participantA?.participantId;
    const hasSlotB = !!match.participantB?.participantId && !match.participantB?.isBye;

    return (
      <div
        key={match.id}
        onClick={() => setSelectedMatch(match)}
        className={`cursor-pointer shrink-0 flex flex-col justify-center transition hover:scale-[1.01] p-3 rounded-2xl ${
          isProminent ? 'border-2 shadow-lg' : 'border'
        } ${
          isCompleted
            ? 'bg-[#1e130c] border-gold-500/80 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
            : hasSlotA && (hasSlotB || isBye)
            ? 'bg-[#241710] border-coffee-700 hover:border-gold-400 shadow-md'
            : 'bg-[#140d09] border-coffee-900/80 text-coffee-600'
        }`}
      >
        <div className="flex items-center justify-between text-gold-400 mb-1.5 text-xs font-black">
          <span className="truncate">{displayLabel}</span>
          {isCompleted ? (
            <Check className="text-emerald-400 w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="text-coffee-500 w-3.5 h-3.5 shrink-0" />
          )}
        </div>

        {/* Participant A */}
        <div
          onDragOver={(e) => {
            if (!isCompleted) {
              e.preventDefault();
              setDragOverTarget(`${match.id}-A`);
            }
          }}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnTvSlot(match.id, 'A');
          }}
          draggable={hasSlotA && !isCompleted}
          onDragStart={(e) => {
            if (hasSlotA && !isCompleted && match.participantA) {
              e.stopPropagation();
              setDraggedSlot({
                matchId: match.id,
                slot: 'A',
                participant: match.participantA,
              });
            }
          }}
          onDragEnd={() => {
            setDraggedSlot(null);
            setDragOverTarget(null);
          }}
          className={`flex items-center justify-between mb-1 px-3 py-1.5 rounded-xl group/slot relative transition ${
            dragOverTarget === `${match.id}-A`
              ? 'bg-gold-500/40 border-2 border-gold-400 scale-[1.02] shadow-[0_0_12px_rgba(234,179,8,0.5)]'
              : match.winnerId === match.participantA?.participantId
              ? 'bg-gold-500 text-coffee-950 font-black shadow-md'
              : hasSlotA
              ? 'bg-black/50 text-white hover:border-gold-500/50 cursor-grab active:cursor-grabbing'
              : 'bg-black/25 text-coffee-500/60 border border-dashed border-coffee-800/40'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                hasSlotA ? 'bg-red-400' : 'bg-red-900/40'
              }`}
            />
            <span
              className={`truncate text-sm md:text-base ${
                hasSlotA ? 'font-black text-white' : 'font-normal italic text-coffee-500/70 text-xs md:text-sm'
              }`}
            >
              {match.participantA?.name || (dragOverTarget === `${match.id}-A` ? 'Tukar ke sini' : 'Slot Kosong')}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {match.winnerId === match.participantA?.participantId && (
              <Award className="w-3.5 h-3.5 text-coffee-950" />
            )}
            {!isCompleted && match.roundIndex <= 1 && (
              <button
                type="button"
                onClick={(e) => handleOpenSlotAssign(match, 'A', e)}
                className="opacity-60 hover:opacity-100 p-1 rounded-md bg-white/10 hover:bg-gold-500 hover:text-coffee-950 text-gold-300 transition"
                title={hasSlotA ? 'Edit Nama / Ganti Peserta' : 'Tambah Peserta'}
              >
                {hasSlotA ? <Edit3 className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Participant B */}
        <div
          onDragOver={(e) => {
            if (!isCompleted) {
              e.preventDefault();
              setDragOverTarget(`${match.id}-B`);
            }
          }}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnTvSlot(match.id, 'B');
          }}
          draggable={hasSlotB && !isCompleted}
          onDragStart={(e) => {
            if (hasSlotB && !isCompleted && match.participantB) {
              e.stopPropagation();
              setDraggedSlot({
                matchId: match.id,
                slot: 'B',
                participant: match.participantB,
              });
            }
          }}
          onDragEnd={() => {
            setDraggedSlot(null);
            setDragOverTarget(null);
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-xl group/slot relative transition ${
            dragOverTarget === `${match.id}-B`
              ? 'bg-gold-500/40 border-2 border-gold-400 scale-[1.02] shadow-[0_0_12px_rgba(234,179,8,0.5)]'
              : match.winnerId === match.participantB?.participantId
              ? 'bg-gold-500 text-coffee-950 font-black shadow-md'
              : hasSlotB
              ? 'bg-black/50 text-white hover:border-gold-500/50 cursor-grab active:cursor-grabbing'
              : isBye
              ? 'bg-black/25 text-coffee-400/80 border border-dashed border-coffee-700/50'
              : 'bg-black/25 text-coffee-500/60 border border-dashed border-coffee-800/40'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                hasSlotB || isBye ? 'bg-blue-400' : 'bg-blue-900/40'
              }`}
            />
            <span
              className={`truncate ${
                hasSlotB
                  ? 'font-black text-white text-sm md:text-base'
                  : isBye
                  ? 'font-medium text-coffee-400/90 text-xs md:text-sm'
                  : 'font-normal italic text-coffee-500/70 text-xs md:text-sm'
              }`}
            >
              {isBye
                ? '➕ Isi Lawan (Adu Lagi)'
                : match.participantB?.name || (dragOverTarget === `${match.id}-B` ? 'Tukar ke sini' : 'Slot Kosong')}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {match.winnerId === match.participantB?.participantId && (
              <Award className="w-3.5 h-3.5 text-coffee-950" />
            )}
            {!isCompleted && match.roundIndex <= 1 && (
              <button
                type="button"
                onClick={(e) => handleOpenSlotAssign(match, 'B', e)}
                className="opacity-70 hover:opacity-100 p-1 rounded-md bg-white/10 hover:bg-gold-500 hover:text-coffee-950 text-gold-300 transition"
                title={hasSlotB ? 'Edit Nama / Ganti Peserta' : 'Tambah Peserta Lawan'}
              >
                {hasSlotB ? <Edit3 className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-[#140d09] via-[#0d0806] to-[#070403] text-white flex flex-col justify-between p-3 md:p-5 overflow-hidden select-none">
      {/* =========================================================================
          TOP HEADER BAR (Full Width Edge-to-Edge)
      ========================================================================= */}
      <header className="w-full flex items-center justify-between pb-3 border-b-2 border-gold-500/40">
        {/* Left Brand Badge */}
        <div className="flex items-center gap-3 bg-[#1e130c] border border-gold-500/50 rounded-2xl px-4 py-2 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400">
            <Trophy className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <div className="text-lg md:text-xl font-black tracking-tight text-white uppercase truncate max-w-sm">
              {tournament.title}
            </div>
            <div className="text-[11px] text-gold-300 font-bold tracking-widest uppercase">
              {tournament.subtitle || 'SPINBRACKET TOURNAMENT ARENA'}
            </div>
          </div>
        </div>

        {/* Center Stage Info */}
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-gold-400 to-amber-500 uppercase">
            BAGAN TURNAMEN ({tournament.participants?.length || 0} PESERTA)
          </h1>
          <p className="text-xs text-coffee-300 font-semibold tracking-wider mt-0.5">
            {tournament.location} &nbsp;|&nbsp; {tournament.date}
          </p>
        </div>

        {/* Right Action & TV Controls */}
        <div className="flex items-center gap-2.5">
          {/* Primary View Toggle: Mode Panggung Piala vs Mode Bagan Kolom */}
          <button
            onClick={() => setViewPreference(isBilateralView ? 'linear' : 'bilateral')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition shadow ${
              isBilateralView
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-coffee-950 border-yellow-400 font-black shadow-[0_0_15px_rgba(234,179,8,0.4)] hover:brightness-110 active:scale-95'
                : 'bg-[#2a1a12] border-gold-500/40 text-gold-300 hover:bg-[#382318] active:scale-95'
            }`}
            title={isBilateralView ? 'Beralih ke Bagan Kolom Linier' : 'Beralih ke Panggung Piala Simetris'}
          >
            {isBilateralView ? (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Mode Bagan Kolom</span>
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Mode Panggung Piala</span>
              </>
            )}
          </button>

          {/* Secondary Toggle: Full View (only active in linear column mode) */}
          {!isBilateralView && (
            <button
              onClick={() => setIsFullView((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition shadow ${
                isFullView
                  ? 'bg-gold-500 text-coffee-950 border-gold-400 font-black'
                  : 'bg-[#2a1a12] border-gold-500/40 text-gold-300 hover:bg-[#382318]'
              }`}
              title={isFullView ? 'Sembunyikan Babak Selesai' : 'Tampilkan Semua Kolom Lengkap'}
            >
              {isFullView ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{isFullView ? 'Fokus Aktif' : `Semua Kolom ${hiddenCount > 0 ? `(+${hiddenCount})` : ''}`}</span>
            </button>
          )}

          {tournament.winners?.first && (
            <button
              onClick={handleOpenGrandFinale}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-coffee-950 font-black text-xs shadow-[0_0_15px_rgba(234,179,8,0.5)] active:scale-95 transition"
            >
              <Crown className="w-4 h-4" />
              PODIUM JUARA
            </button>
          )}

          <Link
            href={`/tournament/${tournamentId}/wheel`}
            className="p-2.5 rounded-xl bg-[#1e130c] hover:bg-[#2e1d13] border border-coffee-700 text-coffee-300 hover:text-white transition"
            title="Spinwheel Player Shuffler"
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
          MAIN ARENA DISPLAY (Dynamic Bilateral Stage OR Full-Width Column Grid)
      ========================================================================= */}
      {isBilateralView ? (
        /* =======================================================================
           BILATERAL WING ARENA (Sayap Kiri - Piala Emas Tengah - Sayap Kanan)
        ======================================================================= */
        <div className="flex-1 w-full grid grid-cols-12 gap-3.5 items-stretch my-2 overflow-hidden">
          {/* SAYAP KIRI (Cols 1-4) */}
          <div className="col-span-4 flex items-stretch gap-3 h-full">
            {/* Column 1: Babak Perempat Final Kiri */}
            <div className="flex-1 flex flex-col h-full bg-[#160e0a]/90 rounded-2xl border border-coffee-800 p-2.5 shadow-xl">
              <div className="text-center bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-coffee-950 uppercase py-2 px-2 rounded-xl mb-2 font-black text-xs md:text-sm shadow">
                <div>{roundBabak3?.name ? `${roundBabak3.name} (KIRI)` : 'BABAK KIRI'}</div>
                <div className="text-[10px] text-coffee-950/80 font-bold">
                  {b3LeftIds.length > 0 ? `${b3LeftIds.length} BATTLE • PEREMPAT FINAL` : 'PEREMPAT FINAL'}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-around gap-2 overflow-y-auto pr-1 column-scrollbar">
                {b3LeftIds.map((mId) => renderMatchCard(tournament.matches[mId], 'normal'))}
              </div>
            </div>

            {/* Column 2: Semifinal Kiri */}
            <div className="flex-1 flex flex-col h-full bg-[#180f0a]/90 rounded-2xl border border-gold-500/40 p-2.5 shadow-xl">
              <div className="text-center bg-gradient-to-r from-gold-500 via-amber-400 to-gold-600 text-coffee-950 uppercase py-2 px-2 rounded-xl mb-2 font-black text-xs md:text-sm shadow">
                <div>SEMIFINAL 1</div>
                <div className="text-[10px] text-coffee-950/80 font-bold">
                  {semiLeftId && tournament.matches[semiLeftId]
                    ? getMatchDisplayLabel(tournament.matches[semiLeftId]).toUpperCase()
                    : 'SEMIFINAL 1'}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto pr-1 column-scrollbar">
                {semiLeftId && renderMatchCard(tournament.matches[semiLeftId], 'prominent')}
              </div>
            </div>
          </div>

          {/* PANGGUNG UTAMA & PIALA EMAS (Cols 5-8: Centerpiece) */}
          <div className="col-span-4 flex flex-col justify-between h-full bg-gradient-to-b from-[#25150b] via-[#1a0e07] to-[#0f0703] rounded-3xl border-2 border-gold-500/80 p-4 shadow-[0_0_60px_rgba(234,179,8,0.35)] relative overflow-hidden">
            {/* Ambient Radial Golden Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.2)_0%,transparent_75%)] pointer-events-none" />

            {/* Grand Golden Trophy Illustration */}
            <div className="relative z-10 flex flex-col items-center justify-center pt-1 pb-2">
              <div className="flex items-center justify-center">
                <span className="text-3xl md:text-4xl text-gold-400/60 select-none">🌿</span>
                <div className="relative mx-3">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 p-1 shadow-[0_0_40px_rgba(234,179,8,0.7)] flex items-center justify-center animate-vs-glow">
                    <div className="w-full h-full rounded-full bg-[#160c07] flex items-center justify-center">
                      <Trophy className="w-12 h-12 md:w-14 md:h-14 text-yellow-300 drop-shadow-[0_0_15px_rgba(234,179,8,0.9)] animate-crown" />
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1 animate-spin" />
                </div>
                <span className="text-3xl md:text-4xl text-gold-400/60 select-none scale-x-[-1]">🌿</span>
              </div>

              <div className="mt-1 text-center">
                <div className="inline-block px-4 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-coffee-950 font-black text-[11px] md:text-xs tracking-widest uppercase shadow">
                  CHAMPIONSHIP STAGE • ROAD TO THE THRONE
                </div>
              </div>
            </div>

            {/* The Final Battles: Grand Final & Perebutan Juara 3 */}
            <div className="relative z-10 flex-1 flex flex-col justify-around gap-2.5 my-1">
              {/* 1. GRAND FINAL CARD (Juara 1 & 2) */}
              {grandFinalMatch && (
                <div
                  onClick={() => setSelectedMatch(grandFinalMatch)}
                  className={`cursor-pointer rounded-2xl border-2 p-3.5 transition hover:scale-[1.01] shadow-xl ${
                    grandFinalMatch.status === 'completed'
                      ? 'bg-gradient-to-r from-[#2e1d0f] to-[#201309] border-gold-400 shadow-[0_0_25px_rgba(234,179,8,0.5)]'
                      : grandFinalMatch.participantA?.participantId && grandFinalMatch.participantB?.participantId
                      ? 'bg-gradient-to-r from-[#2c1a0e] via-[#22140a] to-[#2c1a0e] border-gold-500 hover:border-gold-300 animate-vs-glow'
                      : 'bg-[#180f0a] border-coffee-800 text-coffee-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gold-500/30">
                    <div className="flex items-center gap-1.5 text-xs md:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-gold-400">
                      <Crown className="w-4 h-4 text-gold-400" />
                      <span>GRAND FINAL • PEREBUTAN JUARA 1 & 2</span>
                    </div>
                    {grandFinalMatch.status === 'completed' ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-black">SELESAI</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gold-300">KLIK UNTUK TANDING</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    {/* Finalis A */}
                    <div
                      className={`p-2 rounded-xl flex flex-col items-center justify-center ${
                        grandFinalMatch.winnerId === grandFinalMatch.participantA?.participantId
                          ? 'bg-gold-500 text-coffee-950 font-black shadow-lg'
                          : 'bg-black/50 text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-red-400 uppercase">SUDUT MERAH</span>
                      <span className="text-xs md:text-sm font-black truncate max-w-full">
                        {grandFinalMatch.participantA?.name ||
                          (semiLeftId && tournament.matches[semiLeftId]
                            ? `Pemenang ${getMatchDisplayLabel(tournament.matches[semiLeftId])}`
                            : 'Pemenang Semifinal 1')}
                      </span>
                      {grandFinalMatch.winnerId === grandFinalMatch.participantA?.participantId && (
                        <span className="text-[10px] mt-0.5 font-black uppercase text-coffee-950">🏆 JUARA 1</span>
                      )}
                      {grandFinalMatch.winnerId === grandFinalMatch.participantB?.participantId && (
                        <span className="text-[10px] mt-0.5 font-bold uppercase text-coffee-400">🥈 JUARA 2</span>
                      )}
                    </div>

                    {/* Finalis B */}
                    <div
                      className={`p-2 rounded-xl flex flex-col items-center justify-center ${
                        grandFinalMatch.winnerId === grandFinalMatch.participantB?.participantId
                          ? 'bg-gold-500 text-coffee-950 font-black shadow-lg'
                          : 'bg-black/50 text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-blue-400 uppercase">SUDUT BIRU</span>
                      <span className="text-xs md:text-sm font-black truncate max-w-full">
                        {grandFinalMatch.participantB?.name ||
                          (semiRightId && tournament.matches[semiRightId]
                            ? `Pemenang ${getMatchDisplayLabel(tournament.matches[semiRightId])}`
                            : 'Pemenang Semifinal 2')}
                      </span>
                      {grandFinalMatch.winnerId === grandFinalMatch.participantB?.participantId && (
                        <span className="text-[10px] mt-0.5 font-black uppercase text-coffee-950">🏆 JUARA 1</span>
                      )}
                      {grandFinalMatch.winnerId === grandFinalMatch.participantA?.participantId && (
                        <span className="text-[10px] mt-0.5 font-bold uppercase text-coffee-400">🥈 JUARA 2</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PEREBUTAN JUARA 3 CARD */}
              {thirdPlaceMatch && (
                <div
                  onClick={() => setSelectedMatch(thirdPlaceMatch)}
                  className={`cursor-pointer rounded-2xl border-2 p-3 transition hover:scale-[1.01] shadow-lg ${
                    thirdPlaceMatch.status === 'completed'
                      ? 'bg-gradient-to-r from-[#24150d] to-[#180e08] border-amber-500/90 shadow-[0_0_20px_rgba(217,119,6,0.4)]'
                      : thirdPlaceMatch.participantA?.participantId && thirdPlaceMatch.participantB?.participantId
                      ? 'bg-gradient-to-r from-[#201309] to-[#160c06] border-amber-600/80 hover:border-amber-400'
                      : 'bg-[#150d08] border-coffee-900 text-coffee-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-amber-600/30">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                      <Medal className="w-3.5 h-3.5 text-amber-400" />
                      <span>PEREBUTAN JUARA 3 (BRONZE MATCH)</span>
                    </div>
                    {thirdPlaceMatch.status === 'completed' ? (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-black">SELESAI</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400">KLIK UNTUK TANDING</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div
                      className={`p-1.5 rounded-xl flex flex-col items-center justify-center ${
                        thirdPlaceMatch.winnerId === thirdPlaceMatch.participantA?.participantId
                          ? 'bg-amber-500 text-coffee-950 font-black shadow-md'
                          : 'bg-black/50 text-white'
                      }`}
                    >
                      <span className="text-[9px] font-bold text-red-400 uppercase">
                        {semiLeftId && tournament.matches[semiLeftId]
                          ? `KALAH ${getMatchDisplayLabel(tournament.matches[semiLeftId]).toUpperCase()}`
                          : 'KALAH SEMIFINAL 1'}
                      </span>
                      <span className="text-xs font-black truncate max-w-full">
                        {thirdPlaceMatch.participantA?.name ||
                          (semiLeftId && tournament.matches[semiLeftId]
                            ? `Kalah ${getMatchDisplayLabel(tournament.matches[semiLeftId])}`
                            : 'Kalah Semifinal 1')}
                      </span>
                      {thirdPlaceMatch.winnerId === thirdPlaceMatch.participantA?.participantId && (
                        <span className="text-[9px] mt-0.5 font-black uppercase text-coffee-950">🥉 JUARA 3</span>
                      )}
                    </div>

                    <div
                      className={`p-1.5 rounded-xl flex flex-col items-center justify-center ${
                        thirdPlaceMatch.winnerId === thirdPlaceMatch.participantB?.participantId
                          ? 'bg-amber-500 text-coffee-950 font-black shadow-md'
                          : 'bg-black/50 text-white'
                      }`}
                    >
                      <span className="text-[9px] font-bold text-blue-400 uppercase">
                        {semiRightId && tournament.matches[semiRightId]
                          ? `KALAH ${getMatchDisplayLabel(tournament.matches[semiRightId]).toUpperCase()}`
                          : 'KALAH SEMIFINAL 2'}
                      </span>
                      <span className="text-xs font-black truncate max-w-full">
                        {thirdPlaceMatch.participantB?.name ||
                          (semiRightId && tournament.matches[semiRightId]
                            ? `Kalah ${getMatchDisplayLabel(tournament.matches[semiRightId])}`
                            : 'Kalah Semifinal 2')}
                      </span>
                      {thirdPlaceMatch.winnerId === thirdPlaceMatch.participantB?.participantId && (
                        <span className="text-[9px] mt-0.5 font-black uppercase text-coffee-950">🥉 JUARA 3</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Center Stage Footer Info */}
            <div className="relative z-10 pt-1 text-center border-t border-gold-500/30">
              <div className="text-[11px] font-bold text-gold-300 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>
                  {semiLeftId && semiRightId && tournament.matches[semiLeftId] && tournament.matches[semiRightId]
                    ? `Pemenang ${getMatchDisplayLabel(tournament.matches[semiLeftId])} vs ${getMatchDisplayLabel(tournament.matches[semiRightId])} diadu untuk Juara 1 & 2 • Kalah untuk Juara 3`
                    : 'Pemenang Semifinal diadu untuk Juara 1 & 2 • Kalah untuk Juara 3'}
                </span>
              </div>
            </div>
          </div>

          {/* SAYAP KANAN (Cols 9-12) */}
          <div className="col-span-4 flex items-stretch gap-3 h-full">
            {/* Column 3: Semifinal Kanan */}
            <div className="flex-1 flex flex-col h-full bg-[#180f0a]/90 rounded-2xl border border-gold-500/40 p-2.5 shadow-xl">
              <div className="text-center bg-gradient-to-r from-gold-500 via-amber-400 to-gold-600 text-coffee-950 uppercase py-2 px-2 rounded-xl mb-2 font-black text-xs md:text-sm shadow">
                <div>SEMIFINAL 2</div>
                <div className="text-[10px] text-coffee-950/80 font-bold">
                  {semiRightId && tournament.matches[semiRightId]
                    ? getMatchDisplayLabel(tournament.matches[semiRightId]).toUpperCase()
                    : 'SEMIFINAL 2'}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto pr-1 column-scrollbar">
                {semiRightId && renderMatchCard(tournament.matches[semiRightId], 'prominent')}
              </div>
            </div>

            {/* Column 4: Babak Perempat Final Kanan */}
            <div className="flex-1 flex flex-col h-full bg-[#160e0a]/90 rounded-2xl border border-coffee-800 p-2.5 shadow-xl">
              <div className="text-center bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-coffee-950 uppercase py-2 px-2 rounded-xl mb-2 font-black text-xs md:text-sm shadow">
                <div>{roundBabak3?.name ? `${roundBabak3.name} (KANAN)` : 'BABAK KANAN'}</div>
                <div className="text-[10px] text-coffee-950/80 font-bold">
                  {b3RightIds.length > 0 ? `${b3RightIds.length} BATTLE • PEREMPAT FINAL` : 'PEREMPAT FINAL'}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-around gap-2 overflow-y-auto pr-1 column-scrollbar">
                {b3RightIds.map((mId) => renderMatchCard(tournament.matches[mId], 'normal'))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =======================================================================
           LINEAR FULL-WIDTH COLUMN BOARD (Babak 1, Babak 2, or Full View mode)
        ======================================================================= */
        <div
          style={{
            gridTemplateColumns: `repeat(${displayedRounds.length}, minmax(0, 1fr))`,
          }}
          className="flex-1 w-full grid gap-3.5 items-stretch my-2 transition-all duration-500 overflow-hidden"
        >
          {displayedRounds.map((round) => {
            const matchIds = round.matchIds || [];
            const matchCount = matchIds.length;

            return (
              <div
                key={`round_${round.index}`}
                className="flex flex-col h-full bg-[#160e0a]/90 rounded-2xl border border-coffee-800 p-2.5 overflow-hidden shadow-xl"
              >
                {/* Round Header */}
                <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-coffee-950 uppercase tracking-wider shadow py-2 px-2.5 mb-2 rounded-xl flex items-center justify-between">
                  <div className="truncate text-left">
                    <div className="truncate text-xs md:text-sm font-black">{round.name}</div>
                    <div className="truncate mt-0.5 text-[10px] md:text-[11px] font-bold text-coffee-950/80">
                      {round.subTitle ? round.subTitle.replace(/\s*\+\s*1\s*BYPASS/gi, '') : `${matchCount} BATTLE`}
                    </div>
                  </div>

                  {/* Tombol di luar box battle untuk menambahkan pemain (khusus babak 1 atau saat sisa ganjil) */}
                  {round.index === 0 && (
                    <button
                      type="button"
                      disabled={!canAddParticipantInRound(round.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find first open slot or open slot in pending match
                        const openMatch = matchIds
                          .map((id) => tournament.matches[id])
                          .find((m) => m && (!m.participantA?.participantId || (!m.participantB?.participantId && !m.participantB?.isBye)));
                        if (openMatch) {
                          const targetSlot = !openMatch.participantA?.participantId ? 'A' : 'B';
                          handleOpenSlotAssign(openMatch, targetSlot);
                        } else {
                          // If all slots are filled, open slot modal on last match or prompt to edit
                          const lastM = tournament.matches[matchIds[matchIds.length - 1]];
                          if (lastM) {
                            handleOpenSlotAssign(lastM, 'B');
                          }
                        }
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black shadow transition active:scale-95 ${
                        canAddParticipantInRound(round.index)
                          ? 'bg-coffee-950 text-gold-300 hover:bg-black border border-gold-400 cursor-pointer animate-pulse'
                          : 'bg-coffee-950/40 text-coffee-500/60 border border-coffee-800/40 cursor-not-allowed pointer-events-none opacity-50'
                      }`}
                      title={
                        canAddParticipantInRound(round.index)
                          ? 'Tambah pemain baru ke babak 1'
                          : 'Babak 1 sudah selesai (dinonaktifkan agar tidak mengganggu babak berikutnya)'
                      }
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Tambah Pemain</span>
                    </button>
                  )}
                </div>

                {/* Match Cards List */}
                {(() => {
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
                      {sortedMatchIds.map((matchId) => renderMatchCard(tournament.matches[matchId], matchCount <= 4 ? 'prominent' : 'normal'))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          BOTTOM FOOTER BAR
      ========================================================================= */}
      <footer className="w-full pt-2 border-t border-coffee-800/80 flex items-center justify-between">
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
          Klik pada kotak pertandingan untuk membuka popup arena tanding & memilih pemenang
        </div>
      </footer>

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
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/90 text-red-200 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-live-pulse">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                {selectedMatch.participantB?.isBye ? 'SLOT TANDING • SIAP' : 'LIVE MATCH • SEDANG BERLANGSUNG'}
              </div>

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
                {getMatchDisplayLabel(selectedMatch)}
              </h3>
              <p className="text-xs md:text-sm text-coffee-300 font-medium">
                {selectedMatch.participantB?.isBye
                  ? 'Peserta ini dapat langsung diloloskan atau diadu dengan peserta yang kalah sebelumnya:'
                  : 'Sesi tanding sedang berlangsung di panggung. Klik nama peserta untuk menentukan pemenang saat penilaian selesai.'}
              </p>
            </div>

            {/* Duel Arena Grid */}
            {selectedMatch.participantB?.isBye ? (
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
                <div className="text-xs text-coffee-300 mb-4">
                  {selectedMatch.participantA?.affiliation || '-'}
                </div>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => handleOpenSlotAssign(selectedMatch, 'A')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-gold-500 hover:text-coffee-950 text-gold-300 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Nama Peserta Ini</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSlotAssign(selectedMatch, 'B')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/60 text-xs font-bold transition flex items-center gap-1.5 shadow"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>➕ Isi Lawan (Adu Lagi)</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-coffee-800/80">
                  <button
                    disabled={!selectedMatch.participantA?.participantId}
                    onClick={() => handleSelectWinner(selectedMatch, 'A')}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-coffee-950 font-black text-sm shadow-xl active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    LOLOSKAN LANGSUNG (TANPA LAWAN)
                  </button>
                  <p className="text-[11px] text-coffee-400 mt-2">
                    💡 Atau klik &quot;➕ Isi Lawan (Adu Lagi)&quot; di atas untuk mengadu dengan peserta yang kalah sebelumnya.
                  </p>
                </div>
              </div>
            ) : (
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500 text-red-300 text-xs font-black uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    SUDUT MERAH
                  </div>

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
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-2 rounded-full border-2 border-black shadow-lg">
                      <Flame className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>

                  <div className="text-xl md:text-2xl font-black text-white group-hover:text-red-300 transition mb-1 text-center line-clamp-1">
                    {selectedMatch.participantA?.name || 'Slot Kosong'}
                  </div>
                  <div className="text-xs text-coffee-300 mb-3 text-center font-medium line-clamp-1">
                    {selectedMatch.participantA?.affiliation || '-'}
                  </div>

                  {selectedMatch.roundIndex <= 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlotAssign(selectedMatch, 'A');
                      }}
                      className="mb-3 px-3 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{selectedMatch.participantA?.participantId ? 'Ganti Peserta Ini' : 'Tambah Peserta ke Slot Ini'}</span>
                    </button>
                  )}

                  <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold text-red-400 bg-red-950/70 px-3.5 py-1 rounded-full border border-red-800/80">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Sedang Bertanding
                  </div>

                  <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-xs md:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_30px_rgba(234,179,8,0.8)] group-hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" /> PILIH SEBAGAI PEMENANG
                  </button>
                </div>

                {/* BLUE CORNER (Sudut Biru) */}
                <div
                  onClick={() => handleSelectWinner(selectedMatch, 'B')}
                  className="cursor-pointer group relative rounded-3xl bg-gradient-to-b from-[#0f1d30] via-[#0b1422] to-[#060b14] border-2 border-blue-500/80 hover:border-blue-400 p-6 flex flex-col items-center transition-all duration-300 shadow-xl active:scale-95 animate-blue-corner"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/90 border border-blue-500 text-blue-300 text-xs font-black uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    SUDUT BIRU
                  </div>

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
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full border-2 border-black shadow-lg">
                      <Flame className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>

                  <div className="text-xl md:text-2xl font-black text-white group-hover:text-blue-300 transition mb-1 text-center line-clamp-1">
                    {selectedMatch.participantB?.name || 'Slot Kosong'}
                  </div>
                  <div className="text-xs text-coffee-300 mb-3 text-center font-medium line-clamp-1">
                    {selectedMatch.participantB?.affiliation || '-'}
                  </div>

                  {selectedMatch.roundIndex <= 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlotAssign(selectedMatch, 'B');
                      }}
                      className="mb-3 px-3 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-500/60 text-blue-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{selectedMatch.participantB?.participantId ? 'Ganti Peserta Ini' : 'Tambah Peserta ke Slot Ini'}</span>
                    </button>
                  )}

                  <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold text-blue-400 bg-blue-950/70 px-3.5 py-1 rounded-full border border-blue-800/80">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Sedang Bertanding
                  </div>

                  <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-xs md:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_30px_rgba(234,179,8,0.8)] group-hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" /> PILIH SEBAGAI PEMENANG
                  </button>
                </div>
              </div>
            )}

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
          QUICK PARTICIPANT ASSIGN MODAL (Tambah/Ganti Peserta di Babak 1 & 2)
      ========================================================================= */}
      {showSlotModal && slotTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#180f0a] border-2 border-gold-500/80 rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowSlotModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-coffee-800">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow ${
                slotTarget.slot === 'A' ? 'bg-red-600' : 'bg-blue-600'
              }`}>
                {slotTarget.slot === 'A' ? 'MERAH' : 'BIRU'}
              </div>
              <div>
                <h3 className="text-lg font-black text-gold-300">
                  {slotTarget.match.label} - Slot {slotTarget.slot === 'A' ? 'Sudut Merah' : 'Sudut Biru'}
                </h3>
                <p className="text-xs text-coffee-300">
                  Tambah atau ubah peserta tanpa mereset hasil pertandingan lain yang sudah selesai.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Opsi Cepat (Quick Actions) */}
              <div className="grid grid-cols-2 gap-2">
                {/* Opsi 1: Loloskan Langsung / Bypass */}
                <button
                  type="button"
                  onClick={() => handleBypassPass(slotTarget.match)}
                  className="p-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-left transition flex flex-col justify-between group active:scale-95"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">Opsi 1</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition duration-300" />
                  </div>
                  <div className="text-xs font-black text-white group-hover:text-amber-200">
                    Loloskan Langsung (Bypass)
                  </div>
                  <p className="text-[10px] text-coffee-300 mt-1 line-clamp-2">
                    Loloskan pemain Sudut Merah ke babak selanjutnya tanpa tanding
                  </p>
                </button>

                {/* Opsi 2: Shuffle / Acak dari Peserta yang Kalah */}
                <button
                  type="button"
                  onClick={() => handleShuffleDefeatedOpponent(slotTarget.match, slotTarget.slot)}
                  className="p-3 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/60 text-left transition flex flex-col justify-between group active:scale-95"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider">Opsi 2</span>
                    <Shuffle className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-180 transition duration-300" />
                  </div>
                  <div className="text-xs font-black text-white group-hover:text-purple-200">
                    Acak dari Peserta Kalah
                  </div>
                  <p className="text-[10px] text-coffee-300 mt-1 line-clamp-2">
                    Undi lawan wildcard secara acak dari peserta battle sebelumnya yang gugur
                  </p>
                </button>
              </div>

              {/* Opsi 3: Pilih Peserta dari Dropdown (Termasuk Peserta yang Kalah Sebelumnya) */}
              <div>
                <label className="block text-xs font-bold text-gold-400 mb-1.5 uppercase tracking-wider">
                  Atau Pilih Peserta / Wildcard Manual:
                </label>
                {(() => {
                  // Cari peserta yang kalah dari match yang sudah selesai
                  const defeatedMap = new Map<string, Participant>();
                  Object.values(tournament.matches || {}).forEach((m) => {
                    if (m.status === 'completed' && m.winnerId) {
                      const loser = m.winnerId === m.participantA?.participantId ? m.participantB : m.participantA;
                      if (loser && loser.participantId && !loser.isBye) {
                        defeatedMap.set(loser.participantId, {
                          id: loser.participantId,
                          name: loser.name || 'Peserta',
                          affiliation: loser.affiliation || '',
                          photo: loser.photo || '',
                        });
                      }
                    }
                  });
                  const defeatedList = Array.from(defeatedMap.values());

                  return (
                    <select
                      value={selectedExistingId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedExistingId(id);
                        if (id && id !== 'NEW') {
                          const found = tournament.participants.find((p) => p.id === id) || defeatedMap.get(id);
                          if (found) {
                            setCustomName(found.name);
                            setCustomAffiliation(found.affiliation || '');
                            setCustomPhoto(found.photo || '');
                          }
                        } else if (id === 'NEW') {
                          setCustomName('');
                          setCustomAffiliation('');
                          setCustomPhoto('');
                        }
                      }}
                      className="w-full bg-[#25160e] border border-coffee-700 focus:border-gold-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition"
                    >
                      <option value="NEW">➕ Input / Ketik Peserta Baru Manual</option>
                      {defeatedList.length > 0 && (
                        <optgroup label="⚠️ Peserta yang Kalah (Bisa Diadu Lagi / Wildcard)">
                          {defeatedList.map((p) => (
                            <option key={`loser_${p.id}`} value={p.id}>
                              🥊 {p.name} {p.affiliation ? `(${p.affiliation})` : ''} - Kalah Sebelumnya
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Daftar Seluruh Peserta Turnamen">
                        {tournament.participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.affiliation ? `(${p.affiliation})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  );
                })()}
              </div>

              {/* Opsi 2: Input Manual & Edit Nama */}
              <div className="bg-[#20130c] p-4 rounded-2xl border border-coffee-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-coffee-300 uppercase tracking-wide">
                    {selectedExistingId && selectedExistingId !== 'NEW' ? 'Edit Data Peserta Terpilih:' : 'Detail Data Peserta Baru:'}
                  </span>
                  <span className="text-[10px] text-gold-400 font-medium">Bisa langsung diedit di sini</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-coffee-300 mb-1">
                    Nama Peserta *
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Contoh: Rian Pratama"
                    className="w-full bg-[#140c07] border border-coffee-700 focus:border-gold-400 rounded-xl px-3 py-2 text-white text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-coffee-300 mb-1">
                    Afiliasi / Coffee Shop (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customAffiliation}
                    onChange={(e) => setCustomAffiliation(e.target.value)}
                    placeholder="Contoh: Ombay Roastery - Banten"
                    className="w-full bg-[#140c07] border border-coffee-700 focus:border-gold-400 rounded-xl px-3 py-2 text-white text-sm outline-none transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlotParticipant}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 text-xs font-black shadow-lg transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Simpan ke Bagan Pertandingan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          WINNER CELEBRATION MODALS & GRAND CHAMPION CEREMONY
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
