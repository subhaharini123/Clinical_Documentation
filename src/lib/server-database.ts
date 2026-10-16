import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { EncryptedRecord } from './crypto.js';

let database: DatabaseSync | undefined;
let neonSql: NeonQueryFunction<false, false> | undefined;
let initialization: Promise<void> | undefined;

export function initializeDatabase(): Promise<void> {
  if (!initialization) {
    initialization = initialize();
  }
  return initialization;
}

async function initialize(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    neonSql = neon(databaseUrl);
    await neonSql`
      CREATE TABLE IF NOT EXISTS encrypted_consultations (
        id TEXT PRIMARY KEY,
        record_json JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await neonSql`
      CREATE INDEX IF NOT EXISTS encrypted_consultations_expires_at
        ON encrypted_consultations(expires_at)
    `;
    return;
  }

  if (process.env.VERCEL === '1') {
    throw new Error('DATABASE_URL must be configured for the Vercel deployment');
  }

  const databasePath = path.resolve(
    process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'clinicnote.sqlite')
  );
  mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS encrypted_consultations (
      id TEXT PRIMARY KEY,
      record_json TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS encrypted_consultations_expires_at
      ON encrypted_consultations(expires_at);
  `);
}

function getDatabase(): DatabaseSync {
  if (!database) throw new Error('SQLite database has not been initialized');
  return database;
}

export async function saveEncryptedConsultation(record: EncryptedRecord): Promise<void> {
  await initializeDatabase();
  if (neonSql) {
    await neonSql`
      INSERT INTO encrypted_consultations (id, record_json, expires_at)
      VALUES (${record.id}, ${JSON.stringify(record)}::jsonb, ${record.expiresAt})
      ON CONFLICT (id) DO UPDATE SET
        record_json = EXCLUDED.record_json,
        expires_at = EXCLUDED.expires_at
    `;
    return;
  }

  getDatabase().prepare(`
    INSERT INTO encrypted_consultations (id, record_json, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      record_json = excluded.record_json,
      expires_at = excluded.expires_at
  `).run(record.id, JSON.stringify(record), record.expiresAt);
}

export async function getEncryptedConsultations(): Promise<EncryptedRecord[]> {
  await initializeDatabase();
  if (neonSql) {
    const rows = await neonSql`
      SELECT record_json
      FROM encrypted_consultations
      WHERE expires_at > ${new Date().toISOString()}
      ORDER BY created_at DESC
    `;
    return rows.map((row) => {
      const record: unknown = row.record_json;
      return typeof record === 'string'
        ? JSON.parse(record) as EncryptedRecord
        : record as EncryptedRecord;
    });
  }

  const db = getDatabase();
  db.prepare('DELETE FROM encrypted_consultations WHERE expires_at <= ?')
    .run(new Date().toISOString());
  return db
    .prepare('SELECT record_json FROM encrypted_consultations ORDER BY rowid DESC')
    .all()
    .map((row) => JSON.parse(String(row.record_json)) as EncryptedRecord);
}

export async function deleteEncryptedConsultation(id: string): Promise<void> {
  await initializeDatabase();
  if (neonSql) {
    await neonSql`DELETE FROM encrypted_consultations WHERE id = ${id}`;
    return;
  }

  getDatabase().prepare('DELETE FROM encrypted_consultations WHERE id = ?').run(id);
}
