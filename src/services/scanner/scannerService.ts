/**
 * Scanner Service
 * 
 * Handles:
 * - Fetching registrations from Firestore
 * - Syncing attendance to Firestore
 * - Online/offline status management
 */

import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import {
    cacheRegistrations,
    getCachedRegistration,
    getCachedRegistrationsForEvent,
    markAttendanceLocal,
    getPendingSyncEntries,
    markSynced,
    isCacheValid,
    getCacheMetadata,
    clearExpiredCaches,
    clearOldSyncedEntries,
    getAttendanceStats,
    type CachedRegistration,
    type CacheMetadata,
} from './scannerDb';

// ===== TYPES =====

export interface ScanResult {
    success: boolean;
    status: 'valid' | 'already-scanned' | 'invalid' | 'error';
    registration?: CachedRegistration;
    message: string;
}

export interface EventForScanning {
    id: string;
    title: string;
    date: string;
    registrationCount: number;
}

// ===== FETCH REGISTRATIONS =====

/**
 * Fetch all registrations for an event from Firestore
 */
export const fetchEventRegistrations = async (eventId: string): Promise<CachedRegistration[]> => {
    const registrationsRef = collection(db, 'event_reg');
    const q = query(registrationsRef, where('eventId', '==', eventId));
    const snapshot = await getDocs(q);

    const registrations: CachedRegistration[] = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        registrations.push({
            qrSignature: data.qrSignature,
            registrationId: data.registrationId,
            orbitId: data.orbitId,
            eventId: data.eventId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            collegeName: data.collegeName,
            attendanceMarked: data.attendanceStatus || false,
            markedAt: data.checkInTime || undefined,
            markedBy: data.checkedInBy || undefined,
        });
    });

    return registrations;
};

/**
 * Download and cache registrations for an event
 */
export const downloadAndCacheRegistrations = async (
    eventId: string,
    eventName: string
): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
        const registrations = await fetchEventRegistrations(eventId);
        await cacheRegistrations(eventId, eventName, registrations);
        return { success: true, count: registrations.length };
    } catch (error) {
        console.error('Error downloading registrations:', error);
        return { success: false, count: 0, error: String(error) };
    }
};

/**
 * Get events that have registrations (for scanner dropdown)
 */
export const getEventsForScanning = async (): Promise<EventForScanning[]> => {
    // First get all events
    const eventsRef = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsRef);

    const events: EventForScanning[] = [];

    for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();

        // Skip past events or events without registration
        if (eventData.isPast) continue;

        // Count registrations for this event
        const regRef = collection(db, 'event_reg');
        const regQuery = query(regRef, where('eventId', '==', eventDoc.id));
        const regSnapshot = await getDocs(regQuery);

        if (regSnapshot.size > 0) {
            events.push({
                id: eventDoc.id,
                title: eventData.title || 'Untitled Event',
                date: eventData.date || '',
                registrationCount: regSnapshot.size,
            });
        }
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return events;
};

// ===== SCAN VERIFICATION =====

/**
 * Verify QR code and return registration info
 */
export const verifyQrCode = async (
    qrSignature: string,
    eventId: string
): Promise<ScanResult> => {
    try {
        const registration = await getCachedRegistration(qrSignature);

        if (!registration) {
            return {
                success: false,
                status: 'invalid',
                message: 'QR code not found. Not registered for this event.',
            };
        }

        if (registration.eventId !== eventId) {
            return {
                success: false,
                status: 'invalid',
                message: 'This QR is for a different event.',
            };
        }

        if (registration.attendanceMarked) {
            return {
                success: true,
                status: 'already-scanned',
                registration,
                message: `Already checked in at ${formatTime(registration.markedAt)}`,
            };
        }

        return {
            success: true,
            status: 'valid',
            registration,
            message: 'Valid registration. Ready to mark attendance.',
        };
    } catch (error) {
        console.error('Error verifying QR:', error);
        return {
            success: false,
            status: 'error',
            message: 'Error verifying QR code.',
        };
    }
};

/**
 * Mark attendance (locally, with sync queue)
 */
export const markAttendance = async (
    qrSignature: string,
    adminOrbitId: string
): Promise<{ success: boolean; registration?: CachedRegistration; error?: string }> => {
    try {
        const registration = await markAttendanceLocal(qrSignature, adminOrbitId);
        if (!registration) {
            return { success: false, error: 'Registration not found in cache' };
        }

        // Try to sync immediately if online
        if (navigator.onLine) {
            await syncPendingAttendance();
        }

        return { success: true, registration };
    } catch (error) {
        console.error('Error marking attendance:', error);
        return { success: false, error: String(error) };
    }
};

// ===== SYNC OPERATIONS =====

/**
 * Sync pending attendance marks to Firestore
 */
export const syncPendingAttendance = async (): Promise<{ synced: number; failed: number }> => {
    const pending = await getPendingSyncEntries();
    let synced = 0;
    let failed = 0;

    for (const entry of pending) {
        try {
            // Update Firestore document
            const docId = `${entry.eventId}_${entry.registrationId}`;
            const docRef = doc(db, 'event_reg', docId);

            await updateDoc(docRef, {
                attendanceStatus: true,
                checkInTime: entry.markedAt,
                checkedInBy: entry.markedBy,
            });

            await markSynced(entry.id);
            synced++;
        } catch (error) {
            console.error('Error syncing attendance:', error);
            failed++;
        }
    }

    return { synced, failed };
};

// ===== UTILITY FUNCTIONS =====

/**
 * Format timestamp for display
 */
const formatTime = (isoString?: string): string => {
    if (!isoString) return 'Unknown time';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return 'Unknown time';
    }
};

/**
 * Initialize scanner service (cleanup expired caches)
 */
export const initializeScannerService = async (): Promise<void> => {
    await clearExpiredCaches();
    await clearOldSyncedEntries();
};

// Re-export from scannerDb for convenience
export {
    getCachedRegistrationsForEvent,
    isCacheValid,
    getCacheMetadata,
    getAttendanceStats,
    type CachedRegistration,
    type CacheMetadata,
};
