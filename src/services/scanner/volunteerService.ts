/**
 * Volunteer Service
 * 
 * Handles volunteer assignment for event scanning:
 * - Assign/remove volunteers by OrbitX ID
 * - Check if user is a volunteer for any active event
 * - Get volunteer's assigned events
 */

import { db } from '../firebase/config';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
} from 'firebase/firestore';

// ===== TYPES =====

export interface EventVolunteer {
    id: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    volunteerOrbitId: string;
    volunteerName: string;
    assignedBy: string;
    assignedAt: string;
    isActive: boolean;
}

export interface VolunteerAssignment {
    eventId: string;
    eventName: string;
    eventDate: string;
    assignedBy: string;
    assignedAt: string;
}

// ===== VOLUNTEER MANAGEMENT (Admin Functions) =====

/**
 * Assign a volunteer to an event
 */
export const assignVolunteer = async (
    eventId: string,
    eventName: string,
    eventDate: string,
    volunteerOrbitId: string,
    adminOrbitId: string
): Promise<{ success: boolean; volunteer?: EventVolunteer; error?: string }> => {
    try {
        // Check if volunteer is already assigned to this event
        const existing = await getVolunteerForEvent(eventId, volunteerOrbitId);
        if (existing) {
            return { success: false, error: 'This user is already assigned to this event' };
        }

        // Look up volunteer's name from users collection
        let volunteerName = volunteerOrbitId; // Fallback to OrbitX ID

        // Try users collection first
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('orbitId', '==', volunteerOrbitId));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            volunteerName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || volunteerOrbitId;
        } else {
            // Try admins collection
            const adminsRef = collection(db, 'admins');
            const adminQuery = query(adminsRef, where('orbitId', '==', volunteerOrbitId));
            const adminSnapshot = await getDocs(adminQuery);

            if (!adminSnapshot.empty) {
                const adminData = adminSnapshot.docs[0].data();
                volunteerName = `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() || volunteerOrbitId;
            } else {
                return { success: false, error: 'OrbitX ID not found. User must be registered.' };
            }
        }

        // Create volunteer record
        const volunteerData = {
            eventId,
            eventName,
            eventDate,
            volunteerOrbitId,
            volunteerName,
            assignedBy: adminOrbitId,
            assignedAt: new Date().toISOString(),
            isActive: true,
        };

        const docRef = await addDoc(collection(db, 'event_volunteers'), volunteerData);

        return {
            success: true,
            volunteer: {
                id: docRef.id,
                ...volunteerData,
            },
        };
    } catch (error) {
        console.error('Error assigning volunteer:', error);
        return { success: false, error: 'Failed to assign volunteer' };
    }
};

/**
 * Remove a volunteer from an event
 */
export const removeVolunteer = async (volunteerId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'event_volunteers', volunteerId));
        return true;
    } catch (error) {
        console.error('Error removing volunteer:', error);
        return false;
    }
};

/**
 * Get all volunteers for an event
 */
export const getVolunteersForEvent = async (eventId: string): Promise<EventVolunteer[]> => {
    try {
        const volunteersRef = collection(db, 'event_volunteers');
        const q = query(
            volunteersRef,
            where('eventId', '==', eventId),
            where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as EventVolunteer[];
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        return [];
    }
};

/**
 * Get a specific volunteer for an event
 */
export const getVolunteerForEvent = async (
    eventId: string,
    volunteerOrbitId: string
): Promise<EventVolunteer | null> => {
    try {
        const volunteersRef = collection(db, 'event_volunteers');
        const q = query(
            volunteersRef,
            where('eventId', '==', eventId),
            where('volunteerOrbitId', '==', volunteerOrbitId),
            where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data(),
        } as EventVolunteer;
    } catch (error) {
        console.error('Error fetching volunteer:', error);
        return null;
    }
};

// ===== VOLUNTEER ACCESS CHECK (For Dashboard) =====

/**
 * Check if a user is assigned as volunteer for any active (non-past) event
 */
export const getVolunteerAssignments = async (
    userOrbitId: string
): Promise<VolunteerAssignment[]> => {
    try {
        const volunteersRef = collection(db, 'event_volunteers');
        const q = query(
            volunteersRef,
            where('volunteerOrbitId', '==', userOrbitId),
            where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return [];

        const assignments: VolunteerAssignment[] = [];
        const today = new Date().toISOString().split('T')[0];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Check if event is not past (simple date comparison)
            // For more accuracy, we'd check the events collection
            if (data.eventDate && data.eventDate >= today) {
                assignments.push({
                    eventId: data.eventId,
                    eventName: data.eventName,
                    eventDate: data.eventDate,
                    assignedBy: data.assignedBy,
                    assignedAt: data.assignedAt,
                });
            }
        }

        return assignments;
    } catch (error) {
        console.error('Error checking volunteer status:', error);
        return [];
    }
};

/**
 * Check if user has any active volunteer assignments
 */
export const hasVolunteerAccess = async (userOrbitId: string): Promise<boolean> => {
    const assignments = await getVolunteerAssignments(userOrbitId);
    return assignments.length > 0;
};

/**
 * Get event details for volunteer (includes verification that they're assigned)
 */
export const getVolunteerEventDetails = async (
    userOrbitId: string,
    eventId: string
): Promise<{ authorized: boolean; eventName?: string; eventDate?: string }> => {
    try {
        const volunteer = await getVolunteerForEvent(eventId, userOrbitId);

        if (!volunteer) {
            return { authorized: false };
        }

        return {
            authorized: true,
            eventName: volunteer.eventName,
            eventDate: volunteer.eventDate,
        };
    } catch (error) {
        console.error('Error getting volunteer event details:', error);
        return { authorized: false };
    }
};
