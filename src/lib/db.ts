import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string;
  affiliation?: string; // e.g. "Ombay Coffee", "Jakarta", etc.
  photo?: string; // base64 or url
  seed?: number;
}

export interface MatchSlot {
  participantId?: string;
  name?: string;
  affiliation?: string;
  photo?: string;
  isBye?: boolean;
}

export interface Match {
  id: string;
  matchNumber: number;
  label: string;
  roundIndex: number;
  participantA?: MatchSlot | null;
  participantB?: MatchSlot | null;
  winnerId?: string | null;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  nextMatchId?: string | null;
  nextMatchSlot?: 'A' | 'B' | null;
  loserMatchId?: string | null; // For Last Chance battle
  loserMatchSlot?: 'A' | 'B' | null;
}

export interface GrandFinalist {
  id: string;
  name: string;
  affiliation?: string;
  photo?: string;
  sourceLabel: string; // e.g. "Pemenang Battle 25", "Last Chance Winner"
  rank?: 1 | 2 | 3;
}

export interface Round {
  index: number;
  name: string;
  subTitle: string;
  matchIds: string[];
}

export interface Tournament {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  location: string;
  date: string;
  format: 'coffee-28' | 'knockout-standard';
  status: 'draft' | 'drawn' | 'in_progress' | 'completed';
  participants: Participant[];
  unassignedParticipantIds: string[];
  rounds: Round[];
  matches: Record<string, Match>;
  grandFinalists?: GrandFinalist[];
  winners?: {
    first?: Participant | null;
    second?: Participant | null;
    third?: Participant | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  users: User[];
  tournaments: Tournament[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tournament_db.json');

function ensureDbExists(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [
        {
          id: 'user_admin',
          username: 'admin',
          passwordHash: 'admin123', // Demo password
          name: 'Panitia Turnamen',
          createdAt: new Date().toISOString(),
        },
      ],
      tournaments: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse db file, reinitializing', err);
    const initialData: DatabaseSchema = {
      users: [],
      tournaments: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
}

function writeDb(data: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// User operations
export function getUserByUsername(username: string): User | undefined {
  const db = ensureDbExists();
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  const db = ensureDbExists();
  return db.users.find((u) => u.id === id);
}

export function createUser(username: string, password: string, name: string): User {
  const db = ensureDbExists();
  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    throw new Error('Username sudah terdaftar');
  }

  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username,
    passwordHash: password, // For production use bcrypt, plain hash acceptable for local app
    name,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

// Tournament operations
export function getTournamentsByUser(userId: string): Tournament[] {
  const db = ensureDbExists();
  return db.tournaments
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getTournamentById(id: string): Tournament | undefined {
  const db = ensureDbExists();
  return db.tournaments.find((t) => t.id === id);
}

export function saveTournament(tournament: Tournament): Tournament {
  const db = ensureDbExists();
  const index = db.tournaments.findIndex((t) => t.id === tournament.id);
  tournament.updatedAt = new Date().toISOString();

  if (index >= 0) {
    db.tournaments[index] = tournament;
  } else {
    tournament.createdAt = tournament.createdAt || new Date().toISOString();
    db.tournaments.push(tournament);
  }

  writeDb(db);
  return tournament;
}

export function deleteTournament(id: string, userId: string): boolean {
  const db = ensureDbExists();
  const initialLength = db.tournaments.length;
  db.tournaments = db.tournaments.filter((t) => !(t.id === id && t.userId === userId));
  if (db.tournaments.length !== initialLength) {
    writeDb(db);
    return true;
  }
  return false;
}
