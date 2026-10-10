import { createCoffee28Bracket, createDynamicBracket } from './bracket-generator';
import { User, Tournament, Participant, Match, Round, GrandFinalist } from './db';

export type { User, Tournament, Participant, Match, Round, GrandFinalist };

const STORAGE_KEY = 'spinbracket_local_db_v1';
const SESSION_KEY = 'spinbracket_local_session_user';

export const JURNALOMBAY_API =
  typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000/api/tournaments'
        : (process.env.NEXT_PUBLIC_JURNALOMBAY_API || 'https://jurnalombay.my.id/api/tournaments'))
    : (process.env.JURNALOMBAY_API_URL || (process.env.NODE_ENV === 'production' ? 'https://jurnalombay.my.id/api/tournaments' : 'http://localhost:4000/api/tournaments'));

// Background sync functions with Jurnal Ombay master database
async function syncTournamentToBackend(tournament: Tournament) {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${JURNALOMBAY_API}/${tournament.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournament),
    });
  } catch (err) {
    console.warn('Backend sync notice (offline mode active):', err);
  }
}

async function syncTournamentDeleteToBackend(id: string) {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${JURNALOMBAY_API}/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Backend delete notice:', err);
  }
}

let hasInitialSynced = false;
async function initialSyncWithBackend() {
  if (typeof window === 'undefined' || hasInitialSynced) return;
  hasInitialSynced = true;
  try {
    const res = await fetch(JURNALOMBAY_API, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && Array.isArray(json.tournaments)) {
      const db = loadDb();
      let hasChanges = false;
      const backendTournaments: Tournament[] = json.tournaments;

      // 1. Merge backend tournaments into local
      backendTournaments.forEach((bTour) => {
        const localIdx = db.tournaments.findIndex((t) => t.id === bTour.id);
        if (localIdx === -1) {
          db.tournaments.push(bTour);
          hasChanges = true;
        } else {
          const bTime = new Date(bTour.updatedAt || 0).getTime();
          const lTime = new Date(db.tournaments[localIdx].updatedAt || 0).getTime();
          if (bTime > lTime) {
            db.tournaments[localIdx] = bTour;
            hasChanges = true;
          }
        }
      });

      // 2. Push any local tournaments that backend doesn't have yet up to backend
      for (const lTour of db.tournaments) {
        if (!backendTournaments.some((b) => b.id === lTour.id)) {
          syncTournamentToBackend(lTour);
        }
      }

      if (hasChanges) {
        saveDb(db);
        window.dispatchEvent(new CustomEvent('spinbracket_data_synced'));
      }
    }
  } catch (err) {
    console.warn('Initial backend sync notice (offline):', err);
  }
}

// Auto-trigger sync on load in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initialSyncWithBackend();
  }, 100);
}

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
  const round0MatchIds = generated.rounds[0]?.matchIds || [];

  for (let i = 0; i < round0MatchIds.length; i++) {
    const matchId = round0MatchIds[i];
    const pA = participants[i * 2];
    const pB = participants[i * 2 + 1];

    if (generated.matches[matchId] && pA && pB) {
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
    title: 'Tournament Throwdown 2026',
    subtitle: 'Bagan Knockdown Battle TV Display',
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
      const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('spinbracket_user');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      localStorage.setItem('spinbracket_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to set current user', e);
    }
  },

  getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';
    let id = localStorage.getItem('spinbracket_device_id');
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('spinbracket_device_id', id);
    }
    return id;
  },

  getDeviceName(): string {
    if (typeof window === 'undefined') return 'Perangkat Browser';
    const ua = navigator.userAgent;
    let os = 'Perangkat Komputer / HP';
    if (ua.includes('Win')) os = 'Windows PC';
    else if (ua.includes('Mac')) os = 'Mac / Apple';
    else if (ua.includes('Android')) os = 'Android Smartphone';
    else if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = 'Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';

    return `${browser} (${os})`;
  },

  getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('spinbracket_session_id');
  },

  setSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('spinbracket_session_id', sessionId);
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
      this.setCurrentUser(user);
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
      this.setCurrentUser(newUser);
    }
    return { user: newUser };
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      const u = this.getCurrentUser();
      const sid = this.getSessionId();
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('spinbracket_user');
      localStorage.removeItem('spinbracket_session_id');
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u?.id, sessionId: sid }),
        });
      } catch (e) {
        // offline fallback
      }
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

    // Auto-heal / sync bracket if participant count doesn't match round 1 capacity or needs Grand Final
    const pCount = t.participants?.length || 0;
    const hasAnyCompletedMatch = Object.values(t.matches || {}).some(
      (m) => m.status === 'completed' && !m.participantB?.isBye
    );

    if (pCount > 0 && !hasAnyCompletedMatch) {
      const round0MatchIds = (t.rounds?.[0]?.matchIds || []).filter((m) => !m.includes('bye'));
      const capacity = round0MatchIds.length * 2;
      const lastRound = t.rounds?.[t.rounds.length - 1];
      const hasGrandFinalMatch = lastRound?.matchIds?.some((m) => m.includes('grand_final'));

      if (capacity < pCount || round0MatchIds.length === 0 || !hasGrandFinalMatch) {
        const generated = createDynamicBracket(
          t.participants,
          t.format === 'coffee-28' ? 'throwdown' : 'knockout'
        );
        t.rounds = generated.rounds;
        t.matches = { ...generated.matches, ...t.matches };
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

    // Persist to Jurnal Ombay master database in background
    syncTournamentToBackend(tournament);

    return tournament;
  },

  deleteTournament(id: string): boolean {
    const db = loadDb();
    const lenBefore = db.tournaments.length;
    db.tournaments = db.tournaments.filter((t) => t.id !== id);
    if (db.tournaments.length !== lenBefore) {
      saveDb(db);
      // Delete from Jurnal Ombay master database
      syncTournamentDeleteToBackend(id);
      return true;
    }
    return false;
  },

  async fetchTournamentByIdAsync(id: string): Promise<Tournament | null> {
    try {
      const res = await fetch(`${JURNALOMBAY_API}/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.tournament) {
          const db = loadDb();
          const idx = db.tournaments.findIndex((t) => t.id === id);
          if (idx >= 0) {
            db.tournaments[idx] = json.tournament;
          } else {
            db.tournaments.push(json.tournament);
          }
          saveDb(db);
          return json.tournament;
        }
      }
    } catch (e) {
      // offline fallback
    }
    return this.getTournamentById(id);
  },

  async syncFromBackend(): Promise<Tournament[]> {
    try {
      const res = await fetch(JURNALOMBAY_API);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.tournaments)) {
          const db = loadDb();
          db.tournaments = json.tournaments;
          saveDb(db);
          return db.tournaments;
        }
      }
    } catch (e) {
      // offline fallback
    }
    return this.getTournaments();
  },

  seedSampleTournament(): Tournament {
    const db = loadDb();
    const sample = buildDefaultSampleTournament();
    sample.id = `trn_sample_${Date.now()}`;
    db.tournaments.unshift(sample);
    saveDb(db);
    syncTournamentToBackend(sample);
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
