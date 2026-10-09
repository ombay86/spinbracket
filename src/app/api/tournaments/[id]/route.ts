import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentById, saveTournament, deleteTournament, Tournament } from '@/lib/db';
import { createDynamicBracket } from '@/lib/bracket-generator';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tournament = await getTournamentById(params.id);
  if (!tournament || tournament.userId !== user.id) {
    return NextResponse.json({ error: 'Turnamen tidak ditemukan' }, { status: 404 });
  }

  // Auto-heal / sync bracket if participant count doesn't match round 1 capacity
  const pCount = tournament.participants?.length || 0;
  if (pCount > 0) {
    const round0MatchIds = (tournament.rounds?.[0]?.matchIds || []).filter((m) => !m.includes('bye'));
    const capacity = round0MatchIds.length * 2;
    if (capacity < pCount || round0MatchIds.length === 0) {
      const generated = createDynamicBracket(
        tournament.participants,
        tournament.format === 'coffee-28' ? 'throwdown' : 'knockout'
      );
      tournament.rounds = generated.rounds;
      tournament.matches = generated.matches;
      tournament.grandFinalists = generated.grandFinalists;
      await saveTournament(tournament);
    }
  }

  return NextResponse.json({ tournament });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tournament = await getTournamentById(params.id);
  if (!tournament || tournament.userId !== user.id) {
    return NextResponse.json({ error: 'Turnamen tidak ditemukan' }, { status: 404 });
  }

  try {
    const updateData: Partial<Tournament> = await request.json();

    const updatedTournament: Tournament = {
      ...tournament,
      ...updateData,
      id: tournament.id,
      userId: tournament.userId,
      updatedAt: new Date().toISOString(),
    };

    await saveTournament(updatedTournament);
    return NextResponse.json({ tournament: updatedTournament });
  } catch (error: any) {
    console.error('Update tournament error', error);
    return NextResponse.json({ error: error.message || 'Gagal update turnamen' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const success = await deleteTournament(params.id, user.id);
  if (!success) {
    return NextResponse.json({ error: 'Gagal menghapus turnamen' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
