import { Match, Round, Participant, GrandFinalist } from './db';

export interface BracketOptions {
  bypassPosition?: 'first' | 'last'; // Which match gets the bypass when matches count is odd
  formatType?: 'throwdown' | 'knockout';
}

/**
 * Dynamic Throwdown Bracket Generator for ANY number of participants N
 * If a round has an ODD number of matches M = 2k + 1:
 * - 2k matches are paired into k matches in the next round.
 * - The 1 remaining match is designated as the BYPASS MATCH!
 *   Its winner automatically BYPASSES to the next stage without having to fight in an extra match!
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

  // Determine round structure
  // Each round has a number of matches.
  // If participants count is even: matches = count / 2
  // If count is odd: matches = Math.floor(count / 2) + 1 (where 1 is a bypass slot)
  const roundStructures: {
    matchCount: number;
    hasBypass: boolean;
    bypassMatchIndex: number; // which match is the bypass (0 for first, or matchCount - 1 for last)
  }[] = [];

  let currentBrewers = count;

  while (currentBrewers > 1) {
    if (currentBrewers === 3 && formatType === 'throwdown') {
      // 3 finalists remain for the Grand Throwdown!
      break;
    }

    const isOdd = currentBrewers % 2 !== 0;
    const standardMatches = Math.floor(currentBrewers / 2);

    if (isOdd) {
      // e.g. 7 brewers -> 3 battles + 1 bypass slot (total 4 slots)
      // or if previous round had odd matches:
      const totalMatchSlots = standardMatches + 1;
      const bypassIdx = bypassPosition === 'first' ? 0 : totalMatchSlots - 1;
      roundStructures.push({
        matchCount: totalMatchSlots,
        hasBypass: true,
        bypassMatchIndex: bypassIdx,
      });
      // Next round will have standardMatches winners + 1 bypass winner = standardMatches + 1
      currentBrewers = standardMatches + 1;
    } else {
      // Even number of brewers
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
    const { matchCount, hasBypass, bypassMatchIndex } = roundStructures[r];
    const matchIds: string[] = [];

    let roundName = `BABAK ${r + 1}`;
    let subTitle = `${hasBypass ? matchCount - 1 : matchCount} BATTLE${hasBypass ? ' + 1 BYPASS' : ''}`;

    if (r === totalRounds - 1 && currentBrewers <= 2) {
      roundName = 'FINAL CHAMPIONSHIP';
      subTitle = 'Perebutan Juara 1';
    } else if (r === totalRounds - 2) {
      roundName = 'SEMI FINAL';
      subTitle = `${matchCount} BATTLE`;
    } else if (r === 0) {
      roundName = `${count} BREWER`;
      subTitle = `BABAK 1 (${matchCount} BATTLE)`;
    }

    for (let m = 0; m < matchCount; m++) {
      const isThisBypass = hasBypass && m === bypassMatchIndex;
      const id = isThisBypass ? `r${r}_bypass` : `r${r}_m${m + 1}`;
      matchIds.push(id);

      matches[id] = {
        id,
        matchNumber: isThisBypass ? 0 : matchGlobalCounter++,
        label: isThisBypass ? '⚡ BYPASS (Lolos Langsung)' : `Battle ${matchGlobalCounter - 1}`,
        roundIndex: r,
        participantA: null,
        participantB: isThisBypass ? { name: 'BYPASS / BYE', isBye: true } : null,
        winnerId: null,
        status: isThisBypass ? 'ready' : 'pending',
        nextMatchId: null,
        nextMatchSlot: null,
      };
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
      // Bypass slot in round 0
      if (pIdx < participants.length) {
        const p = participants[pIdx++];
        matches[mId].participantA = {
          participantId: p.id,
          name: p.name,
          affiliation: p.affiliation,
          photo: p.photo,
        };
        // Auto resolve bypass!
        matches[mId].winnerId = p.id;
        matches[mId].status = 'completed';

        // Auto pass to next round if linked
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
      sourceLabel: 'Finalis 1',
    },
    {
      id: 'finalist_2',
      name: 'Menunggu Hasil...',
      sourceLabel: 'Finalis 2',
    },
    {
      id: 'finalist_3',
      name: 'Menunggu Hasil...',
      sourceLabel: 'Finalis 3',
    },
  ];

  return { rounds, matches, grandFinalists };
}

// Backward compatible aliases
export function createCoffee28Bracket(participants: Participant[]) {
  return createDynamicBracket(participants, { formatType: 'throwdown', bypassPosition: 'last' });
}

export function createStandardKnockoutBracket(participants: Participant[]) {
  return createDynamicBracket(participants, { formatType: 'knockout', bypassPosition: 'last' });
}
