import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveTournament, Tournament, Participant } from '@/lib/db';
import { createCoffee28Bracket } from '@/lib/bracket-generator';

const sampleBrewers = [
  { name: 'Dimas Aditya', affiliation: 'Anomali Coffee - Jakarta', avatar: '👨‍🍳' },
  { name: 'Siti Rahma', affiliation: 'Smoking Barrels - Bandung', avatar: '👩‍🍳' },
  { name: 'Budi Santoso', affiliation: 'Giyanti Coffee - Jakarta', avatar: '☕' },
  { name: 'Rian Pratama', affiliation: 'Ombay Roastery - Banten', avatar: '🧑‍🌾' },
  { name: 'Ahmad Fauzi', affiliation: 'Space Roastery - Yogyakarta', avatar: '👨‍🔬' },
  { name: 'Nadia Putri', affiliation: 'Klinik Kopi - Yogyakarta', avatar: '👩‍💼' },
  { name: 'Eko Prasetyo', affiliation: 'Tanamera Coffee - Bali', avatar: '🧑‍🍳' },
  { name: 'Fajar Nugraha', affiliation: 'Common Grounds - Jakarta', avatar: '🧔' },
  { name: 'Kevin Sanjaya', affiliation: 'Morph Coffee - Serang', avatar: '👨‍🎤' },
  { name: 'Maya Anggraini', affiliation: 'Two Hands Full - Bandung', avatar: '👩‍🎤' },
  { name: 'Reza Firmansyah', affiliation: 'Satu Kata Kopi - Cilegon', avatar: '👨‍🎓' },
  { name: 'Dewi Lestari', affiliation: 'Titik Temu - Bali', avatar: '👩‍🏫' },
  { name: 'Hendra Gunawan', affiliation: 'Seniman Coffee - Ubud', avatar: '👨‍💼' },
  { name: 'Rizky Ramadhan', affiliation: 'Hungry Bird - Canggu', avatar: '🧑‍🔧' },
  { name: 'Andi Wijaya', affiliation: 'Kopi Toko Djawa - Bandung', avatar: '👨‍🎨' },
  { name: 'Lia Kartika', affiliation: 'Kopi Manyar - Jakarta', avatar: '👩‍🎨' },
  { name: 'Farhan Maulana', affiliation: 'Kopikalyan - BSD', avatar: '🧔‍♂️' },
  { name: 'Bayu Saputra', affiliation: 'Wheelhouse - Surabaya', avatar: '👨‍🚀' },
  { name: 'Indah Permata', affiliation: 'Korte Chocolate & Coffee - Sby', avatar: '👩‍🚀' },
  { name: 'Tommy Kurniawan', affiliation: 'Kyo Coffee - Jakarta', avatar: '🧑‍💼' },
  { name: 'Riko Pratama', affiliation: 'Djournal Coffee - Tangerang', avatar: '👨‍💻' },
  { name: 'Gita Savitri', affiliation: 'Kopi Praja - Bintaro', avatar: '👩‍💻' },
  { name: 'Arif Hidayat', affiliation: 'First Crack - Jakarta', avatar: '🧑‍⚖️' },
  { name: 'Vina Panduwinata', affiliation: 'Monolog Quality Coffee - Jkt', avatar: '👩‍⚖️' },
  { name: 'Yoga Pratama', affiliation: 'Koffie Fabriek - Banten', avatar: '🧑‍🎨' },
  { name: 'Dini Fitria', affiliation: 'Simetri Coffee - Gandaria', avatar: '👩‍🦰' },
  { name: 'Iqbal Ramli', affiliation: 'Crematology - Senopati', avatar: '🧔' },
  { name: 'Zahra Amalia', affiliation: 'Work Coffee - Jakarta', avatar: '🧕' },
];

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tournamentId = `trn_kkb2026_${Date.now()}`;
  const participants: Participant[] = sampleBrewers.map((b, idx) => ({
    id: `p_${idx + 1}`,
    name: b.name,
    affiliation: b.affiliation,
    photo: '', // will display avatar icon or custom photo
    seed: idx + 1,
  }));

  const generated = createCoffee28Bracket(participants);

  // Automatically seed the 28 participants into the 14 Round 1 matches
  for (let i = 0; i < 14; i++) {
    const matchId = `b${i + 1}`;
    const pA = participants[i * 2];
    const pB = participants[i * 2 + 1];

    generated.matches[matchId].participantA = {
      participantId: pA.id,
      name: pA.name,
      affiliation: pA.affiliation,
      photo: pA.photo,
    };
    generated.matches[matchId].participantB = {
      participantId: pB.id,
      name: pB.name,
      affiliation: pB.affiliation,
      photo: pB.photo,
    };
    generated.matches[matchId].status = 'ready';
  }

  const tournament: Tournament = {
    id: tournamentId,
    userId: user.id,
    title: 'KKB 2026 MANUAL BREWING THROWDOWN COMPETITION',
    subtitle: 'TOURNAMENT BRACKET 28 PESERTA → 3 JUARA',
    location: 'Bank Indonesia Banten',
    date: '10 - 11 Oktober 2026',
    format: 'coffee-28',
    status: 'in_progress',
    participants,
    unassignedParticipantIds: [], // all assigned in sample
    rounds: generated.rounds,
    matches: generated.matches,
    grandFinalists: generated.grandFinalists,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveTournament(tournament);

  return NextResponse.json({ tournament });
}
