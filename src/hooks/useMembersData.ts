/**
 * useMembersData - Hook to fetch member data from Firestore
 * 
 * This hook ONLY fetches APPROVED admin profiles from Firestore.
 * NO JSON fallback - all member data comes from Firebase.
 */
import { useState, useEffect } from 'react';
import { getPublicAdminProfiles } from '../services/firebase/auth';

// Member type for gallery display
export type MemberAcademics = {
    year: string;
    branch: string;
    division: string;
    yearOfGraduation: string;
};

export type MemberSocialLinks = {
    instagram?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
    facebook?: string;
    snapchat?: string;
    whatsapp?: string;
    contactNumber?: string;
};

export type MemberData = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    team: string;
    position: string;
    academics: MemberAcademics;
    socialLinks: MemberSocialLinks;
    image: string | null;
};

// Team name mapping for display
const normalizeTeamName = (team: string): string => {
    const teamMap: Record<string, string> = {
        'leadership': 'Leadership',
        'technical': 'Technical Team',
        'public_outreach': 'Public Outreach Team',
        'documentation': 'Documentation Team',
        'social_media_editing': 'Social Media & Editing Team',
        'design_innovation': 'Design & Innovation Team',
        'management_operations': 'Management & Operations Team'
    };
    return teamMap[team?.toLowerCase()] || team || '';
};

// Position name mapping
const normalizePosition = (position: string): string => {
    const positionMap: Record<string, string> = {
        'president': 'President',
        'chairman': 'Chairman',
        'secretary': 'Secretary',
        'treasurer': 'Treasurer',
        'co_treasurer': 'Co-Treasurer',
        'team_leader': 'Team Leader',
        'member': 'Member'
    };
    return positionMap[position?.toLowerCase()] || position || '';
};

export function useMembersData() {
    const [members, setMembers] = useState<MemberData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch ONLY approved admin profiles from Firestore
                const adminProfiles = await getPublicAdminProfiles();

                // Convert admin profiles to MemberData format
                const memberData: MemberData[] = adminProfiles.map(admin => ({
                    id: admin.uid,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    dateOfBirth: admin.dateOfBirth || '',
                    team: normalizeTeamName(admin.team),
                    position: normalizePosition(admin.position),
                    academics: {
                        year: admin.publicProfile?.academicYear || '',
                        branch: admin.publicProfile?.major || '',
                        division: admin.publicProfile?.division || '',
                        yearOfGraduation: admin.publicProfile?.graduationYear || ''
                    },
                    socialLinks: admin.publicProfile?.socialLinks || {},
                    image: admin.publicProfile?.displayImage || null
                }));

                setMembers(memberData);
            } catch (err) {
                console.error('Error fetching member data:', err);
                setError(err as Error);
                setMembers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return { members, isLoading, error };
}
