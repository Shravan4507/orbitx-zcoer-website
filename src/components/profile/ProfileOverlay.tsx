import { useState, useEffect } from 'react';
import './ProfileOverlay.css';
import { useToast } from '../toast/Toast';
import CopyButton from '../copy/CopyButton';
import { useAuth } from '../../contexts/AuthContext';
import CustomSelect from '../ui/CustomSelect';
import {
    QUALIFICATION_LEVELS,
    STREAM_OPTIONS,
    COURSE_OPTIONS,
    YEAR_OF_STUDY_OPTIONS,
    generateGraduationYears,
} from '../../types/user';

type ProfileOverlayProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ProfileOverlay({ isOpen, onClose }: ProfileOverlayProps) {
    const { showToast } = useToast();
    const { profile

    } = useAuth();
    const [isClosing, setIsClosing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        qualificationLevel: '',
        stream: '',
        collegeName: '',
        courseName: '',
        yearOfStudy: '',
        yearOfGraduation: ''
    });

    // Initialize edit form when profile is loaded
    useEffect(() => {
        if (profile) {
            setEditForm({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                qualificationLevel: profile.qualificationLevel || '',
                stream: profile.stream || '',
                collegeName: profile.collegeName || '',
                courseName: profile.courseName || '',
                yearOfStudy: profile.yearOfStudy || '',
                yearOfGraduation: profile.yearOfGraduation || ''
            });
        }
    }, [profile]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setIsEditing(false);
            onClose();
        }, 300);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleSave = async () => {
        // TODO: Implement Firestore profile update
        showToast('Profile update coming soon!', 'info');
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (profile) {
            setEditForm({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                qualificationLevel: profile.qualificationLevel || '',
                stream: profile.stream || '',
                collegeName: profile.collegeName || '',
                courseName: profile.courseName || '',
                yearOfStudy: profile.yearOfStudy || '',
                yearOfGraduation: profile.yearOfGraduation || ''
            });
        }
        setIsEditing(false);
    };

    // Generate initials for avatar fallback
    const getInitials = () => {
        const first = profile?.firstName?.charAt(0)?.toUpperCase() || '';
        const last = profile?.lastName?.charAt(0)?.toUpperCase() || '';
        return `${first}${last}`;
    };

    // Format date for display
    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Format DOB for display
    const formatDOB = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Format database values to readable text (e.g., "ug_course" -> "UG Course", "be_cse" -> "B.E. CSE")
    const formatValue = (value: string | undefined) => {
        if (!value) return 'N/A';

        // Special mappings for common abbreviations
        const specialMappings: { [key: string]: string } = {
            'ug_course': 'Undergraduate',
            'pg_course': 'Postgraduate',
            'diploma': 'Diploma',
            'be_cse': 'B.E. Computer Science',
            'be_it': 'B.E. Information Technology',
            'be_extc': 'B.E. Electronics & Telecom',
            'be_mech': 'B.E. Mechanical',
            'be_civil': 'B.E. Civil',
            'be_electrical': 'B.E. Electrical',
            'btech_cse': 'B.Tech Computer Science',
            'btech_it': 'B.Tech Information Technology',
            'bca': 'BCA',
            'bsc_cs': 'B.Sc. Computer Science',
            'bsc_it': 'B.Sc. Information Technology',
            'mca': 'MCA',
            'mtech': 'M.Tech',
            'msc': 'M.Sc.',
            'engineering': 'Engineering',
            'science': 'Science',
            'commerce': 'Commerce',
            'arts': 'Arts',
            'medical': 'Medical',
            'male': 'Male',
            'female': 'Female',
            'other': 'Other',
            'prefer_not_to_say': 'Prefer Not to Say'
        };

        // Check for special mapping first
        const lowerValue = value.toLowerCase();
        if (specialMappings[lowerValue]) {
            return specialMappings[lowerValue];
        }

        // Otherwise, capitalize each word and replace underscores with spaces
        return value
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Format year of study with ordinal suffix
    const formatYearOfStudy = (year: string | undefined) => {
        if (!year) return 'N/A';
        const num = parseInt(year);
        if (isNaN(num)) return year;

        const suffix = ['th', 'st', 'nd', 'rd'];
        const v = num % 100;
        return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]) + ' Year';
    };

    if (!isOpen || !profile) return null;

    return (
        <div
            className={`profile-overlay ${isClosing ? 'profile-overlay--closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className="profile-overlay__modal">
                <button className="profile-overlay__close" onClick={handleClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Left Sidebar - Profile Header */}
                <div className="profile-overlay__sidebar">
                    <div className="profile-overlay__avatar-wrapper">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar}
                                alt={profile.firstName}
                                className="profile-overlay__avatar"
                            />
                        ) : (
                            <div className="profile-overlay__avatar profile-overlay__avatar--initials">
                                {getInitials()}
                            </div>
                        )}
                    </div>
                    <h2 className="profile-overlay__name">
                        {profile.firstName} {profile.lastName}
                    </h2>
                    <CopyButton text={profile.orbitId} />

                    {/* Membership status in sidebar */}
                    <div className="profile-overlay__sidebar-info">
                        <div className="profile-overlay__sidebar-item">
                            <span className="profile-overlay__sidebar-label">Member Since</span>
                            <span className="profile-overlay__sidebar-value">{formatDate(profile.createdAt)}</span>
                        </div>
                        <div className="profile-overlay__sidebar-item">
                            <span className="profile-overlay__sidebar-label">Status</span>
                            <span className={`profile-overlay__sidebar-value profile-overlay__status--${profile.isActive ? 'active' : 'inactive'}`}>
                                {profile.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {profile.googleLinked && (
                            <div className="profile-overlay__sidebar-item">
                                <span className="profile-overlay__sidebar-label">Google</span>
                                <span className="profile-overlay__sidebar-value profile-overlay__status--linked">
                                    Linked ✓
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="profile-overlay__main">
                    <div className="profile-overlay__content">
                        {!isEditing ? (
                            <>
                                {/* Personal Information */}
                                <div className="profile-overlay__section">
                                    <h3 className="profile-overlay__section-title">Personal Information</h3>
                                    <div className="profile-overlay__info-grid">
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Email</span>
                                            <span className="profile-overlay__info-value">{profile.email}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Mobile</span>
                                            <span className="profile-overlay__info-value">{profile.mobile || 'Not provided'}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Date of Birth</span>
                                            <span className="profile-overlay__info-value">{formatDOB(profile.dateOfBirth)}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Gender</span>
                                            <span className="profile-overlay__info-value">{formatValue(profile.gender)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className="profile-overlay__section">
                                    <h3 className="profile-overlay__section-title">Academic Information</h3>
                                    <div className="profile-overlay__info-grid">
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Qualification</span>
                                            <span className="profile-overlay__info-value">{formatValue(profile.qualificationLevel)}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Stream</span>
                                            <span className="profile-overlay__info-value">{formatValue(profile.stream)}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">College</span>
                                            <span className="profile-overlay__info-value">{profile.collegeName || 'N/A'}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Course</span>
                                            <span className="profile-overlay__info-value">{formatValue(profile.courseName)}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Year of Study</span>
                                            <span className="profile-overlay__info-value">{formatYearOfStudy(profile.yearOfStudy)}</span>
                                        </div>
                                        <div className="profile-overlay__info-item">
                                            <span className="profile-overlay__info-label">Graduation</span>
                                            <span className="profile-overlay__info-value">{profile.yearOfGraduation || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="profile-overlay__edit-form">
                                <div className="profile-overlay__form-grid">
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">First Name</label>
                                        <input
                                            type="text"
                                            className="profile-overlay__form-input"
                                            value={editForm.firstName}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">Last Name</label>
                                        <input
                                            type="text"
                                            className="profile-overlay__form-input"
                                            value={editForm.lastName}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">Qualification</label>
                                        <CustomSelect
                                            options={QUALIFICATION_LEVELS}
                                            value={editForm.qualificationLevel}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, qualificationLevel: value }))}
                                            placeholder="Select Qualification"
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">Stream</label>
                                        <CustomSelect
                                            options={STREAM_OPTIONS}
                                            value={editForm.stream}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, stream: value }))}
                                            placeholder="Select Stream"
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">College</label>
                                        <input
                                            type="text"
                                            className="profile-overlay__form-input"
                                            value={editForm.collegeName}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, collegeName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">Course</label>
                                        <CustomSelect
                                            options={COURSE_OPTIONS}
                                            value={editForm.courseName}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, courseName: value }))}
                                            placeholder="Select Course"
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">Year of Study</label>
                                        <CustomSelect
                                            options={YEAR_OF_STUDY_OPTIONS}
                                            value={editForm.yearOfStudy}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, yearOfStudy: value }))}
                                            placeholder="Select Year"
                                        />
                                    </div>
                                    <div className="profile-overlay__form-group">
                                        <label className="profile-overlay__form-label">Graduation Year</label>
                                        <CustomSelect
                                            options={generateGraduationYears()}
                                            value={editForm.yearOfGraduation}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, yearOfGraduation: value }))}
                                            placeholder="Select Year"
                                        />
                                    </div>
                                </div>
                                <p className="profile-overlay__form-note">
                                    Note: Email, Mobile, Date of Birth, and Gender cannot be changed.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions at bottom */}
                    <div className="profile-overlay__actions">
                        {!isEditing ? (
                            <button
                                className="profile-overlay__edit-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <>
                                <button
                                    className="profile-overlay__cancel-btn"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="profile-overlay__save-btn"
                                    onClick={handleSave}
                                >
                                    Save Changes
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
