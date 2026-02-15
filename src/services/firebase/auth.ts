// Authentication Service - Firebase Auth operations
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    deleteUser
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, deleteField } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';
import type { UserProfile, ApprovalStatus } from '@/types/user';

// ==================== ORBIT ID GENERATION ====================

/**
 * Generates user initials from first name only
 * - Takes first 3 letters of first name
 * - If less than 3 characters, pads with 'X'
 * - Converts to uppercase
 */
const generateInitials = (firstName: string): string => {
    let initials = firstName.substring(0, 3).toUpperCase();

    // Pad with 'X' if less than 3 characters
    while (initials.length < 3) {
        initials += 'X';
    }

    return initials.substring(0, 3);
};

/**
 * Finds the first missing number in a sorted array of numbers
 * Starting from 1, finds the first gap in the natural sequence
 * Example: [1, 2, 3, 5, 6] -> returns 4
 * Example: [1, 2, 3] -> returns 4 (next in sequence)
 */
const findFirstMissingNumber = (usedNumbers: number[]): number => {
    if (usedNumbers.length === 0) return 1;

    // Sort the numbers
    const sorted = [...usedNumbers].sort((a, b) => a - b);

    // Find the first gap starting from 1
    for (let i = 1; i <= sorted.length + 1; i++) {
        if (!sorted.includes(i)) {
            return i;
        }
    }

    // If no gap found, return next number after max
    return sorted[sorted.length - 1] + 1;
};

/**
 * Gets the next available Orbit ID number
 * Stores all used IDs and finds the first gap in the sequence
 */
const getNextOrbitIdNumber = async (): Promise<string> => {
    const registryRef = doc(db, 'system', 'orbitIdRegistry');
    const registryDoc = await getDoc(registryRef);

    let usedIds: number[] = [];

    if (!registryDoc.exists()) {
        // Initialize registry document if it doesn't exist
        await setDoc(registryRef, {
            usedIds: [1]
        });
        return '0001';
    }

    usedIds = registryDoc.data().usedIds || [];

    // Find the first missing number in the sequence
    const nextNumber = findFirstMissingNumber(usedIds);

    // Add this number to the used IDs array
    await updateDoc(registryRef, {
        usedIds: arrayUnion(nextNumber)
    });

    return String(nextNumber).padStart(4, '0');
};

/**
 * Generates a unique Orbit ID for user
 * Format: ORB-XXX-YYYY where XXX is first 3 letters of first name, YYYY is 4-digit number
 */
export const generateOrbitId = async (firstName: string): Promise<string> => {
    const initials = generateInitials(firstName);
    const number = await getNextOrbitIdNumber();
    return `ORB-${initials}-${number}`;
};

/**
 * Releases an Orbit ID number when user deletes account
 * Removes the number from the usedIds array, making it available for reuse
 */
export const releaseOrbitId = async (orbitId: string): Promise<void> => {
    const parts = orbitId.split('-');
    if (parts.length === 3) {
        const number = parseInt(parts[2], 10);
        if (!isNaN(number)) {
            const registryRef = doc(db, 'system', 'orbitIdRegistry');
            await updateDoc(registryRef, {
                usedIds: arrayRemove(number)
            });
        }
    }
};

// ==================== ACCOUNT DELETION ====================

/**
 * Deletes a user account completely
 * 1. Deletes Firestore user/admin document
 * 2. Releases the Orbit ID for reuse
 * 3. Deletes the Firebase Auth user
 */
export const deleteUserAccount = async (): Promise<void> => {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('No authenticated user found');
    }

    try {
        let orbitId: string | null = null;

        // Check if user exists in 'users' collection
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            orbitId = userData.orbitId;

            // Delete the Firestore user document
            await deleteDoc(userDocRef);
        }

        // Also check if user exists in 'admins' collection
        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDoc = await getDoc(adminDocRef);

        if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            // If we didn't get orbitId from users, get it from admins
            if (!orbitId) {
                orbitId = adminData.orbitId;
            }

            // Delete the Firestore admin document
            await deleteDoc(adminDocRef);
        }

        // Release the Orbit ID so it can be reused
        if (orbitId) {
            await releaseOrbitId(orbitId);
        }

        // Delete the Firebase Auth user
        // This must be done last as it signs out the user
        await deleteUser(user);

    } catch (error: any) {
        // If the error is about recent login, throw a specific error
        if (error.code === 'auth/requires-recent-login') {
            throw new Error('For security, please log out and log back in before deleting your account.');
        }
        throw error;
    }
};


// ==================== GOOGLE SIGN-IN ====================

/**
 * Signs in with Google
 * If new user, returns email and uid for signup completion (keeps user signed in)
 * If existing user, returns profile
 */
export const signInWithGoogle = async (): Promise<{ isNewUser: boolean; email?: string; uid?: string; profile?: UserProfile }> => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user already exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
        return {
            isNewUser: false,
            profile: userDoc.data() as UserProfile
        };
    }

    // Check if user is an admin
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
        return {
            isNewUser: false,
            profile: adminDoc.data() as UserProfile
        };
    }

    // New user - they need to complete signup
    // Keep them signed in so we can create their profile later
    return {
        isNewUser: true,
        email: user.email || undefined,
        uid: user.uid
    };
};

/**
 * Data required for completing Google signup (no password needed)
 */
export interface GoogleSignupData {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    qualificationLevel: string;
    stream: string;
    collegeName: string;
    courseName: string;
    yearOfStudy: string;
    yearOfGraduation: string;
}

/**
 * Completes registration for Google sign-in users
 * User is already authenticated via Google, creates Firestore profile
 */
export const completeGoogleSignup = async (
    profileData: GoogleSignupData
): Promise<UserProfile> => {
    // Get the current authenticated user (should be signed in via Google)
    const user = auth.currentUser;

    if (!user) {
        throw new Error('No authenticated user found. Please sign in with Google again.');
    }

    // Verify email matches
    if (user.email !== profileData.email) {
        throw new Error('Email mismatch. Please sign in with Google again.');
    }

    // Generate Orbit ID
    const orbitId = await generateOrbitId(profileData.firstName);

    // Create user profile with Google photo as avatar
    const userProfile: UserProfile = {
        uid: user.uid,
        orbitId,
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        mobile: profileData.mobile,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        qualificationLevel: profileData.qualificationLevel,
        stream: profileData.stream,
        collegeName: profileData.collegeName,
        courseName: profileData.courseName,
        yearOfStudy: profileData.yearOfStudy,
        yearOfGraduation: profileData.yearOfGraduation,
        avatar: user.photoURL || undefined, // Use Google profile photo
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        googleLinked: true
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    return userProfile;
};

// ==================== AUTH STATE ====================

/**
 * Signs out the current user
 */
export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

/**
 * Gets the current user profile
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
    }

    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
        return adminDoc.data() as UserProfile;
    }

    return null;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Check if user exists by email
 */
export const checkUserExistsByEmail = async (email: string): Promise<boolean> => {
    // Query users collection by email
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.some(doc => doc.data().email === email);
};

/**
 * Syncs the Google profile photo to the user's avatar
 * Call this when a Google user logs in to update their profile photo
 */
export const syncGooglePhoto = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user || !user.photoURL) return null;

    // Check if user exists in users collection
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
        const currentData = userDoc.data();
        // Only update if avatar is different or not set
        if (currentData.avatar !== user.photoURL) {
            await updateDoc(doc(db, 'users', user.uid), {
                avatar: user.photoURL,
                updatedAt: new Date().toISOString()
            });
        }
        return user.photoURL;
    }

    // Check if user is admin
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
        const currentData = adminDoc.data();
        if (currentData.avatar !== user.photoURL) {
            await updateDoc(doc(db, 'admins', user.uid), {
                avatar: user.photoURL,
                updatedAt: new Date().toISOString()
            });
        }
        return user.photoURL;
    }

    return null;
};

// ==================== ADMIN SIGNUP ====================

interface AdminSignupData {
    email: string;
    firstName: string;
    lastName: string;
    mobile: string;
    dateOfBirth: string;
    gender: string;
    team: string;
    position: string;
}

/**
 * Admin Orbit ID Number Ranges by Team/Position:
 * Leadership:
 *   0001 - President
 *   0002 - Chairman
 *   0003 - Secretary
 *   0004 - Treasurer
 *   0005 - Co-Treasurer
 * 
 * Teams (Team Leader gets first number, members FCFS):
 *   0006-0015 - Technical Team
 *   0016-0025 - Public Outreach Team
 *   0026-0035 - Documentation Team
 *   0036-0045 - Social Media & Editing Team
 *   0046-0055 - Design & Innovation Team
 *   0056-0065 - Management & Operations Team
 */

const getTeamCode = (team: string, position: string): string => {
    // Leadership positions have specific codes
    if (team === 'leadership') {
        const leadershipCodes: { [key: string]: string } = {
            'president': 'PR',
            'chairman': 'CH',
            'secretary': 'SC',
            'treasurer': 'TR',
            'co_treasurer': 'CT'
        };
        return leadershipCodes[position] || 'LD';
    }

    // Team codes for non-leadership teams
    const teamCodes: { [key: string]: string } = {
        'technical': 'TE',
        'public_outreach': 'PO',
        'documentation': 'DC',
        'social_media_editing': 'SM',
        'design_innovation': 'DI',
        'management_operations': 'MO'
    };
    return teamCodes[team] || 'XX';
};

// Team number ranges configuration
const TEAM_NUMBER_RANGES: { [key: string]: { start: number; end: number } } = {
    'technical': { start: 6, end: 15 },
    'public_outreach': { start: 16, end: 25 },
    'documentation': { start: 26, end: 35 },
    'social_media_editing': { start: 36, end: 45 },
    'design_innovation': { start: 46, end: 55 },
    'management_operations': { start: 56, end: 65 }
};

// Leadership position numbers
const LEADERSHIP_POSITION_NUMBERS: { [key: string]: number } = {
    'president': 1,
    'chairman': 2,
    'secretary': 3,
    'treasurer': 4,
    'co_treasurer': 5
};

/**
 * Gets the admin Orbit ID number based on team and position
 */
const getAdminOrbitIdNumber = async (team: string, position: string): Promise<string> => {
    const registryRef = doc(db, 'system', 'adminOrbitIdRegistry');
    const registryDoc = await getDoc(registryRef);

    let registryData: {
        usedNumbers: number[];
        teamCounters: { [key: string]: number };
    } = {
        usedNumbers: [],
        teamCounters: {}
    };

    if (registryDoc.exists()) {
        registryData = registryDoc.data() as typeof registryData;
    }

    let assignedNumber: number;

    // Handle Leadership positions (fixed numbers)
    if (team === 'leadership') {
        assignedNumber = LEADERSHIP_POSITION_NUMBERS[position];

        if (!assignedNumber) {
            throw new Error(`Invalid leadership position: ${position}`);
        }

        // Check if this position is already taken
        if (registryData.usedNumbers?.includes(assignedNumber)) {
            throw { code: 'position-taken', message: `The ${position} position is already filled.` };
        }
    } else {
        // Handle team positions
        const range = TEAM_NUMBER_RANGES[team];

        if (!range) {
            throw new Error(`Invalid team: ${team}`);
        }

        // Team Leader gets the first number in the range
        if (position === 'team_leader') {
            assignedNumber = range.start;

            if (registryData.usedNumbers?.includes(assignedNumber)) {
                throw { code: 'position-taken', message: 'The Team Leader position for this team is already filled.' };
            }
        } else {
            // Members get next available number in range (FCFS)
            const teamCurrentCounter = registryData.teamCounters?.[team] || range.start;

            // Find next available number in range
            assignedNumber = teamCurrentCounter + 1;

            // If team leader position was taken, start from start+1
            if (assignedNumber === range.start) {
                assignedNumber = range.start + 1;
            }

            // Find first available number
            while (registryData.usedNumbers?.includes(assignedNumber) && assignedNumber <= range.end) {
                assignedNumber++;
            }

            if (assignedNumber > range.end) {
                throw { code: 'team-full', message: 'This team has reached its maximum capacity of 10 members.' };
            }
        }
    }

    // Update registry
    const updatedUsedNumbers = [...(registryData.usedNumbers || []), assignedNumber];
    const updatedTeamCounters = {
        ...(registryData.teamCounters || {}),
        [team]: assignedNumber
    };

    await setDoc(registryRef, {
        usedNumbers: updatedUsedNumbers,
        teamCounters: updatedTeamCounters
    });

    return String(assignedNumber).padStart(4, '0');
};

/**
 * Generates admin Orbit ID
 * Format: ORB-XXX-TT-NNNN
 */
export const generateAdminOrbitId = async (firstName: string, team: string, position: string): Promise<string> => {
    const initials = generateInitials(firstName);
    const teamCode = getTeamCode(team, position);
    const number = await getAdminOrbitIdNumber(team, position);
    return `ORB-${initials}-${teamCode}-${number}`;
};

/**
 * Complete admin signup after Google authentication
 */
export const completeAdminSignup = async (profileData: AdminSignupData) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('No authenticated user found. Please sign in with Google first.');
    }

    // Check if already registered as user
    const existingUser = await getDoc(doc(db, 'users', user.uid));
    if (existingUser.exists()) {
        throw { code: 'already-registered-user', message: 'This email is already registered as a regular user.' };
    }

    // Check if already registered as admin
    const existingAdmin = await getDoc(doc(db, 'admins', user.uid));
    if (existingAdmin.exists()) {
        throw { code: 'already-registered-admin', message: 'This email is already registered as an admin.' };
    }

    // Verify email matches
    if (user.email !== profileData.email) {
        throw new Error('Email mismatch. Please sign in with Google again.');
    }

    // Generate Admin Orbit ID
    const orbitId = await generateAdminOrbitId(profileData.firstName, profileData.team, profileData.position);

    // Map team to admin role
    const teamToAdminRole: { [key: string]: string } = {
        'leadership': 'LEADERSHIP',
        'design_innovation': 'DESIGN_INNOVATION',
        'technical': 'TECHNICAL',
        'management_operations': 'MANAGEMENT_OPERATIONS',
        'public_outreach': 'PUBLIC_OUTREACH',
        'documentation': 'DOCUMENTATION',
        'social_media_editing': 'SOCIAL_MEDIA'
    };

    // Create admin profile
    const adminProfile = {
        uid: user.uid,
        orbitId,
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        mobile: profileData.mobile,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        team: profileData.team,
        position: profileData.position,
        adminRole: [teamToAdminRole[profileData.team] || 'MEMBER'],
        permissions: [], // Permissions will be assigned later by super admin
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        googleLinked: true
    };

    // Save to admins collection
    await setDoc(doc(db, 'admins', user.uid), adminProfile);

    return adminProfile;
};

/**
 * Check if admin exists by email
 */
export const checkAdminExistsByEmail = async (email: string): Promise<boolean> => {
    const adminsQuery = query(collection(db, 'admins'));
    const snapshot = await getDocs(adminsQuery);
    return snapshot.docs.some(doc => doc.data().email === email);
};

/**
 * Update admin's public profile for member card display
 * Sets status to 'pending' for approval by admin with MANAGE_MEMBERS permission
 */
export const updateAdminPublicProfile = async (uid: string, publicProfile: {
    displayImage?: string;
    academicYear?: string;
    major?: string;
    division?: string;
    graduationYear?: string;
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        snapchat?: string;
        linkedin?: string;
        github?: string;
        twitter?: string;
        whatsapp?: string;
        contactNumber?: string;
    };
    isProfilePublic?: boolean;
}): Promise<void> => {
    const adminRef = doc(db, 'admins', uid);
    const adminDoc = await getDoc(adminRef);

    if (!adminDoc.exists()) {
        throw new Error('Admin profile not found');
    }

    // Always set to pending when profile is updated
    const updatedProfile = {
        ...publicProfile,
        approvalStatus: 'pending',
        submittedAt: new Date().toISOString(),
        // Clear previous review data
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null
    };

    await setDoc(adminRef, {
        ...adminDoc.data(),
        publicProfile: updatedProfile,
        updatedAt: new Date().toISOString()
    }, { merge: true });
};

/**
 * Fetch all public admin profiles for members gallery
 * Only returns APPROVED profiles with isProfilePublic === true
 */
export const getPublicAdminProfiles = async () => {
    try {
        // Fetch from the clean, public-only collection
        const q = query(collection(db, 'public_members'));
        const snapshot = await getDocs(q);

        return snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    uid: data.uid,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    dateOfBirth: data.dateOfBirth || '',
                    team: data.team,
                    position: data.position,
                    publicProfile: data.publicProfile || {}
                };
            })
            .filter(admin => {
                const pp = admin.publicProfile;
                // Double check visibility in case it was toggled off without removing from collection
                return (
                    pp?.approvalStatus === 'approved' &&
                    pp?.isProfilePublic !== false &&
                    admin.firstName &&
                    admin.firstName.trim() !== ''
                );
            });
    } catch (error) {
        console.error('Error fetching public members:', error);
        return [];
    }
};

/**
 * Fetch all admin profiles pending approval
 * For admins with MANAGE_MEMBERS permission
 */
export const getPendingAdminProfiles = async () => {
    const adminsQuery = query(collection(db, 'admins'));
    const snapshot = await getDocs(adminsQuery);

    return snapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                uid: data.uid,
                orbitId: data.orbitId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                dateOfBirth: data.dateOfBirth,
                team: data.team,
                position: data.position,
                publicProfile: data.publicProfile || {}
            };
        })
        .filter(admin =>
            // Only include if profile has pending status
            admin.publicProfile?.approvalStatus === 'pending' &&
            admin.firstName &&
            admin.firstName.trim() !== ''
        );
};

/**
 * Approve admin profile for members gallery
 */
export const approveAdminProfile = async (uid: string, reviewerOrbitId: string): Promise<void> => {
    const adminRef = doc(db, 'admins', uid);
    const adminDoc = await getDoc(adminRef);

    if (!adminDoc.exists()) {
        throw new Error('Admin profile not found');
    }

    const currentData = adminDoc.data();
    const updatedProfile = {
        ...currentData.publicProfile,
        approvalStatus: 'approved' as ApprovalStatus,
        reviewedBy: reviewerOrbitId,
        reviewedAt: new Date().toISOString(),
        rejectionReason: null
    };

    // 1. Update master admin record
    await setDoc(adminRef, {
        ...currentData,
        publicProfile: updatedProfile,
        updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Sync to public_members collection for unauthenticated access
    const publicRef = doc(db, 'public_members', uid);
    await setDoc(publicRef, {
        uid,
        orbitId: currentData.orbitId,
        firstName: currentData.firstName,
        lastName: currentData.lastName,
        dateOfBirth: currentData.dateOfBirth || '',
        team: currentData.team,
        position: currentData.position,
        publicProfile: updatedProfile,
        updatedAt: new Date().toISOString()
    });
};

/**
 * Reject admin profile for members gallery
 */
export const rejectAdminProfile = async (uid: string, reviewerOrbitId: string, reason?: string): Promise<void> => {
    const adminRef = doc(db, 'admins', uid);
    const adminDoc = await getDoc(adminRef);

    if (!adminDoc.exists()) {
        throw new Error('Admin profile not found');
    }

    const currentData = adminDoc.data();
    const updatedProfile = {
        ...currentData.publicProfile,
        approvalStatus: 'rejected' as ApprovalStatus,
        reviewedBy: reviewerOrbitId,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason || null
    };

    // 1. Update master admin record
    await setDoc(adminRef, {
        ...currentData,
        publicProfile: updatedProfile,
        updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Remove from public_members if it was previously approved
    const publicRef = doc(db, 'public_members', uid);
    await deleteDoc(publicRef);
};

/**
 * Get single admin profile by UID
 */
export const getAdminProfileByUid = async (uid: string) => {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    if (!adminDoc.exists()) {
        return null;
    }
    return adminDoc.data();
};

/**
 * Delete admin's public profile (removes from member gallery)
 */
export const deleteAdminPublicProfile = async (uid: string): Promise<void> => {
    const adminRef = doc(db, 'admins', uid);

    // 1. Remove from master admin record
    await updateDoc(adminRef, {
        publicProfile: deleteField(),
        updatedAt: new Date().toISOString()
    });

    // 2. Remove from public_members
    const publicRef = doc(db, 'public_members', uid);
    await deleteDoc(publicRef);
};

