import { Match, Round, Participant, GrandFinalist } from './db';

export interface BracketOptions {
  bypassPosition?: 'first' | 'last';
  formatType?: 'throwdown' | 'knockout';
}

/**
 * Dynamic Tournament Bracket Generator with Bilateral Support & Grand Final / 3rd Place Playoff
 */
export function createDynamicBracket(
  participants: Participant[],
  options: BracketOptions | string = 'throwdown'
): {
  rounds: Round[];
  matches: Record<string, Match>;
  grandFinalists: GrandFinalist[];
} {
  const formatType = typeof options === 'string' ? options : options.formatType || 'throwdown';
  const bypassPosition = typeof options === 'object' && options.bypassPosition ? options.bypassPosition : 'last';

  const matches: Record<string, Match> = {};
  const rounds: Round[] = [];
  const count = Math.max(participants.length, 2);

  // Determine round structures
  const roundStructures: {
    matchCount: number;
    hasBypass: boolean;
    bypassMatchIndex: number;
    isFinalRound?: boolean;
  }[] = [];

  let currentBrewers = count;

  while (currentBrewers > 1) {
    if (currentBrewers === 2) {
      // Final Round: 1 Grand Final (Juara 1 & 2) + 1 3rd Place match (Juara 3)
      roundStructures.push({
        matchCount: 2,
        hasBypass: false,
        bypassMatchIndex: -1,
        isFinalRound: true,
      });
      break;
    }

    const isOdd = currentBrewers % 2 !== 0;
    const standardMatches = Math.floor(currentBrewers / 2);

    if (isOdd) {
      const totalMatchSlots = standardMatches + 1;
      const bypassIdx = bypassPosition === 'first' ? 0 : totalMatchSlots - 1;
      roundStructures.push({
        matchCount: totalMatchSlots,
        hasBypass: true,
        bypassMatchIndex: bypassIdx,
      });
      currentBrewers = standardMatches + 1;
    } else {
      roundStructures.push({
        matchCount: standardMatches,
        hasBypass: false,
        bypassMatchIndex: -1,
      });
      currentBrewers = standardMatches;
    }
  }

  const totalRounds = roundStructures.length;
  let matchGlobalCounter = 1;

  for (let r = 0; r < totalRounds; r++) {
    const { matchCount, hasBypass, bypassMatchIndex, isFinalRound } = roundStructures[r];
    const matchIds: string[] = [];

    let roundName = `BABAK ${r + 1}`;
    let subTitle = `${matchCount} BATTLE`;

    if (isFinalRound || r === totalRounds - 1) {
      roundName = 'BABAK FINAL';
      subTitle = 'Grand Final & Juara 3';
    } else if (r === totalRounds - 2) {
      roundName = 'SEMI FINAL';
      subTitle = `${matchCount} BATTLE`;
    } else if (r === 0) {
      roundName = `${count} BREWER`;
      subTitle = `BABAK 1 (${matchCount} BATTLE)`;
    } else if (r === 1) {
      roundName = 'BABAK 2';
      subTitle = `${matchCount} BATTLE`;
    } else if (r === 2) {
      roundName = 'BABAK 3';
      subTitle = 'PEREMPAT FINAL';
    }

    if (isFinalRound) {
      // 1. Grand Final (Juara 1 & 2)
      const grandFinalId = `r${r}_grand_final`;
      matchIds.push(grandFinalId);
      matches[grandFinalId] = {
        id: grandFinalId,
        matchNumber: matchGlobalCounter++,
        label: `Battle ${matchGlobalCounter - 1} • GRAND FINAL`,
        roundIndex: r,
        participantA: null,
        participantB: null,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchSlot: null,
      };

      // 2. Perebutan Juara 3 (3rd Place Match)
      const thirdPlaceId = `r${r}_third_place`;
      matchIds.push(thirdPlaceId);
      matches[thirdPlaceId] = {
        id: thirdPlaceId,
        matchNumber: matchGlobalCounter++,
        label: `Battle ${matchGlobalCounter - 1} • PEREBUTAN JUARA 3`,
        roundIndex: r,
        participantA: null,
        participantB: null,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchSlot: null,
      };
    } else {
      for (let m = 0; m < matchCount; m++) {
        const isThisBypass = hasBypass && m === bypassMatchIndex;
        const id = isThisBypass ? `r${r}_bypass` : `r${r}_m${m + 1}`;
        matchIds.push(id);

        const currentBattleNum = matchGlobalCounter++;
        matches[id] = {
          id,
          matchNumber: currentBattleNum,
          label: `Battle ${currentBattleNum}`,
          roundIndex: r,
          participantA: null,
          participantB: isThisBypass ? { name: 'BYPASS / BYE', isBye: true } : null,
          winnerId: null,
          status: isThisBypass ? 'ready' : 'pending',
          nextMatchId: null,
          nextMatchSlot: null,
        };
      }
    }

    rounds.push({
      index: r,
      name: roundName,
      subTitle,
      matchIds,
    });
  }

  // Link progression from Round R to Round R+1
  for (let r = 0; r < totalRounds - 1; r++) {
    const currentRoundMatchIds = rounds[r].matchIds;
    const nextRoundMatchIds = rounds[r + 1].matchIds;

    // Special linking for Semifinal -> Final (Grand Final + 3rd Place)
    if (r === totalRounds - 2 && currentRoundMatchIds.length === 2 && nextRoundMatchIds.length === 2) {
      const sf1Id = currentRoundMatchIds[0];
      const sf2Id = currentRoundMatchIds[1];
      const grandFinalId = nextRoundMatchIds[0];
      const thirdPlaceId = nextRoundMatchIds[1];

      // SF1 winner to GF (A), loser to 3rd Place (A)
      matches[sf1Id].nextMatchId = grandFinalId;
      matches[sf1Id].nextMatchSlot = 'A';
      matches[sf1Id].loserMatchId = thirdPlaceId;
      matches[sf1Id].loserMatchSlot = 'A';

      // SF2 winner to GF (B), loser to 3rd Place (B)
      matches[sf2Id].nextMatchId = grandFinalId;
      matches[sf2Id].nextMatchSlot = 'B';
      matches[sf2Id].loserMatchId = thirdPlaceId;
      matches[sf2Id].loserMatchSlot = 'B';
      continue;
    }

    let nextMatchIdx = 0;
    let nextSlot: 'A' | 'B' = 'A';

    for (let i = 0; i < currentRoundMatchIds.length; i++) {
      const currId = currentRoundMatchIds[i];

      if (nextMatchIdx < nextRoundMatchIds.length) {
        const nextId = nextRoundMatchIds[nextMatchIdx];
        const nextMatch = matches[nextId];

        // If next match is a bypass slot, it only accepts slot A!
        if (nextMatch?.participantB?.isBye) {
          matches[currId].nextMatchId = nextId;
          matches[currId].nextMatchSlot = 'A';
          nextMatchIdx++;
          nextSlot = 'A';
        } else {
          matches[currId].nextMatchId = nextId;
          matches[currId].nextMatchSlot = nextSlot;

          if (nextSlot === 'A') {
            nextSlot = 'B';
          } else {
            nextSlot = 'A';
            nextMatchIdx++;
          }
        }
      }
    }
  }

  // Pre-seed Round 1 participants if participants already exist
  const round0MatchIds = rounds[0]?.matchIds || [];
  let pIdx = 0;
  for (const mId of round0MatchIds) {
    if (matches[mId].participantB?.isBye) {
      if (pIdx < participants.length) {
        const p = participants[pIdx++];
        matches[mId].participantA = {
          participantId: p.id,
          name: p.name,
          affiliation: p.affiliation,
          photo: p.photo,
        };
        matches[mId].winnerId = p.id;
        matches[mId].status = 'completed';

        if (matches[mId].nextMatchId && matches[matches[mId].nextMatchId!]) {
          const nextM = matches[matches[mId].nextMatchId!];
          if (matches[mId].nextMatchSlot === 'A') {
            nextM.participantA = { ...matches[mId].participantA };
          } else {
            nextM.participantB = { ...matches[mId].participantA };
          }
        }
      }
      continue;
    }

    if (pIdx < participants.length) {
      const pA = participants[pIdx++];
      matches[mId].participantA = {
        participantId: pA.id,
        name: pA.name,
        affiliation: pA.affiliation,
        photo: pA.photo,
      };
    }
    if (pIdx < participants.length) {
      const pB = participants[pIdx++];
      matches[mId].participantB = {
        participantId: pB.id,
        name: pB.name,
        affiliation: pB.affiliation,
        photo: pB.photo,
      };
    }
    if (matches[mId].participantA?.participantId && matches[mId].participantB?.participantId) {
      matches[mId].status = 'ready';
    }
  }

  const grandFinalists: GrandFinalist[] = [
    {
      id: 'finalist_1',
      name: 'Menunggu Hasil...',
      sourceLabel: 'Juara 1',
    },
    {
      id: 'finalist_2',
      name: 'Menunggu Hasil...',
      sourceLabel: 'Juara 2',
    },
    {
      id: 'finalist_3',
      name: 'Menunggu Hasil...',
      sourceLabel: 'Juara 3',
    },
  ];

  return { rounds, matches, grandFinalists };
}

export function createCoffee28Bracket(participants: Participant[]) {
  return createDynamicBracket(participants, { formatType: 'throwdown', bypassPosition: 'last' });
}

export function createStandardKnockoutBracket(participants: Participant[]) {
  return createDynamicBracket(participants, { formatType: 'knockout', bypassPosition: 'last' });
}
