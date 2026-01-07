import { useState, useEffect } from 'react';
import type { EventData } from './types';
import './RegistrationModal.css';

interface RegistrationModalProps {
    event: EventData;
    isOpen: boolean;
    onClose: () => void;
    userProfile: {
        orbitId: string;
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
        collegeName: string;
    } | null;
    onRegisterComplete: (registrationData: RegistrationData) => void;
}

export interface RegistrationData {
    orbitId: string;
    fullName: string;
    email: string;
    mobile: string;
    collegeName: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    govIdType: 'aadhar' | 'pan';
    govIdLast4: string;
    registeredAt: string;
}

// Validate Aadhar last 4 (all digits)
const isValidAadharLast4 = (value: string): boolean => {
    return /^\d{4}$/.test(value);
};

// Validate PAN last 4 (3 digits + 1 letter)
const isValidPanLast4 = (value: string): boolean => {
    return /^\d{3}[A-Za-z]$/.test(value);
};

// Auto-detect ID type from input
const detectIdType = (value: string): 'aadhar' | 'pan' | null => {
    if (isValidAadharLast4(value)) return 'aadhar';
    if (isValidPanLast4(value)) return 'pan';
    return null;
};

// Format date for display
const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

// LocalStorage key for registration progress
const getStorageKey = (eventId: string, orbitId: string) =>
    `registration_${eventId}_${orbitId}`;

export default function RegistrationModal({
    event,
    isOpen,
    onClose,
    userProfile,
    onRegisterComplete
}: RegistrationModalProps) {
    const [govIdLast4, setGovIdLast4] = useState('');
    const [detectedIdType, setDetectedIdType] = useState<'aadhar' | 'pan' | null>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const isPaidEvent = event.amount && event.amount > 0;

    // Load saved progress from localStorage
    useEffect(() => {
        if (isOpen && userProfile && event.id) {
            const storageKey = getStorageKey(event.id, userProfile.orbitId);
            const savedProgress = localStorage.getItem(storageKey);
            if (savedProgress) {
                try {
                    const parsed = JSON.parse(savedProgress);
                    setGovIdLast4(parsed.govIdLast4 || '');
                    setDetectedIdType(parsed.detectedIdType || null);
                    setAgreedToTerms(parsed.agreedToTerms || false);
                } catch {
                    // Invalid data, ignore
                }
            }
        }
    }, [isOpen, userProfile, event.id]);

    // Save progress to localStorage on change
    useEffect(() => {
        if (userProfile && event.id && (govIdLast4 || agreedToTerms)) {
            const storageKey = getStorageKey(event.id, userProfile.orbitId);
            localStorage.setItem(storageKey, JSON.stringify({
                govIdLast4,
                detectedIdType,
                agreedToTerms
            }));
        }
    }, [govIdLast4, detectedIdType, agreedToTerms, userProfile, event.id]);

    // Handle Gov ID input
    const handleGovIdChange = (value: string) => {
        // Limit to 4 characters
        const trimmed = value.slice(0, 4).toUpperCase();
        setGovIdLast4(trimmed);
        setError('');

        if (trimmed.length === 4) {
            const type = detectIdType(trimmed);
            setDetectedIdType(type);
            if (!type) {
                setError('Invalid format. Enter 4 digits for Aadhar or 3 digits + 1 letter for PAN.');
            }
        } else {
            setDetectedIdType(null);
        }
    };

    // Handle close with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    // Handle overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!userProfile) {
            setError('Please log in to register');
            return;
        }

        if (govIdLast4.length !== 4) {
            setError('Please enter last 4 characters of your Government ID');
            return;
        }

        if (!detectedIdType) {
            setError('Invalid Government ID format');
            return;
        }

        if (!agreedToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const registrationData: RegistrationData = {
                orbitId: userProfile.orbitId,
                fullName: `${userProfile.firstName} ${userProfile.lastName}`,
                email: userProfile.email,
                mobile: userProfile.mobile,
                collegeName: userProfile.collegeName,
                eventId: event.id,
                eventName: event.title,
                eventDate: event.date,
                govIdType: detectedIdType,
                govIdLast4: govIdLast4,
                registeredAt: new Date().toISOString()
            };

            // Clear localStorage progress
            const storageKey = getStorageKey(event.id, userProfile.orbitId);
            localStorage.removeItem(storageKey);

            // Call the completion handler
            onRegisterComplete(registrationData);

        } catch (err) {
            setError('Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Pay Now (placeholder for future payment integration)
    const handlePayNow = () => {
        if (!agreedToTerms) {
            setError('Please agree to the terms and conditions');
            return;
        }

        if (govIdLast4.length !== 4 || !detectedIdType) {
            setError('Please enter valid Government ID');
            return;
        }

        // TODO: Integrate payment gateway
        alert('Payment integration coming soon!');
    };

    if (!isOpen) return null;

    return (
        <div
            className={`registration-modal-overlay ${isClosing ? 'registration-modal-overlay--closing' : ''}`}
            onClick={handleOverlayClick}
        >
            <div className={`registration-modal ${isClosing ? 'registration-modal--closing' : ''}`}>
                {/* Header */}
                <div className="registration-modal__header">
                    <h2 className="registration-modal__title">Event Registration</h2>
                    <button className="registration-modal__close" onClick={handleClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="registration-modal__content">
                    {/* Event Info */}
                    <div className="registration-modal__event-info">
                        <h3 className="registration-modal__event-name">{event.title}</h3>
                        <p className="registration-modal__event-date">{formatEventDate(event.date)}</p>
                        {isPaidEvent && (
                            <span className="registration-modal__event-fee">₹{event.amount}</span>
                        )}
                    </div>

                    {/* User Details (Pre-filled) */}
                    <div className="registration-modal__section">
                        <h4 className="registration-modal__section-title">Your Details</h4>

                        <div className="registration-modal__field">
                            <label className="registration-modal__label">Orbit ID</label>
                            <input
                                type="text"
                                className="registration-modal__input registration-modal__input--readonly"
                                value={userProfile?.orbitId || ''}
                                readOnly
                            />
                        </div>

                        <div className="registration-modal__field">
                            <label className="registration-modal__label">Full Name</label>
                            <input
                                type="text"
                                className="registration-modal__input registration-modal__input--readonly"
                                value={userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : ''}
                                readOnly
                            />
                        </div>

                        <div className="registration-modal__row">
                            <div className="registration-modal__field">
                                <label className="registration-modal__label">Email Address</label>
                                <input
                                    type="email"
                                    className="registration-modal__input registration-modal__input--readonly"
                                    value={userProfile?.email || ''}
                                    readOnly
                                />
                            </div>

                            <div className="registration-modal__field">
                                <label className="registration-modal__label">Mobile Number</label>
                                <input
                                    type="tel"
                                    className="registration-modal__input registration-modal__input--readonly"
                                    value={userProfile?.mobile || ''}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className="registration-modal__field">
                            <label className="registration-modal__label">College Name</label>
                            <input
                                type="text"
                                className="registration-modal__input registration-modal__input--readonly"
                                value={userProfile?.collegeName || ''}
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Government ID */}
                    <div className="registration-modal__section">
                        <h4 className="registration-modal__section-title">Identity Verification</h4>

                        <div className="registration-modal__field">
                            <label className="registration-modal__label">
                                Government ID (Last 4 characters) *
                            </label>
                            <input
                                type="text"
                                className="registration-modal__input"
                                value={govIdLast4}
                                onChange={(e) => handleGovIdChange(e.target.value)}
                                placeholder="e.g., 1234 for Aadhar or 123A for PAN"
                                maxLength={4}
                            />
                            {detectedIdType && (
                                <span className="registration-modal__id-detected">
                                    Detected: {detectedIdType === 'aadhar' ? 'Aadhar Card' : 'PAN Card'}
                                </span>
                            )}
                            <p className="registration-modal__hint">
                                Enter last 4 digits of Aadhar (e.g., 1234) or last 4 characters of PAN (e.g., 123A)
                            </p>
                        </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="registration-modal__terms">
                        <label className="registration-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => {
                                    setAgreedToTerms(e.target.checked);
                                    setError('');
                                }}
                            />
                            <span className="registration-modal__checkbox-text">
                                I agree to the <a href="/terms" target="_blank">Terms and Conditions</a> and confirm that the information provided is accurate.
                            </span>
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="registration-modal__error">{error}</p>
                    )}

                    {/* Action Button */}
                    <div className="registration-modal__actions">
                        {isPaidEvent ? (
                            <button
                                className="registration-modal__btn registration-modal__btn--pay"
                                onClick={handlePayNow}
                                disabled={isSubmitting}
                            >
                                Pay ₹{event.amount}
                            </button>
                        ) : (
                            <button
                                className="registration-modal__btn registration-modal__btn--register"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Registering...' : 'Register'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
