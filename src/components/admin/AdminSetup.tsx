import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../toast/Toast';
import CustomSelect from '../ui/CustomSelect';
import CustomDatePicker from '../ui/CustomDatePicker';
import { signInWithGoogle, completeAdminSignup, logoutUser } from '../../services/firebase/auth';
import { auth } from '../../services/firebase/config';
import {
    GENDER_OPTIONS,
    ADMIN_TEAM_OPTIONS,
    LEADERSHIP_POSITION_OPTIONS,
    TEAM_POSITION_OPTIONS,
} from '../../types/user';
import './AdminSetup.css';

interface AdminFormData {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    team: string;
    position: string;
}

export default function AdminSetup() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<AdminFormData>({
        firstName: '',
        lastName: '',
        mobile: '',
        email: '',
        dateOfBirth: '',
        gender: '',
        team: '',
        position: ''
    });

    const [errors, setErrors] = useState<Partial<AdminFormData>>({});

    // Sign out any existing user when visiting this page
    useEffect(() => {
        const signOutExisting = async () => {
            if (auth.currentUser) {
                await logoutUser();
            }
        };
        signOutExisting();
    }, []);

    // Get position options based on team selection
    const getPositionOptions = () => {
        if (formData.team === 'leadership') {
            return LEADERSHIP_POSITION_OPTIONS;
        }
        return TEAM_POSITION_OPTIONS;
    };

    // Reset position when team changes
    useEffect(() => {
        if (formData.team) {
            setFormData(prev => ({ ...prev, position: '' }));
        }
    }, [formData.team]);

    const handleGoogleSignUp = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithGoogle();

            if (result.isNewUser) {
                // New user - show the form
                setFormData(prev => ({
                    ...prev,
                    email: result.email || ''
                }));
                setShowForm(true);
                showToast('Please complete your admin profile', 'info');
            } else if (result.profile) {
                // Already has a profile - redirect to login
                showToast('You already have an account. Please use the login page.', 'error');
                await logoutUser();
                setTimeout(() => navigate('/login'), 1500);
            }
        } catch (error: any) {
            console.error('Google sign-up error:', error);

            if (error.code === 'auth/popup-closed-by-user') {
                // User closed popup
            } else if (error.code === 'auth/cancelled-popup-request') {
                // Multiple popups
            } else {
                showToast('Failed to sign up with Google. Please try again.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<AdminFormData> = {};

        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.mobile.trim()) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
            newErrors.mobile = 'Enter a valid 10-digit mobile number';
        }
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.team) newErrors.team = 'Team is required';
        if (!formData.position) newErrors.position = 'Position is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Please fill all required fields correctly', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await completeAdminSignup(formData);

            showToast('Admin account created successfully!', 'success');
            setTimeout(() => {
                showToast('Please login to continue!', 'info');
            }, 500);

            // Sign out and redirect to login
            await logoutUser();
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 1500);
        } catch (error: any) {
            console.error('Admin signup error:', error);

            if (error.code === 'already-registered-user') {
                showToast('This email is already registered as a user.', 'error');
            } else if (error.code === 'already-registered-admin') {
                showToast('This email is already registered as an admin.', 'error');
            } else {
                showToast(error.message || 'Failed to create admin account', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = (field: keyof AdminFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <div className="admin-setup">
            <div className="admin-setup__container">
                <div className="admin-setup__header">
                    <div className="admin-setup__badge">Admin Portal</div>
                    <h1 className="admin-setup__title">Admin Setup</h1>
                    <p className="admin-setup__subtitle">
                        {showForm
                            ? 'Complete your admin profile to get started'
                            : 'Create your OrbitX Admin account'
                        }
                    </p>
                </div>

                {!showForm ? (
                    <div className="admin-setup__initial">
                        <button
                            className="admin-setup__google-btn"
                            onClick={handleGoogleSignUp}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="admin-setup__loading">Setting up...</span>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" className="admin-setup__google-icon">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>Sign Up with Google</span>
                                </>
                            )}
                        </button>

                        <p className="admin-setup__note">
                            This page is for admin account creation only.
                            <br />
                            Regular users should use the main signup page.
                        </p>
                    </div>
                ) : (
                    <form className="admin-setup__form" onSubmit={handleSubmit}>
                        {/* Personal Information */}
                        <div className="admin-setup__section">
                            <h2 className="admin-setup__section-title">Personal Information</h2>

                            <div className="admin-setup__form-grid">
                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">First Name *</label>
                                    <input
                                        type="text"
                                        className={`admin-setup__input ${errors.firstName ? 'admin-setup__input--error' : ''}`}
                                        value={formData.firstName}
                                        onChange={(e) => updateField('firstName', e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                    {errors.firstName && <span className="admin-setup__error">{errors.firstName}</span>}
                                </div>

                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Last Name *</label>
                                    <input
                                        type="text"
                                        className={`admin-setup__input ${errors.lastName ? 'admin-setup__input--error' : ''}`}
                                        value={formData.lastName}
                                        onChange={(e) => updateField('lastName', e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                    {errors.lastName && <span className="admin-setup__error">{errors.lastName}</span>}
                                </div>

                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Mobile Number *</label>
                                    <input
                                        type="tel"
                                        className={`admin-setup__input ${errors.mobile ? 'admin-setup__input--error' : ''}`}
                                        value={formData.mobile}
                                        onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10-digit mobile number"
                                    />
                                    {errors.mobile && <span className="admin-setup__error">{errors.mobile}</span>}
                                </div>

                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Email *</label>
                                    <input
                                        type="email"
                                        className="admin-setup__input admin-setup__input--readonly"
                                        value={formData.email}
                                        readOnly
                                    />
                                </div>

                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Date of Birth *</label>
                                    <CustomDatePicker
                                        value={formData.dateOfBirth}
                                        onChange={(value) => updateField('dateOfBirth', value)}
                                        error={!!errors.dateOfBirth}
                                    />
                                    {errors.dateOfBirth && <span className="admin-setup__error">{errors.dateOfBirth}</span>}
                                </div>

                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Gender *</label>
                                    <CustomSelect
                                        options={GENDER_OPTIONS}
                                        value={formData.gender}
                                        onChange={(value) => updateField('gender', value)}
                                        placeholder="Select gender"
                                    />
                                    {errors.gender && <span className="admin-setup__error">{errors.gender}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Team Information */}
                        <div className="admin-setup__section">
                            <h2 className="admin-setup__section-title">Team Information</h2>

                            <div className="admin-setup__form-grid">
                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Team *</label>
                                    <CustomSelect
                                        options={ADMIN_TEAM_OPTIONS}
                                        value={formData.team}
                                        onChange={(value) => updateField('team', value)}
                                        placeholder="Select your team"
                                    />
                                    {errors.team && <span className="admin-setup__error">{errors.team}</span>}
                                </div>

                                <div className="admin-setup__form-group">
                                    <label className="admin-setup__label">Position *</label>
                                    <CustomSelect
                                        options={getPositionOptions()}
                                        value={formData.position}
                                        onChange={(value) => updateField('position', value)}
                                        placeholder="Select your position"
                                        disabled={!formData.team}
                                    />
                                    {errors.position && <span className="admin-setup__error">{errors.position}</span>}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="admin-setup__submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
