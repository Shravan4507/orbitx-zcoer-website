/**
 * ManageMembers - Admin page for approving/rejecting member profile requests
 * Only accessible to admins with MANAGE_MEMBERS permission
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/toast/Toast';
import { getPendingAdminProfiles, approveAdminProfile, rejectAdminProfile } from '../services/firebase/auth';
import { getDefaultAdminAvatar } from '../services/firebase/adminStorage';
import { ADMIN_PERMISSIONS } from '../types/user';
import Footer from '../components/layout/Footer';
import './ManageMembers.css';

interface PendingProfile {
    id: string;
    uid: string;
    orbitId: string;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    team: string;
    position: string;
    publicProfile: {
        displayImage?: string;
        academicYear?: string;
        major?: string;
        division?: string;
        graduationYear?: string;
        socialLinks?: Record<string, string>;
        isProfilePublic?: boolean;
        submittedAt?: string;
    };
}

export default function ManageMembers() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isAdmin, hasPermission, profile } = useAuth();

    const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Check permission
    const canManageMembers = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_MEMBERS);

    useEffect(() => {
        if (!canManageMembers) {
            navigate('/dashboard');
            return;
        }

        fetchPendingProfiles();
    }, [canManageMembers, navigate]);

    const fetchPendingProfiles = async () => {
        try {
            setIsLoading(true);
            const profiles = await getPendingAdminProfiles();
            setPendingProfiles(profiles);
        } catch (error) {
            console.error('Error fetching pending profiles:', error);
            showToast('Failed to load pending profiles', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (uid: string) => {
        if (!profile?.orbitId) return;

        try {
            setProcessingId(uid);
            await approveAdminProfile(uid, profile.orbitId);
            showToast('Profile approved successfully!', 'success');
            setPendingProfiles(prev => prev.filter(p => p.uid !== uid));
        } catch (error: any) {
            showToast(error.message || 'Failed to approve profile', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (uid: string) => {
        if (!profile?.orbitId) return;

        try {
            setProcessingId(uid);
            await rejectAdminProfile(uid, profile.orbitId, rejectionReason);
            showToast('Profile rejected', 'info');
            setPendingProfiles(prev => prev.filter(p => p.uid !== uid));
            setRejectModalOpen(null);
            setRejectionReason('');
        } catch (error: any) {
            showToast(error.message || 'Failed to reject profile', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (uid: string) => {
        setRejectModalOpen(uid);
        setRejectionReason('');
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const normalizeTeamName = (team: string) => {
        const teamMap: Record<string, string> = {
            'leadership': 'Leadership',
            'technical': 'Technical Team',
            'public_outreach': 'Public Outreach Team',
            'documentation': 'Documentation Team',
            'social_media_editing': 'Social Media & Editing Team',
            'design_innovation': 'Design & Innovation Team',
            'management_operations': 'Management & Operations Team'
        };
        return teamMap[team?.toLowerCase()] || team;
    };

    const normalizePosition = (position: string) => {
        const positionMap: Record<string, string> = {
            'president': 'President',
            'chairman': 'Chairman',
            'secretary': 'Secretary',
            'treasurer': 'Treasurer',
            'co_treasurer': 'Co-Treasurer',
            'team_leader': 'Team Leader',
            'member': 'Member'
        };
        return positionMap[position?.toLowerCase()] || position;
    };

    if (!canManageMembers) {
        return null;
    }

    return (
        <>
            <main className="manage-members-page">
                <div className="manage-members-header">
                    <button className="manage-members-back" onClick={() => navigate('/user-dashboard')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <h1>Manage Member Profiles</h1>
                    <p>Review and approve member card submissions</p>
                </div>

                <div className="manage-members-content">
                    {isLoading ? (
                        <div className="manage-members-loading">
                            <div className="spinner-large"></div>
                            <p>Loading pending profiles...</p>
                        </div>
                    ) : pendingProfiles.length === 0 ? (
                        <div className="manage-members-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3>All caught up!</h3>
                            <p>No pending profile submissions to review.</p>
                        </div>
                    ) : (
                        <div className="manage-members-list">
                            {pendingProfiles.map(profile => (
                                <div key={profile.uid} className="pending-profile-card">
                                    <div className="pending-profile-image">
                                        <img
                                            src={profile.publicProfile.displayImage || getDefaultAdminAvatar(profile.firstName, profile.lastName)}
                                            alt={`${profile.firstName} ${profile.lastName}`}
                                        />
                                    </div>

                                    <div className="pending-profile-info">
                                        <div className="pending-profile-header">
                                            <h3>{profile.firstName} {profile.lastName}</h3>
                                            <span className="pending-profile-id">{profile.orbitId}</span>
                                        </div>

                                        <div className="pending-profile-meta">
                                            <span className="pending-profile-role">{normalizePosition(profile.position)}</span>
                                            <span className="pending-profile-team">{normalizeTeamName(profile.team)}</span>
                                        </div>

                                        <div className="pending-profile-details">
                                            {profile.publicProfile.academicYear && (
                                                <span>{profile.publicProfile.academicYear}</span>
                                            )}
                                            {profile.publicProfile.major && (
                                                <span>{profile.publicProfile.major}</span>
                                            )}
                                            {profile.publicProfile.division && (
                                                <span>Division {profile.publicProfile.division}</span>
                                            )}
                                            {profile.publicProfile.graduationYear && (
                                                <span>Class of {profile.publicProfile.graduationYear}</span>
                                            )}
                                        </div>

                                        {profile.publicProfile.socialLinks && Object.keys(profile.publicProfile.socialLinks).length > 0 && (
                                            <div className="pending-profile-socials">
                                                {Object.entries(profile.publicProfile.socialLinks)
                                                    .filter(([, value]) => value)
                                                    .map(([key]) => (
                                                        <span key={key} className="social-badge">{key}</span>
                                                    ))
                                                }
                                            </div>
                                        )}

                                        <p className="pending-profile-submitted">
                                            Submitted: {formatDate(profile.publicProfile.submittedAt)}
                                        </p>
                                    </div>

                                    <div className="pending-profile-actions">
                                        <button
                                            className="action-btn action-btn--approve"
                                            onClick={() => handleApprove(profile.uid)}
                                            disabled={processingId === profile.uid}
                                        >
                                            {processingId === profile.uid ? (
                                                <span className="spinner"></span>
                                            ) : (
                                                <>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Approve
                                                </>
                                            )}
                                        </button>
                                        <button
                                            className="action-btn action-btn--reject"
                                            onClick={() => openRejectModal(profile.uid)}
                                            disabled={processingId === profile.uid}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />

            {/* Rejection Reason Modal */}
            {rejectModalOpen && (
                <div className="reject-modal-overlay" onClick={() => setRejectModalOpen(null)}>
                    <div className="reject-modal" onClick={e => e.stopPropagation()}>
                        <h3>Rejection Reason</h3>
                        <p>Provide a reason for rejection (optional):</p>
                        <textarea
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            placeholder="Enter reason for rejection..."
                            rows={3}
                        />
                        <div className="reject-modal-actions">
                            <button
                                className="action-btn action-btn--secondary"
                                onClick={() => setRejectModalOpen(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-btn action-btn--reject"
                                onClick={() => handleReject(rejectModalOpen)}
                                disabled={processingId !== null}
                            >
                                {processingId ? <span className="spinner"></span> : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
