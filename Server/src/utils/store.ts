import fs from 'node:fs/promises';
import path from 'node:path';

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'hdv' | 'guide';
  reset?: {
    otpHash: string;
    tokenHash: string;
    expiresAt: number;
  } | null;
};

type DbShape = {
  users: StoredUser[];
};

const dbPath = path.resolve(process.cwd(), 'data', 'users.json');

async function ensureDb() {
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    const init: DbShape = { users: [] };
    await fs.writeFile(dbPath, JSON.stringify(init, null, 2), 'utf8');
  }
}

async function readDb(): Promise<DbShape> {
  await ensureDb();
  const raw = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(raw) as DbShape;
}

async function writeDb(db: DbShape) {
  await ensureDb();
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

export async function findUserByEmail(email: string) {
  const db = await readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createUser(user: StoredUser) {
  const db = await readDb();
  db.users.push(user);
  await writeDb(db);
}

export async function updateUserByEmail(email: string, patch: Partial<StoredUser>) {
  const db = await readDb();
  const idx = db.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...patch };
  await writeDb(db);
  return db.users[idx];
}

