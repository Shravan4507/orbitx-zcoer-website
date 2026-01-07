// User Types and Constants for OrbitX

// Gender options
export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' }
] as const;

// Qualification Level options
export const QUALIFICATION_LEVELS = [
    { value: 'certificate', label: 'Certificate Course' },
    { value: 'diploma', label: 'Diploma Course' },
    { value: 'dual_degree', label: 'DUAL Degree' },
    { value: 'fyjc', label: 'F.Y.J.C. (11th std)' },
    { value: 'hsc', label: 'H.S.C. (12th std)' },
    { value: 'phd', label: 'Ph.D' },
    { value: 'pg_certificate', label: 'Post Graduate Certificate' },
    { value: 'pg_course', label: 'Post Graduate Course' },
    { value: 'pg_diploma', label: 'Post Graduate Diploma Course' },
    { value: 'ug_course', label: 'Under Graduate Course' },
    { value: 'ug_sainiki', label: 'Under Graduate Course for Sainiki' },
    { value: 'vocational', label: 'Vocational Course' }
] as const;

// Stream options
export const STREAM_OPTIONS = [
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'architecture', label: 'Architecture and Town Planning' },
    { value: 'arts', label: 'Arts' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'commerce_management', label: 'Commerce & Management' },
    { value: 'commerce_mgmt', label: 'Commerce Management' },
    { value: 'design', label: 'Design' },
    { value: 'education', label: 'Education' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'engineering_machine', label: 'Engineering Machine Group' },
    { value: 'engineering_non_machine', label: 'Engineering Non Machine Group' },
    { value: 'eye_care', label: 'Eye Care Optometrists' },
    { value: 'fine_art', label: 'Fine Art (Visual Art)' },
    { value: 'health_science', label: 'Health Science' },
    { value: 'hotel_management', label: 'Hotel Management and Catering' },
    { value: 'humanities', label: 'Humanities and Social Sciences' },
    { value: 'interdisciplinary', label: 'Interdisciplinary' },
    { value: 'law', label: 'Law' },
    { value: 'management', label: 'Management' },
    { value: 'mca', label: 'MCA' },
    { value: 'non_engineering', label: 'Non Engineering Group' },
    { value: 'non_aicte', label: 'Non-AICTE' },
    { value: 'nursing', label: 'Nursing' },
    { value: 'other', label: 'Other' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'physical_education', label: 'Physical Education' },
    { value: 'science', label: 'Science' },
    { value: 'science_technology', label: 'Science Technology' },
    { value: 'social_work', label: 'Social Work' },
    { value: 'veterinary', label: 'Veterinary' }
] as const;

// Course Name options (B.E. and B.Tech focused)
export const COURSE_OPTIONS = [
    // B.E. Courses
    { value: 'be_ce', label: 'B.E. Computer Engineering' },
    { value: 'be_cse', label: 'B.E. Computer Science and Engineering' },
    { value: 'be_it', label: 'B.E. Information Technology' },
    { value: 'be_entc', label: 'B.E. Electronics and Telecommunication Engineering' },
    { value: 'be_electronics', label: 'B.E. Electronics Engineering' },
    { value: 'be_electrical', label: 'B.E. Electrical Engineering' },
    { value: 'be_mech', label: 'B.E. Mechanical Engineering' },
    { value: 'be_civil', label: 'B.E. Civil Engineering' },
    { value: 'be_aids', label: 'B.E. Artificial Intelligence & Data Science' },
    { value: 'be_aiml', label: 'B.E. Artificial Intelligence & Machine Learning' },
    { value: 'be_robotics', label: 'B.E. Robotics and Automation' },
    { value: 'be_mechatronics', label: 'B.E. Mechatronics Engineering' },
    { value: 'be_instrumentation', label: 'B.E. Instrumentation Engineering' },
    { value: 'be_chemical', label: 'B.E. Chemical Engineering' },
    { value: 'be_production', label: 'B.E. Production Engineering' },
    { value: 'be_industrial', label: 'B.E. Industrial Engineering' },

    // B.Tech. Courses
    { value: 'btech_cse', label: 'B.Tech. Computer Science and Engineering' },
    { value: 'btech_cse_aiml', label: 'B.Tech. Computer Science and Engineering (AI & ML)' },
    { value: 'btech_cse_ds', label: 'B.Tech. Computer Science and Engineering (Data Science)' },
    { value: 'btech_it', label: 'B.Tech. Information Technology' },
    { value: 'btech_ai', label: 'B.Tech. Artificial Intelligence' },
    { value: 'btech_aids', label: 'B.Tech. Artificial Intelligence & Data Science' },
    { value: 'btech_ece', label: 'B.Tech. Electronics and Communication Engineering' },
    { value: 'btech_electrical', label: 'B.Tech. Electrical Engineering' },
    { value: 'btech_mech', label: 'B.Tech. Mechanical Engineering' },
    { value: 'btech_civil', label: 'B.Tech. Civil Engineering' },
    { value: 'btech_robotics', label: 'B.Tech. Robotics and Automation' },
    { value: 'btech_mechatronics', label: 'B.Tech. Mechatronics Engineering' },
    { value: 'btech_iot', label: 'B.Tech. Internet of Things (IoT)' },
    { value: 'btech_cybersecurity', label: 'B.Tech. Cyber Security' },
    { value: 'btech_cloud', label: 'B.Tech. Cloud Computing' },
    { value: 'btech_blockchain', label: 'B.Tech. Blockchain Technology' },
    { value: 'btech_aerospace', label: 'B.Tech. Aerospace Engineering' },
    { value: 'btech_chemical', label: 'B.Tech. Chemical Engineering' },

    // Other
    { value: 'other', label: 'Other' }
] as const;

// Year of Study options
export const YEAR_OF_STUDY_OPTIONS = [
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
    { value: '5', label: '5th Year' },
    { value: '6', label: '6th Year' },
    { value: 'completed', label: 'Completed' }
] as const;

// Generate graduation years (current year - 10 to current year + 10)
export const generateGraduationYears = (): { value: string; label: string }[] => {
    const currentYear = new Date().getFullYear();
    const years: { value: string; label: string }[] = [];

    for (let year = currentYear + 10; year >= currentYear - 10; year--) {
        years.push({ value: year.toString(), label: year.toString() });
    }

    return years;
};

// User registration form data type
export interface UserRegistrationData {
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
    password: string;
    confirmPassword: string;
}

// User profile type (after registration)
export interface UserProfile {
    uid: string;
    orbitId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    dateOfBirth: string;
    gender: string;
    qualificationLevel: string;
    stream: string;
    collegeName: string;
    courseName: string;
    yearOfStudy: string;
    yearOfGraduation: string;
    avatar?: string;
    googleLinked?: boolean;
    role: 'user' | 'admin';
    isActive: boolean;
    createdAt: string; // ISO string for Firestore
    updatedAt: string; // ISO string for Firestore
}

// Admin Team options
export const ADMIN_TEAM_OPTIONS = [
    { value: 'leadership', label: 'Leadership' },
    { value: 'design_innovation', label: 'Design & Innovation Team' },
    { value: 'technical', label: 'Technical Team' },
    { value: 'management_operations', label: 'Management & Operations Team' },
    { value: 'public_outreach', label: 'Public Outreach Team' },
    { value: 'documentation', label: 'Documentation Team' },
    { value: 'social_media_editing', label: 'Social Media & Editing Team' }
] as const;

// Position options for Leadership team
export const LEADERSHIP_POSITION_OPTIONS = [
    { value: 'president', label: 'President' },
    { value: 'chairman', label: 'Chairman' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'co_treasurer', label: 'Co-Treasurer' }
] as const;

// Position options for other teams
export const TEAM_POSITION_OPTIONS = [
    { value: 'team_leader', label: 'Team Leader' },
    { value: 'member', label: 'Member' }
] as const;

// Admin Profile interface
export interface AdminProfile {
    uid: string;
    orbitId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    dateOfBirth: string;
    gender: string;
    googleLinked: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Admin specific fields
    team: string;
    position: string;
    adminRole: string[];
    permissions: string[];
    // Optional fields for compatibility with UserProfile
    avatar?: string;
    role?: 'user' | 'admin';
    qualificationLevel?: string;
    stream?: string;
    collegeName?: string;
    courseName?: string;
    yearOfStudy?: string;
    yearOfGraduation?: string;
}

// ==================== PERMISSION TYPES ====================

// Available permissions
export const ADMIN_PERMISSIONS = {
    // Promotional Screen
    MANAGE_PROMOS: 'manage_promos',

    // Events
    MANAGE_EVENTS: 'manage_events',

    // Members
    MANAGE_MEMBERS: 'manage_members',

    // Recruitment/Join
    MANAGE_JOIN: 'manage_join',

    // Applications (Join form responses)
    MANAGE_APPLICATIONS: 'manage_applications',

    // Announcements
    MANAGE_ANNOUNCEMENTS: 'manage_announcements',

    // Contact Queries
    MANAGE_QUERIES: 'manage_queries',

    // System
    MANAGE_ADMINS: 'manage_admins',
    MANAGE_MERCH: 'manage_merch',
    MANAGE_MERCH_ORDERS: 'manage_merch_orders',
    SYSTEM_SETTINGS: 'system_settings',
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

// Permission stored in Firestore
export interface AdminPermissionRecord {
    orbitId: string;
    uid: string;
    permissions: AdminPermission[];
    grantedBy: string; // Orbit ID of admin who granted
    grantedAt: string;
    updatedAt: string;
}

// ==================== PROMOTION TYPES ====================

export type PromotionMediaType = 'image' | 'gif' | 'video';

export interface Promotion {
    id: string;
    title: string;
    mediaUrl: string;
    mediaType: PromotionMediaType;
    // File reference (for when Storage is not available)
    fileName?: string;
    // Clickable link
    linkUrl?: string;
    // Display settings
    cropSettings?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    aspectRatio?: string;
    // Status
    isActive: boolean;
    priority: number; // For ordering
    // Scheduling
    startDate?: string;
    endDate?: string;
    // Metadata
    createdBy: string; // Orbit ID
    createdAt: string;
    updatedAt: string;
}
