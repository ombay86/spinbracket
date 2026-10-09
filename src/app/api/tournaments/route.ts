import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentsByUser, saveTournament, Tournament, Participant } from '@/lib/db';
import { createCoffee28Bracket, createStandardKnockoutBracket } from '@/lib/bracket-generator';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tournaments = getTournamentsByUser(user.id);
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      subtitle = 'Manual Brewing Throwdown',
      location = 'Main Stage',
      date = new Date().toISOString().split('T')[0],
      format = 'coffee-28',
      participants = [],
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Nama turnamen wajib diisi' }, { status: 400 });
    }

    const tournamentId = `trn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Prepare participants with IDs
    const formattedParticipants: Participant[] = participants.map((p: any, idx: number) => ({
      id: p.id || `p_${Date.now()}_${idx + 1}`,
      name: p.name || `Brewer ${idx + 1}`,
      affiliation: p.affiliation || '',
      photo: p.photo || '',
      seed: idx + 1,
    }));

    // Generate bracket template based on format
    let generated;
    if (format === 'coffee-28') {
      generated = createCoffee28Bracket(formattedParticipants);
    } else {
      generated = createStandardKnockoutBracket(formattedParticipants);
    }

    const newTournament: Tournament = {
      id: tournamentId,
      userId: user.id,
      title,
      subtitle,
      location,
      date,
      format,
      status: 'draft',
      participants: formattedParticipants,
      unassignedParticipantIds: formattedParticipants.map((p) => p.id),
      rounds: generated.rounds,
      matches: generated.matches,
      grandFinalists: generated.grandFinalists,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveTournament(newTournament);

    return NextResponse.json({ tournament: newTournament });
  } catch (error: any) {
    console.error('Create tournament error', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat turnamen' }, { status: 500 });
  }
}
