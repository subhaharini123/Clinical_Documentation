/**
 * Cryptographic storage module for ClinicNote AI using standard Web Crypto API:
 * - PBKDF2 with 100,000 iterations for key derivation from doctor passphrase
 * - AES-GCM 256-bit encryption for authenticated confidentiality
 * - IndexedDB cache plus the local SQLite API for encrypted records
 */

const DB_NAME = 'ClinicNote_Vault_DB';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted_consultations';
const SETTINGS_STORE = 'vault_settings';

// Salt for PBKDF2 (16 bytes)
const PBKDF2_SALT = new TextEncoder().encode('ClinicNoteAI-Salt-2026-ClinicianVault');
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes for AES-GCM)
  version: number;
}

export interface EncryptedRecord {
  id: string; // consultation id
  patientNameEncrypted?: string;
  patientPseudonym: string; // e.g. "Patient SYN-8492" (for safe indexing)
  patientId: string;
  consultationDate: string;
  createdAt: string;
  expiresAt: string; // ISO string for auto-deletion
  retentionDays: number;
  encryptedData: EncryptedPayload;
  approvedBy: string;
  isEncrypted: boolean;
}

/**
 * Derives an AES-GCM CryptoKey from a user passphrase using PBKDF2.
 */
export async function deriveKeyFromPassphrase(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(passphrase);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: PBKDF2_SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an arbitrary object using AES-GCM 256-bit.
 */
export async function encryptData(data: any, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintext
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
    version: 1,
  };
}

/**
 * Decrypts an AES-GCM 256-bit encrypted payload.
 */
export async function decryptData(payload: EncryptedPayload, key: CryptoKey): Promise<any> {
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    ciphertext
  );

  const plaintext = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(plaintext);
}

// Helpers for Base64 conversion
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// IndexedDB Storage Helpers
function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save encrypted record into IndexedDB.
 */
export async function saveEncryptedRecordToDB(record: EncryptedRecord): Promise<void> {
  await saveRecordToIndexedDB(record);

  const response = await fetch('/api/vault/records', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    throw new Error(`Server database save failed (HTTP ${response.status})`);
  }
}

/**
 * Retrieve all encrypted records from IndexedDB.
 */
export async function getAllEncryptedRecordsFromDB(): Promise<EncryptedRecord[]> {
  const db = await openVaultDB();
  const localRecords = await new Promise<EncryptedRecord[]>((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  try {
    const response = await fetch('/api/vault/records');
    if (!response.ok) {
      throw new Error(`Server database read failed (HTTP ${response.status})`);
    }
    const data: { records: EncryptedRecord[] } = await response.json();
    const recordsById = new Map(localRecords.map((record) => [record.id, record]));
    data.records.forEach((record) => recordsById.set(record.id, record));
    const combinedRecords = Array.from(recordsById.values());
    await Promise.all(data.records.map((record) => saveRecordToIndexedDB(record)));
    return combinedRecords;
  } catch (error) {
    console.warn('[ClinicNote Vault] Using local encrypted records; server database unavailable:', error);
    return localRecords;
  }
}

function saveRecordToIndexedDB(record: EncryptedRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a specific record by ID.
 */
export async function deleteRecordFromDB(id: string): Promise<void> {
  const response = await fetch(`/api/vault/records/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Server database delete failed (HTTP ${response.status})`);
  }

  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Purge expired records based on `expiresAt` < now.
 * Returns count of deleted records.
 */
export async function purgeExpiredRecordsFromDB(): Promise<number> {
  const records = await getAllEncryptedRecordsFromDB();
  const now = new Date().getTime();
  let deletedCount = 0;

  for (const rec of records) {
    if (rec.expiresAt) {
      const expiry = new Date(rec.expiresAt).getTime();
      if (expiry <= now) {
        await deleteRecordFromDB(rec.id);
        deletedCount++;
      }
    }
  }

  return deletedCount;
}

/**
 * Saves vault retention settings (e.g. retentionDays).
 */
export async function saveRetentionSetting(days: number): Promise<void> {
  localStorage.setItem('clinicnote_retention_days', days.toString());
}

export function getRetentionSetting(): number {
  const val = localStorage.getItem('clinicnote_retention_days');
  return val ? parseInt(val, 10) : 30; // default 30 days
}
