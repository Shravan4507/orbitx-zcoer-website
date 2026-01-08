/**
 * Scanner IndexedDB Service
 * 
 * Handles offline storage for QR scanner:
 * - Caches event registrations for offline scanning
 * - Stores pending attendance marks for sync
 * - Auto-clears data after 24 hours
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

// ===== TYPES =====

export interface CachedRegistration {
    qrSignature: string;
    registrationId: string;
    orbitId: string;
    eventId: string;
    firstName: string;
    lastName: string;
    email: string;
    collegeName: string;
    attendanceMarked: boolean;
    markedAt?: string;
    markedBy?: string;
}

export interface PendingSync {
    id: string;
    registrationId: string;
    eventId: string;
    qrSignature: string;
    markedAt: string;
    markedBy: string;
    synced: boolean;
}

export interface CacheMetadata {
    eventId: string;
    eventName: string;
    cachedAt: string;
    expiresAt: string;
    totalRegistrations: number;
}

// ===== DATABASE SCHEMA =====

interface ScannerDBSchema extends DBSchema {
    registrations: {
        key: string; // qrSignature
        value: CachedRegistration;
        indexes: {
            'by-event': string;
        };
    };
    pendingSync: {
        key: string; // id
        value: PendingSync;
        indexes: {
            'by-synced': number;
        };
    };
    metadata: {
        key: string; // eventId
        value: CacheMetadata;
    };
}

const DB_NAME = 'orbitx-scanner';
const DB_VERSION = 1;

// ===== DATABASE INITIALIZATION =====

let dbInstance: IDBPDatabase<ScannerDBSchema> | null = null;

const getDb = async (): Promise<IDBPDatabase<ScannerDBSchema>> => {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<ScannerDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Registrations store
            if (!db.objectStoreNames.contains('registrations')) {
                const regStore = db.createObjectStore('registrations', { keyPath: 'qrSignature' });
                regStore.createIndex('by-event', 'eventId');
            }

            // Pending sync store
            if (!db.objectStoreNames.contains('pendingSync')) {
                const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id' });
                syncStore.createIndex('by-synced', 'synced');
            }

            // Metadata store
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'eventId' });
            }
        },
    });

    return dbInstance;
};

// ===== REGISTRATION CACHE OPERATIONS =====

/**
 * Cache registrations for an event
 */
export const cacheRegistrations = async (
    eventId: string,
    eventName: string,
    registrations: CachedRegistration[]
): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(['registrations', 'metadata'], 'readwrite');

    // Clear existing registrations for this event
    const existingRegs = await tx.objectStore('registrations').index('by-event').getAllKeys(eventId);
    for (const key of existingRegs) {
        await tx.objectStore('registrations').delete(key);
    }

    // Add new registrations
    for (const reg of registrations) {
        await tx.objectStore('registrations').put(reg);
    }

    // Store metadata
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    await tx.objectStore('metadata').put({
        eventId,
        eventName,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        totalRegistrations: registrations.length,
    });

    await tx.done;
};

/**
 * Get cached registration by QR signature
 */
export const getCachedRegistration = async (qrSignature: string): Promise<CachedRegistration | null> => {
    const db = await getDb();
    const reg = await db.get('registrations', qrSignature);
    return reg || null;
};

/**
 * Get all cached registrations for an event
 */
export const getCachedRegistrationsForEvent = async (eventId: string): Promise<CachedRegistration[]> => {
    const db = await getDb();
    return await db.getAllFromIndex('registrations', 'by-event', eventId);
};

/**
 * Mark attendance in local cache
 */
export const markAttendanceLocal = async (
    qrSignature: string,
    markedBy: string
): Promise<CachedRegistration | null> => {
    const db = await getDb();
    const reg = await db.get('registrations', qrSignature);

    if (!reg) return null;

    const now = new Date().toISOString();
    const updatedReg: CachedRegistration = {
        ...reg,
        attendanceMarked: true,
        markedAt: now,
        markedBy,
    };

    await db.put('registrations', updatedReg);

    // Add to pending sync
    const syncEntry: PendingSync = {
        id: `${qrSignature}_${Date.now()}`,
        registrationId: reg.registrationId,
        eventId: reg.eventId,
        qrSignature,
        markedAt: now,
        markedBy,
        synced: false,
    };
    await db.put('pendingSync', syncEntry);

    return updatedReg;
};

/**
 * Get cache metadata for an event
 */
export const getCacheMetadata = async (eventId: string): Promise<CacheMetadata | null> => {
    const db = await getDb();
    const meta = await db.get('metadata', eventId);
    return meta || null;
};

/**
 * Check if cache is valid (not expired)
 */
export const isCacheValid = async (eventId: string): Promise<boolean> => {
    const meta = await getCacheMetadata(eventId);
    if (!meta) return false;

    const now = new Date();
    const expires = new Date(meta.expiresAt);
    return now < expires;
};

// ===== SYNC OPERATIONS =====

/**
 * Get all pending sync entries
 */
export const getPendingSyncEntries = async (): Promise<PendingSync[]> => {
    const db = await getDb();
    return await db.getAllFromIndex('pendingSync', 'by-synced', 0); // 0 = false
};

/**
 * Mark sync entry as synced
 */
export const markSynced = async (id: string): Promise<void> => {
    const db = await getDb();
    const entry = await db.get('pendingSync', id);
    if (entry) {
        entry.synced = true;
        await db.put('pendingSync', entry);
    }
};

/**
 * Get pending sync count
 */
export const getPendingSyncCount = async (): Promise<number> => {
    const entries = await getPendingSyncEntries();
    return entries.length;
};

// ===== CLEANUP OPERATIONS =====

/**
 * Clear expired caches
 */
export const clearExpiredCaches = async (): Promise<void> => {
    const db = await getDb();
    const allMeta = await db.getAll('metadata');
    const now = new Date();

    for (const meta of allMeta) {
        const expires = new Date(meta.expiresAt);
        if (now > expires) {
            // Clear registrations for this event
            const regs = await db.getAllKeysFromIndex('registrations', 'by-event', meta.eventId);
            const tx = db.transaction(['registrations', 'metadata'], 'readwrite');
            for (const key of regs) {
                await tx.objectStore('registrations').delete(key);
            }
            await tx.objectStore('metadata').delete(meta.eventId);
            await tx.done;
        }
    }
};

/**
 * Clear synced entries older than 1 hour
 */
export const clearOldSyncedEntries = async (): Promise<void> => {
    const db = await getDb();
    const allSync = await db.getAll('pendingSync');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const entry of allSync) {
        if (entry.synced) {
            const markedAt = new Date(entry.markedAt);
            if (markedAt < oneHourAgo) {
                await db.delete('pendingSync', entry.id);
            }
        }
    }
};

/**
 * Clear all data for an event
 */
export const clearEventCache = async (eventId: string): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(['registrations', 'metadata'], 'readwrite');

    const regKeys = await tx.objectStore('registrations').index('by-event').getAllKeys(eventId);
    for (const key of regKeys) {
        await tx.objectStore('registrations').delete(key);
    }
    await tx.objectStore('metadata').delete(eventId);

    await tx.done;
};

/**
 * Get attendance stats for cached event
 */
export const getAttendanceStats = async (eventId: string): Promise<{ total: number; attended: number }> => {
    const regs = await getCachedRegistrationsForEvent(eventId);
    const attended = regs.filter(r => r.attendanceMarked).length;
    return { total: regs.length, attended };
};
