import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

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
  affiliation?: string;
  photo?: string;
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
  loserMatchId?: string | null;
  loserMatchSlot?: 'A' | 'B' | null;
}

export interface GrandFinalist {
  id: string;
  name: string;
  affiliation?: string;
  photo?: string;
  sourceLabel: string;
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
  status: 'draft' | 'in_progress' | 'completed';
  participants: Participant[];
  unassignedParticipantIds?: string[];
  rounds: Round[];
  matches: Record<string, Match>;
  grandFinalists?: GrandFinalist[];
  champion?: {
    first?: Participant | null;
    second?: Participant | null;
    third?: Participant | null;
  };
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

/* ========================================================
   POSTGRESQL ADAPTER (Cloud / VPS)
======================================================== */
let pgPool: Pool | null = null;
let pgInitialized = false;

function getPgPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return null;

  if (!pgPool) {
    const isSslDisabled =
      connectionString.includes('sslmode=disable') ||
      process.env.DATABASE_SSL === 'false' ||
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1');

    pgPool = new Pool({
      connectionString,
      ssl: isSslDisabled ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pgPool;
}

async function ensurePgSchema(pool: Pool) {
  if (pgInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO users (id, username, password_hash, name)
      VALUES ('user_admin', 'admin', 'admin123', 'Panitia Turnamen')
      ON CONFLICT (id) DO NOTHING;
    `);
    pgInitialized = true;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err);
  }
}

/* ========================================================
   FILE-BASED ADAPTER (Localhost / Fallback)
======================================================== */
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tournament_db.json');

function ensureFileDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [
        {
          id: 'user_admin',
          username: 'admin',
          passwordHash: 'admin123',
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

function writeFileDb(data: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

/* ========================================================
   ASYNC DATABASE OPERATIONS (Auto-selects PG or File)
======================================================== */

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      username: r.username,
      passwordHash: r.password_hash,
      name: r.name,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  }

  const db = ensureFileDb();
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function getUserById(id: string): Promise<User | undefined> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id,
      username: r.username,
      passwordHash: r.password_hash,
      name: r.name,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  }

  const db = ensureFileDb();
  return db.users.find((u) => u.id === id);
}

export async function createUser(username: string, password: string, name: string): Promise<User> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
    if (existing.rows.length > 0) {
      throw new Error('Username sudah terdaftar');
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username,
      passwordHash: password,
      name,
      createdAt: new Date().toISOString(),
    };

    await pool.query(
      'INSERT INTO users (id, username, password_hash, name, created_at) VALUES ($1, $2, $3, $4, $5)',
      [newUser.id, newUser.username, newUser.passwordHash, newUser.name, newUser.createdAt]
    );
    return newUser;
  }

  const db = ensureFileDb();
  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    throw new Error('Username sudah terdaftar');
  }

  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username,
    passwordHash: password,
    name,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeFileDb(db);
  return newUser;
}

export async function getTournamentsByUser(userId: string): Promise<Tournament[]> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    const res = await pool.query(
      'SELECT data FROM tournaments WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return res.rows.map((r) => r.data as Tournament);
  }

  const db = ensureFileDb();
  return db.tournaments
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getTournamentById(id: string): Promise<Tournament | undefined> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    const res = await pool.query('SELECT data FROM tournaments WHERE id = $1 LIMIT 1', [id]);
    if (res.rows.length === 0) return undefined;
    return res.rows[0].data as Tournament;
  }

  const db = ensureFileDb();
  return db.tournaments.find((t) => t.id === id);
}

export async function saveTournament(tournament: Tournament): Promise<Tournament> {
  tournament.updatedAt = new Date().toISOString();
  tournament.createdAt = tournament.createdAt || new Date().toISOString();

  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    await pool.query(
      `INSERT INTO tournaments (id, user_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [tournament.id, tournament.userId, JSON.stringify(tournament), tournament.createdAt, tournament.updatedAt]
    );
    return tournament;
  }

  const db = ensureFileDb();
  const index = db.tournaments.findIndex((t) => t.id === tournament.id);

  if (index >= 0) {
    db.tournaments[index] = tournament;
  } else {
    db.tournaments.push(tournament);
  }

  writeFileDb(db);
  return tournament;
}

export async function deleteTournament(id: string, userId: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    await ensurePgSchema(pool);
    const res = await pool.query('DELETE FROM tournaments WHERE id = $1 AND user_id = $2', [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  const db = ensureFileDb();
  const initialLength = db.tournaments.length;
  db.tournaments = db.tournaments.filter((t) => !(t.id === id && t.userId === userId));
  if (db.tournaments.length !== initialLength) {
    writeFileDb(db);
    return true;
  }
  return false;
}
