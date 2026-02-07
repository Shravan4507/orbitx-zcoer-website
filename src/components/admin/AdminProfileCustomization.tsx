/**
 * AdminProfileCustomization - A component for admins to customize their public member card profile
 */
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../toast/Toast';
import { uploadAdminDisplayImage, deleteAdminDisplayImage, getDefaultAdminAvatar } from '../../services/firebase/adminStorage';
import { updateAdminPublicProfile, deleteAdminPublicProfile } from '../../services/firebase/auth';
import CustomSelect from '../ui/CustomSelect';
import ImageCropper from './ImageCropper';
import { majors } from '../../data/majors';
import type { AdminProfile, AdminPublicProfile, AdminSocialLinks } from '../../types/user';
import './AdminProfileCustomization.css';

// Year options
const YEAR_OPTIONS = [
    { value: '1st Year', label: '1st Year' },
    { value: '2nd Year', label: '2nd Year' },
    { value: '3rd Year', label: '3rd Year' },
    { value: '4th Year', label: '4th Year' }
];

// Division options
const DIVISION_OPTIONS = [
    { value: 'A', label: 'Division A' },
    { value: 'B', label: 'Division B' },
    { value: 'C', label: 'Division C' },
    { value: 'D', label: 'Division D' }
];

// Generate graduation years (current year to +6 years)
const generateGraduationYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i <= currentYear + 6; i++) {
        years.push({ value: String(i), label: String(i) });
    }
    return years;
};

interface AdminProfileCustomizationProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminProfileCustomization({ isOpen, onClose }: AdminProfileCustomizationProps) {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adminProfile = profile as AdminProfile | null;

    // Form state
    const [displayImage, setDisplayImage] = useState<string>('');
    const [academicYear, setAcademicYear] = useState<string>('');
    const [major, setMajor] = useState<string>('');
    const [division, setDivision] = useState<string>('');
    const [graduationYear, setGraduationYear] = useState<string>('');
    const [socialLinks, setSocialLinks] = useState<AdminSocialLinks>({});
    const [isProfilePublic, setIsProfilePublic] = useState<boolean>(true);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentApprovalStatus, setCurrentApprovalStatus] = useState<string | null>(null);
    const [currentRejectionReason, setCurrentRejectionReason] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Image cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [cropperImageSrc, setCropperImageSrc] = useState<string>('');

    // Fetch fresh data from Firestore when modal opens
    useEffect(() => {
        const fetchProfileData = async () => {
            if (!isOpen || !adminProfile?.uid) return;

            setIsLoading(true);
            try {
                // Import dynamically to avoid circular dependencies
                const { getAdminProfileByUid } = await import('../../services/firebase/auth');
                const freshProfile = await getAdminProfileByUid(adminProfile.uid);

                if (freshProfile?.publicProfile) {
                    const pp = freshProfile.publicProfile;
                    setDisplayImage(pp.displayImage || '');
                    setAcademicYear(pp.academicYear || '');
                    setMajor(pp.major || '');
                    setDivision(pp.division || '');
                    setGraduationYear(pp.graduationYear || '');
                    setSocialLinks(pp.socialLinks || {});
                    setIsProfilePublic(pp.isProfilePublic !== false);
                    setCurrentApprovalStatus(pp.approvalStatus || null);
                    setCurrentRejectionReason(pp.rejectionReason || null);
                } else {
                    // No existing data, reset to defaults
                    setDisplayImage('');
                    setAcademicYear('');
                    setMajor('');
                    setDivision('');
                    setGraduationYear('');
                    setSocialLinks({});
                    setIsProfilePublic(true);
                    setCurrentApprovalStatus(null);
                    setCurrentRejectionReason(null);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                showToast('Failed to load profile data', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, [isOpen, adminProfile?.uid, showToast]);

    // Handle file selection - show cropper instead of uploading directly
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            showToast('Please select a valid image file (JPEG, PNG, WebP, or GIF)', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        // Read file and show cropper
        const reader = new FileReader();
        reader.onload = () => {
            setCropperImageSrc(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // Handle cropped image upload
    const handleCroppedImage = async (croppedBlob: Blob) => {
        if (!adminProfile) return;

        setShowCropper(false);
        setIsUploading(true);

        try {
            // Delete old image if exists
            if (displayImage) {
                await deleteAdminDisplayImage(displayImage);
            }

            // Convert Blob to File for upload
            const file = new File([croppedBlob], 'profile-image.jpg', { type: 'image/jpeg' });

            // Upload new image
            const url = await uploadAdminDisplayImage(adminProfile.uid, file);
            setDisplayImage(url);
            setPreviewImage(url);
            showToast('Image uploaded successfully!', 'success');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
            showToast(errorMessage, 'error');
        } finally {
            setIsUploading(false);
            setCropperImageSrc('');
        }
    };

    // Handle cropper cancel
    const handleCropCancel = () => {
        setShowCropper(false);
        setCropperImageSrc('');
    };

    // Handle social link change
    const handleSocialChange = (key: keyof AdminSocialLinks, value: string) => {
        setSocialLinks(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Handle save
    const handleSave = async () => {
        if (!adminProfile) return;

        setIsSaving(true);
        try {
            const publicProfile: AdminPublicProfile = {
                displayImage: displayImage || undefined,
                academicYear: academicYear || undefined,
                major: major || undefined,
                division: division || undefined,
                graduationYear: graduationYear || undefined,
                socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
                isProfilePublic
            };

            await updateAdminPublicProfile(adminProfile.uid, publicProfile);
            showToast('Profile submitted for approval! It will appear on the Members page once approved.', 'success');
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Failed to save profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!adminProfile) return;

        setIsDeleting(true);
        try {
            // Delete image from storage if it exists
            if (displayImage) {
                await deleteAdminDisplayImage(displayImage);
            }

            await deleteAdminPublicProfile(adminProfile.uid);
            showToast('Member card deleted successfully.', 'success');
            onClose();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete member card', 'error');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Get current approval status (from fresh Firestore data)
    const getApprovalStatus = () => {
        return currentApprovalStatus;
    };

    // Get display image for preview (returns null if no image, to avoid empty src warning)
    const getPreviewImage = (): string | null => {
        if (previewImage) return previewImage;
        if (displayImage) return displayImage;
        const defaultAvatar = getDefaultAdminAvatar(adminProfile?.firstName, adminProfile?.lastName);
        return defaultAvatar || null;
    };

    if (!isOpen) return null;

    const graduationYears = generateGraduationYears();

    return (
        <div className="admin-profile-modal-overlay" onClick={onClose}>
            <div className="admin-profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-profile-modal__header">
                    <div className="admin-profile-modal__header-content">
                        <h2>Member Card - Customization</h2>
                        {getApprovalStatus() && (
                            <span className={`admin-profile-status admin-profile-status--${getApprovalStatus()}`}>
                                {getApprovalStatus() === 'pending' && '⏳ Pending Approval'}
                                {getApprovalStatus() === 'approved' && '✓ Approved'}
                                {getApprovalStatus() === 'rejected' && '✗ Rejected'}
                            </span>
                        )}
                        {currentRejectionReason && (
                            <p className="admin-profile-rejection-reason">
                                Reason: {currentRejectionReason}
                            </p>
                        )}
                    </div>
                    <button className="admin-profile-modal__close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="admin-profile-modal__content">
                    {isLoading ? (
                        <div className="admin-profile-loading">
                            <div className="spinner-large"></div>
                            <p>Loading your profile...</p>
                        </div>
                    ) : (
                        <>
                            {/* Top Row - 1:1 ratio */}
                            <div className="admin-profile-form-row">
                                {/* Left Column: Image + Academic */}
                                <div className="admin-profile-form-col">
                                    {/* Profile Image */}
                                    <div className="admin-profile-section">
                                        <h3 className="admin-profile-section__title">Display Image</h3>
                                        <div className="admin-profile-image-upload">
                                            <div
                                                className="admin-profile-image-preview"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {getPreviewImage() ? (
                                                    <img src={getPreviewImage()!} alt="Profile" />
                                                ) : (
                                                    <div className="admin-profile-image-placeholder">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                            <circle cx="12" cy="7" r="4"></circle>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="admin-profile-image-overlay">
                                                    {isUploading ? (
                                                        <span className="spinner"></span>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                            <polyline points="17 8 12 3 7 8"></polyline>
                                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                onChange={handleFileSelect}
                                                hidden
                                            />
                                            <p className="admin-profile-image-hint">Click to upload and crop (Max 5MB)</p>
                                        </div>
                                    </div>

                                    {/* Academic Information */}
                                    <div className="admin-profile-section">
                                        <h3 className="admin-profile-section__title">Academic Information</h3>
                                        <div className="admin-profile-form__row">
                                            <div className="admin-profile-form__field">
                                                <label>Year</label>
                                                <CustomSelect
                                                    options={YEAR_OPTIONS}
                                                    value={academicYear}
                                                    onChange={setAcademicYear}
                                                    placeholder="Select Year"
                                                />
                                            </div>
                                            <div className="admin-profile-form__field">
                                                <label>Division</label>
                                                <CustomSelect
                                                    options={DIVISION_OPTIONS}
                                                    value={division}
                                                    onChange={setDivision}
                                                    placeholder="Select Division"
                                                />
                                            </div>
                                        </div>
                                        <div className="admin-profile-form__field">
                                            <label>Major</label>
                                            <CustomSelect
                                                options={majors.map(m => ({ value: m, label: m }))}
                                                value={major}
                                                onChange={setMajor}
                                                placeholder="Select Major"
                                            />
                                        </div>
                                        <div className="admin-profile-form__field">
                                            <label>Graduation Year</label>
                                            <CustomSelect
                                                options={graduationYears}
                                                value={graduationYear}
                                                onChange={setGraduationYear}
                                                placeholder="Select Year"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Social Media + Toggle */}
                                <div className="admin-profile-form-col">
                                    {/* Social Media Links */}
                                    <div className="admin-profile-section">
                                        <h3 className="admin-profile-section__title">Social Media & Contact</h3>
                                        <div className="admin-profile-form__row">
                                            <div className="admin-profile-form__field">
                                                <label>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="social-icon social-icon--instagram">
                                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                    </svg>
                                                    Instagram
                                                </label>
                                                <input
                                                    type="url"
                                                    className="admin-profile-form__input"
                                                    placeholder="https://instagram.com/username"
                                                    value={socialLinks.instagram || ''}
                                                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                                                />
                                            </div>
                                            <div className="admin-profile-form__field">
                                                <label>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="social-icon social-icon--linkedin">
                                                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                                    </svg>
                                                    LinkedIn
                                                </label>
                                                <input
                                                    type="url"
                                                    className="admin-profile-form__input"
                                                    placeholder="https://linkedin.com/in/username"
                                                    value={socialLinks.linkedin || ''}
                                                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="admin-profile-form__row">
                                            <div className="admin-profile-form__field">
                                                <label>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="social-icon social-icon--github">
                                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                    </svg>
                                                    GitHub
                                                </label>
                                                <input
                                                    type="url"
                                                    className="admin-profile-form__input"
                                                    placeholder="https://github.com/username"
                                                    value={socialLinks.github || ''}
                                                    onChange={(e) => handleSocialChange('github', e.target.value)}
                                                />
                                            </div>
                                            <div className="admin-profile-form__field">
                                                <label>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="social-icon social-icon--twitter">
                                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                    </svg>
                                                    X (Twitter)
                                                </label>
                                                <input
                                                    type="url"
                                                    className="admin-profile-form__input"
                                                    placeholder="https://x.com/username"
                                                    value={socialLinks.twitter || ''}
                                                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="admin-profile-form__row">
                                            <div className="admin-profile-form__field">
                                                <label>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="social-icon social-icon--whatsapp">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                    </svg>
                                                    WhatsApp
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="admin-profile-form__input"
                                                    placeholder="+91 9876543210"
                                                    value={socialLinks.whatsapp || ''}
                                                    onChange={(e) => handleSocialChange('whatsapp', e.target.value)}
                                                />
                                            </div>
                                            <div className="admin-profile-form__field">
                                                <label>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="social-icon">
                                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                                    </svg>
                                                    Contact Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="admin-profile-form__input"
                                                    placeholder="+91 9876543210"
                                                    value={socialLinks.contactNumber || ''}
                                                    onChange={(e) => handleSocialChange('contactNumber', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profile Visibility Toggle */}
                                    <div className="admin-profile-section">
                                        <div className="admin-profile-visibility">
                                            <label className="admin-profile-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={isProfilePublic}
                                                    onChange={(e) => setIsProfilePublic(e.target.checked)}
                                                />
                                                <span className="admin-profile-toggle__slider"></span>
                                            </label>
                                            <span>Show my profile on Members page</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom - Full Width Live Preview */}
                            <div className="admin-profile-preview-section">
                                <h3 className="admin-profile-preview__title">Live Preview</h3>
                                <div className="preview-card">
                                    {/* Left: Image with name overlay */}
                                    <div className="preview-card__left">
                                        <div className="preview-card__image">
                                            {getPreviewImage() ? (
                                                <img src={getPreviewImage()!} alt="Profile Preview" />
                                            ) : (
                                                <div className="preview-card__image-placeholder">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="12" cy="7" r="4"></circle>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="preview-card__name-overlay">
                                            <h4 className="preview-card__name">
                                                {adminProfile?.firstName} {adminProfile?.lastName}
                                            </h4>
                                            <p className="preview-card__role">{adminProfile?.position || 'Member'}</p>
                                        </div>
                                    </div>

                                    {/* Right: Details */}
                                    <div className="preview-card__right">
                                        {/* Team Row */}
                                        <div className="preview-card__row">
                                            <span className="preview-card__label">Team</span>
                                            <span className="preview-card__value">{adminProfile?.team?.replace(/_/g, ' ') || '—'}</span>
                                        </div>

                                        {/* Date of Birth Row */}
                                        <div className="preview-card__row">
                                            <span className="preview-card__label">Date of Birth</span>
                                            <span className="preview-card__value">{adminProfile?.dateOfBirth || '—'}</span>
                                        </div>

                                        {/* Academic Details Section */}
                                        <div className="preview-card__section">
                                            <h5 className="preview-card__section-title">ACADEMIC DETAILS</h5>
                                            <div className="preview-card__grid">
                                                <div className="preview-card__grid-item">
                                                    <span className="preview-card__grid-label">YEAR</span>
                                                    <span className="preview-card__grid-value">{academicYear || '—'}</span>
                                                </div>
                                                <div className="preview-card__grid-item">
                                                    <span className="preview-card__grid-label">BRANCH</span>
                                                    <span className="preview-card__grid-value">{major || '—'}</span>
                                                </div>
                                                <div className="preview-card__grid-item">
                                                    <span className="preview-card__grid-label">DIVISION</span>
                                                    <span className="preview-card__grid-value">{division || '—'}</span>
                                                </div>
                                                <div className="preview-card__grid-item">
                                                    <span className="preview-card__grid-label">GRADUATION</span>
                                                    <span className="preview-card__grid-value">{graduationYear || '—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="admin-profile-preview__hint">
                                    This is somehow your card will appear in the Members gallery
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="admin-profile-modal__footer">
                    <div className="footer-left">
                        {currentApprovalStatus && (
                            <button
                                className="admin-profile-btn admin-profile-btn--danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isSaving || isDeleting || isLoading}
                            >
                                Delete Card
                            </button>
                        )}
                    </div>
                    <div className="footer-right">
                        <button
                            className="admin-profile-btn admin-profile-btn--secondary"
                            onClick={onClose}
                            disabled={isSaving || isDeleting || isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            className="admin-profile-btn admin-profile-btn--primary"
                            onClick={handleSave}
                            disabled={isSaving || isDeleting || isLoading}
                        >
                            {isSaving ? (
                                <>
                                    <span className="spinner"></span>
                                    Saving...
                                </>
                            ) : (
                                currentApprovalStatus === 'approved' ? 'Update Profile' : 'Save Profile'
                            )}
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm && (
                    <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
                        <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
                            <h3>Delete Member Card?</h3>
                            <p>This will completely remove your public profile from the Members gallery. This action cannot be undone.</p>
                            <div className="delete-confirm-actions">
                                <button
                                    className="admin-profile-btn admin-profile-btn--secondary"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="admin-profile-btn admin-profile-btn--danger"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="spinner"></span>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Yes, Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Cropper Modal */}
                {showCropper && cropperImageSrc && (
                    <ImageCropper
                        imageSrc={cropperImageSrc}
                        onCrop={handleCroppedImage}
                        onCancel={handleCropCancel}
                        aspectRatio={1}
                    />
                )}
            </div>
        </div>
    );
}
