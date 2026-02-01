import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/toast/Toast';
import CustomSelect from '../components/ui/CustomSelect';
import CustomDatePicker from '../components/ui/CustomDatePicker';
import Autocomplete from '../components/ui/Autocomplete';
import { completeGoogleSignup } from '../services/firebase/auth';
import { auth } from '../services/firebase/config';
import collegesData from '../data/colleges.json';
import { majors } from '../data/majors';
import {
    GENDER_OPTIONS,
    QUALIFICATION_LEVELS,
    STREAM_OPTIONS,
    YEAR_OF_STUDY_OPTIONS,
    generateGraduationYears,
} from '../types/user';
import './Signup.css';

interface SignupFormData {
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

export default function Signup() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    // Check if coming from Google sign-in with pre-filled email
    const prefilledEmail = location.state?.email || '';
    const isGoogleSignup = location.state?.isGoogleSignup || false;

    const [formData, setFormData] = useState<SignupFormData>({
        firstName: '',
        lastName: '',
        mobile: '',
        email: prefilledEmail,
        dateOfBirth: '',
        gender: '',
        qualificationLevel: '',
        stream: '',
        collegeName: '',
        courseName: '',
        yearOfStudy: '',
        yearOfGraduation: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Redirect to login if user tries to access signup directly without Google auth
    useEffect(() => {
        if (!isGoogleSignup || !auth.currentUser) {
            showToast('Please sign in with Google to create an account', 'info');
            navigate('/login');
        }
    }, [isGoogleSignup, navigate, showToast]);

    const graduationYears = generateGraduationYears();

    // Calculate max date for DOB (minimum 13 years old)
    const getMaxDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 13);
        return today.toISOString().split('T')[0];
    };

    // Calculate min date for DOB (maximum 100 years old)
    const getMinDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 100);
        return today.toISOString().split('T')[0];
    };

    const validateStep1 = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        } else if (formData.firstName.length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        } else if (formData.lastName.length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters';
        }

        if (!formData.mobile.trim()) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
            newErrors.mobile = 'Please enter a valid 10-digit mobile number';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        }

        if (!formData.gender) {
            newErrors.gender = 'Please select your sex';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.qualificationLevel) {
            newErrors.qualificationLevel = 'Please select qualification level';
        }

        if (!formData.stream) {
            newErrors.stream = 'Please select your stream';
        }

        if (!formData.collegeName.trim()) {
            newErrors.collegeName = 'Please select your college from the list';
        }

        if (!formData.courseName) {
            newErrors.courseName = 'Please select your major';
        }

        if (!formData.yearOfStudy) {
            newErrors.yearOfStudy = 'Please select year of study';
        }

        if (!formData.yearOfGraduation) {
            newErrors.yearOfGraduation = 'Please select graduation year';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handler for custom select/datepicker components
    const handleCustomChange = (name: keyof SignupFormData, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleNextStep = () => {
        if (currentStep === 1 && validateStep1()) {
            setCurrentStep(2);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep2()) {
            showToast('Please fix the errors in the form', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Complete Google signup - user is already authenticated via Google
            const profile = await completeGoogleSignup(formData);

            // Store info for first login welcome
            localStorage.setItem('orbitx_first_login', profile.firstName);

            showToast('Account created successfully!', 'success');

            // Small delay then show second toast
            setTimeout(() => {
                showToast('Please login again!', 'info');
            }, 500);

            // Redirect to login page
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error: any) {
            console.error('Registration error:', error);

            // Handle specific Firebase errors
            if (error.code === 'auth/email-already-in-use') {
                showToast('This email is already registered. Please login instead.', 'error');
                navigate('/login');
            } else if (error.message?.includes('No authenticated user')) {
                showToast('Session expired. Please sign in with Google again.', 'error');
                navigate('/login');
            } else {
                showToast('Failed to create account. Please try again.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep1 = () => (
        <div className="signup-step">
            <h3 className="signup-step__title">Personal Information</h3>

            <div className="signup-form__row">
                <div className="signup-form__group">
                    <label className="signup-form__label">First Name *</label>
                    <input
                        type="text"
                        name="firstName"
                        className={`signup-form__input ${errors.firstName ? 'signup-form__input--error' : ''}`}
                        placeholder="Enter your first name"
                        value={formData.firstName}
                        onChange={handleChange}
                    />
                    {errors.firstName && <span className="signup-form__error">{errors.firstName}</span>}
                </div>
                <div className="signup-form__group">
                    <label className="signup-form__label">Last Name *</label>
                    <input
                        type="text"
                        name="lastName"
                        className={`signup-form__input ${errors.lastName ? 'signup-form__input--error' : ''}`}
                        placeholder="Enter your last name"
                        value={formData.lastName}
                        onChange={handleChange}
                    />
                    {errors.lastName && <span className="signup-form__error">{errors.lastName}</span>}
                </div>
            </div>

            <div className="signup-form__group">
                <label className="signup-form__label">Mobile Number *</label>
                <input
                    type="tel"
                    name="mobile"
                    className={`signup-form__input ${errors.mobile ? 'signup-form__input--error' : ''}`}
                    placeholder="Enter your 10-digit mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    maxLength={10}
                />
                {errors.mobile && <span className="signup-form__error">{errors.mobile}</span>}
            </div>
            <div className="signup-form__group">
                <label className="signup-form__label">
                    Email *
                </label>
                <input
                    type="email"
                    name="email"
                    className={`signup-form__input ${errors.email ? 'signup-form__input--error' : ''}`}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly={isGoogleSignup}
                />
                {errors.email && <span className="signup-form__error">{errors.email}</span>}
            </div>

            <div className="signup-form__row">
                <div className="signup-form__group">
                    <label className="signup-form__label">Date of Birth *</label>
                    <CustomDatePicker
                        value={formData.dateOfBirth}
                        onChange={(value) => handleCustomChange('dateOfBirth', value)}
                        minDate={getMinDate()}
                        maxDate={getMaxDate()}
                        placeholder="Select Date"
                        error={!!errors.dateOfBirth}
                    />
                    {errors.dateOfBirth && <span className="signup-form__error">{errors.dateOfBirth}</span>}
                </div>
                <div className="signup-form__group">
                    <label className="signup-form__label">Sex *</label>
                    <CustomSelect
                        options={GENDER_OPTIONS}
                        value={formData.gender}
                        onChange={(value) => handleCustomChange('gender', value)}
                        placeholder="Select Sex"
                        error={!!errors.gender}
                    />
                    {errors.gender && <span className="signup-form__error">{errors.gender}</span>}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="signup-step">
            <h3 className="signup-step__title">Academic Information</h3>

            <div className="signup-form__row">
                <div className="signup-form__group">
                    <label className="signup-form__label">Qualification Level *</label>
                    <CustomSelect
                        options={QUALIFICATION_LEVELS}
                        value={formData.qualificationLevel}
                        onChange={(value) => handleCustomChange('qualificationLevel', value)}
                        placeholder="Select Level"
                        error={!!errors.qualificationLevel}
                    />
                    {errors.qualificationLevel && <span className="signup-form__error">{errors.qualificationLevel}</span>}
                </div>
                <div className="signup-form__group">
                    <label className="signup-form__label">Stream *</label>
                    <CustomSelect
                        options={STREAM_OPTIONS}
                        value={formData.stream}
                        onChange={(value) => handleCustomChange('stream', value)}
                        placeholder="Select Stream"
                        error={!!errors.stream}
                    />
                    {errors.stream && <span className="signup-form__error">{errors.stream}</span>}
                </div>
            </div>

            <div className="signup-form__group">
                <label className="signup-form__label">College/University Name *</label>
                <Autocomplete
                    options={collegesData as string[]}
                    value={formData.collegeName}
                    onChange={(value) => handleCustomChange('collegeName', value)}
                    placeholder="Start typing your college name..."
                    error={!!errors.collegeName}
                />
                {errors.collegeName && <span className="signup-form__error">{errors.collegeName}</span>}
            </div>

            <div className="signup-form__group">
                <label className="signup-form__label">Major *</label>
                <CustomSelect
                    options={majors.map(m => ({ value: m, label: m }))}
                    value={formData.courseName}
                    onChange={(value) => handleCustomChange('courseName', value)}
                    placeholder="Select Major"
                    error={!!errors.courseName}
                />
                {errors.courseName && <span className="signup-form__error">{errors.courseName}</span>}
            </div>

            <div className="signup-form__row">
                <div className="signup-form__group">
                    <label className="signup-form__label">Year of Study *</label>
                    <CustomSelect
                        options={YEAR_OF_STUDY_OPTIONS}
                        value={formData.yearOfStudy}
                        onChange={(value) => handleCustomChange('yearOfStudy', value)}
                        placeholder="Select Year"
                        error={!!errors.yearOfStudy}
                    />
                    {errors.yearOfStudy && <span className="signup-form__error">{errors.yearOfStudy}</span>}
                </div>
                <div className="signup-form__group">
                    <label className="signup-form__label">Year of Graduation *</label>
                    <CustomSelect
                        options={graduationYears}
                        value={formData.yearOfGraduation}
                        onChange={(value) => handleCustomChange('yearOfGraduation', value)}
                        placeholder="Select Year"
                        error={!!errors.yearOfGraduation}
                    />
                    {errors.yearOfGraduation && <span className="signup-form__error">{errors.yearOfGraduation}</span>}
                </div>
            </div>
        </div>
    );

    return (
        <main className="signup-page page-transition">
            <div className="signup-container">
                <div className="signup-header">
                    <h1 className="signup-title">Create Account</h1>
                    <p className="signup-subtitle">Complete your profile to join OrbitX</p>
                </div>

                {/* Progress Steps - Now only 2 steps */}
                <div className="signup-progress">
                    <div className={`signup-progress__step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                        <div className="signup-progress__circle">
                            {currentStep > 1 ? '✓' : '1'}
                        </div>
                        <span className="signup-progress__label">Personal</span>
                    </div>
                    <div className="signup-progress__line"></div>
                    <div className={`signup-progress__step ${currentStep >= 2 ? 'active' : ''}`}>
                        <div className="signup-progress__circle">2</div>
                        <span className="signup-progress__label">Academic</span>
                    </div>
                </div>

                <form className="signup-form" onSubmit={handleSubmit}>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}

                    <div className="signup-form__actions">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                className="signup-form__btn signup-form__btn--secondary"
                                onClick={handlePrevStep}
                            >
                                Back
                            </button>
                        )}

                        {currentStep < 2 ? (
                            <button
                                type="button"
                                className="signup-form__btn signup-form__btn--primary"
                                onClick={handleNextStep}
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="signup-form__btn signup-form__btn--primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="signup-form__spinner"></span>
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        )}
                    </div>
                </form>

                <div className="signup-footer">
                    <span>Already have an account?</span>
                    <button type="button" className="signup-footer__login" onClick={() => navigate('/login')}>
                        Sign In
                    </button>
                </div>
            </div>
        </main>
    );
}
