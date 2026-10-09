import { createCoffee28Bracket, createDynamicBracket } from './bracket-generator';
import { User, Tournament, Participant, Match, Round, GrandFinalist } from './db';

export type { User, Tournament, Participant, Match, Round, GrandFinalist };

const STORAGE_KEY = 'spinbracket_local_db_v1';
const SESSION_KEY = 'spinbracket_local_session_user';

const sampleBrewers = [
  { name: 'Dimas Aditya', affiliation: 'Anomali Coffee - Jakarta' },
  { name: 'Siti Rahma', affiliation: 'Smoking Barrels - Bandung' },
  { name: 'Budi Santoso', affiliation: 'Giyanti Coffee - Jakarta' },
  { name: 'Rian Pratama', affiliation: 'Ombay Roastery - Banten' },
  { name: 'Ahmad Fauzi', affiliation: 'Space Roastery - Yogyakarta' },
  { name: 'Nadia Putri', affiliation: 'Klinik Kopi - Yogyakarta' },
  { name: 'Eko Prasetyo', affiliation: 'Tanamera Coffee - Bali' },
  { name: 'Fajar Nugraha', affiliation: 'Common Grounds - Jakarta' },
  { name: 'Kevin Sanjaya', affiliation: 'Morph Coffee - Serang' },
  { name: 'Maya Anggraini', affiliation: 'Two Hands Full - Bandung' },
  { name: 'Reza Firmansyah', affiliation: 'Satu Kata Kopi - Cilegon' },
  { name: 'Dewi Lestari', affiliation: 'Titik Temu - Bali' },
  { name: 'Hendra Gunawan', affiliation: 'Seniman Coffee - Ubud' },
  { name: 'Rizky Ramadhan', affiliation: 'Hungry Bird - Canggu' },
  { name: 'Andi Wijaya', affiliation: 'Kopi Toko Djawa - Bandung' },
  { name: 'Lia Kartika', affiliation: 'Kopi Manyar - Jakarta' },
  { name: 'Farhan Maulana', affiliation: 'Kopikalyan - BSD' },
  { name: 'Bayu Saputra', affiliation: 'Wheelhouse - Surabaya' },
  { name: 'Indah Permata', affiliation: 'Korte Chocolate & Coffee - Sby' },
  { name: 'Tommy Kurniawan', affiliation: 'Kyo Coffee - Jakarta' },
  { name: 'Riko Pratama', affiliation: 'Djournal Coffee - Tangerang' },
  { name: 'Gita Savitri', affiliation: 'Kopi Praja - Bintaro' },
  { name: 'Arif Hidayat', affiliation: 'First Crack - Jakarta' },
  { name: 'Vina Panduwinata', affiliation: 'Monolog Quality Coffee - Jkt' },
  { name: 'Yoga Pratama', affiliation: 'Koffie Fabriek - Banten' },
  { name: 'Dini Fitria', affiliation: 'Simetri Coffee - Gandaria' },
  { name: 'Iqbal Ramli', affiliation: 'Crematology - Senopati' },
  { name: 'Zahra Amalia', affiliation: 'Work Coffee - Jakarta' },
];

function buildDefaultSampleTournament(): Tournament {
  const participants: Participant[] = sampleBrewers.map((b, idx) => ({
    id: `p_${idx + 1}`,
    name: b.name,
    affiliation: b.affiliation,
    photo: '',
    seed: idx + 1,
  }));

  const generated = createCoffee28Bracket(participants);

  for (let i = 0; i < 14; i++) {
    const matchId = `b${i + 1}`;
    const pA = participants[i * 2];
    const pB = participants[i * 2 + 1];

    if (generated.matches[matchId]) {
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
  }

  return {
    id: 'trn_sample_28',
    userId: 'user_admin',
    title: 'Manual Brewing Throwdown 2026',
    subtitle: 'Bagan Knockdown 28 Peserta TV Display',
    location: 'Main Stage Arena',
    date: '10 - 11 Oktober 2026',
    format: 'coffee-28',
    status: 'in_progress',
    participants,
    unassignedParticipantIds: [],
    rounds: generated.rounds,
    matches: generated.matches,
    grandFinalists: generated.grandFinalists,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface LocalDatabase {
  users: User[];
  tournaments: Tournament[];
}

function getInitialDb(): LocalDatabase {
  const defaultAdmin: User = {
    id: 'user_admin',
    username: 'admin',
    passwordHash: 'admin123',
    name: 'Panitia Turnamen',
    createdAt: new Date().toISOString(),
  };

  return {
    users: [defaultAdmin],
    tournaments: [buildDefaultSampleTournament()],
  };
}

function loadDb(): LocalDatabase {
  if (typeof window === 'undefined') return getInitialDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.tournaments || parsed.tournaments.length === 0) {
      parsed.tournaments = [buildDefaultSampleTournament()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Error loading local DB', e);
    return getInitialDb();
  }
}

function saveDb(data: LocalDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving local DB', e);
  }
}

export const clientDb = {
  // Session & Auth
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        // Default login as admin for seamless experience
        const db = loadDb();
        const admin = db.users[0];
        if (admin) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
          return admin;
        }
        return null;
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  login(username: string, password: string): { user?: User; error?: string } {
    const db = loadDb();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!user || user.passwordHash !== password) {
      return { error: 'Username atau password salah' };
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
    return { user };
  },

  register(username: string, password: string, name: string): { user?: User; error?: string } {
    const db = loadDb();
    const exists = db.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (exists) {
      return { error: 'Username sudah digunakan' };
    }
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: username.trim(),
      passwordHash: password,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    }
    return { user: newUser };
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  // Tournaments CRUD
  getTournaments(): Tournament[] {
    const db = loadDb();
    return db.tournaments.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getTournamentById(id: string): Tournament | null {
    const db = loadDb();
    const t = db.tournaments.find((item) => item.id === id);
    if (!t) return null;

    // Auto-heal / sync bracket if participant count doesn't match round 1 capacity
    const pCount = t.participants?.length || 0;
    if (pCount > 0) {
      const round0MatchIds = (t.rounds?.[0]?.matchIds || []).filter((m) => !m.includes('bye'));
      const capacity = round0MatchIds.length * 2;
      if (capacity < pCount || round0MatchIds.length === 0) {
        const generated = createDynamicBracket(
          t.participants,
          t.format === 'coffee-28' ? 'throwdown' : 'knockout'
        );
        t.rounds = generated.rounds;
        t.matches = generated.matches;
        t.grandFinalists = generated.grandFinalists;
        this.saveTournament(t);
      }
    }

    return t;
  },

  saveTournament(tournament: Tournament): Tournament {
    const db = loadDb();
    tournament.updatedAt = new Date().toISOString();
    tournament.createdAt = tournament.createdAt || new Date().toISOString();

    const idx = db.tournaments.findIndex((t) => t.id === tournament.id);
    if (idx >= 0) {
      db.tournaments[idx] = tournament;
    } else {
      db.tournaments.push(tournament);
    }
    saveDb(db);
    return tournament;
  },

  deleteTournament(id: string): boolean {
    const db = loadDb();
    const lenBefore = db.tournaments.length;
    db.tournaments = db.tournaments.filter((t) => t.id !== id);
    if (db.tournaments.length !== lenBefore) {
      saveDb(db);
      return true;
    }
    return false;
  },

  seedSampleTournament(): Tournament {
    const db = loadDb();
    const sample = buildDefaultSampleTournament();
    sample.id = `trn_sample_${Date.now()}`;
    db.tournaments.unshift(sample);
    saveDb(db);
    return sample;
  },

  // Data Export & Import (JSON)
  exportData(): string {
    const db = loadDb();
    return JSON.stringify(db, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.tournaments || !Array.isArray(parsed.tournaments)) {
        return false;
      }
      saveDb(parsed);
      return true;
    } catch {
      return false;
    }
  },
};
