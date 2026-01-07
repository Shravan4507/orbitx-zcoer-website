import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsOverlay.css';
import { useToast } from '../toast/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { deleteUserAccount } from '../../services/firebase/auth';

type SettingsOverlayProps = {
    isOpen: boolean;
    onClose: () => void;
};

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ja', name: '日本語' }
];

export default function SettingsOverlay({ isOpen, onClose }: SettingsOverlayProps) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { profile } = useAuth();
    const [isClosing, setIsClosing] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleClose = () => {
        if (isDeleting) return; // Don't close while deleting
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setShowDeleteConfirm(false);
            setConfirmText('');
            onClose();
        }, 300);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isDeleting) {
            handleClose();
        }
    };

    const handleLanguageChange = (code: string) => {
        setSelectedLanguage(code);
        const lang = LANGUAGES.find(l => l.code === code);
        showToast(`Language changed to ${lang?.name}`, 'success');
    };

    const handleDeleteAccount = async () => {
        // Require user to type "DELETE" to confirm
        if (confirmText !== 'DELETE') {
            showToast('Please type DELETE to confirm', 'error');
            return;
        }

        setIsDeleting(true);

        try {
            await deleteUserAccount();
            showToast('Your account has been deleted', 'info');
            // Navigate to home after short delay
            setTimeout(() => {
                navigate('/');
            }, 500);
        } catch (error: any) {
            console.error('Delete account error:', error);

            if (error.message?.includes('log out and log back in')) {
                showToast('Please log out and log back in, then try again', 'error');
            } else {
                showToast('Failed to delete account. Please try again.', 'error');
            }
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
        setConfirmText('');
    };

    if (!isOpen) return null;

    return (
        <div
            className={`settings-overlay ${isClosing ? 'settings-overlay--closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className="settings-overlay__modal">
                <button
                    className="settings-overlay__close"
                    onClick={handleClose}
                    disabled={isDeleting}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="settings-overlay__header">
                    <h2 className="settings-overlay__title">Settings</h2>
                </div>

                <div className="settings-overlay__content">
                    <div className="settings-overlay__section">
                        <h3 className="settings-overlay__section-title">Language</h3>
                        <p className="settings-overlay__section-desc">Select your preferred language</p>
                        <div className="settings-overlay__language-grid">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    className={`settings-overlay__language-btn ${selectedLanguage === lang.code ? 'settings-overlay__language-btn--active' : ''}`}
                                    onClick={() => handleLanguageChange(lang.code)}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="settings-overlay__section settings-overlay__section--danger">
                        <h3 className="settings-overlay__section-title">Danger Zone</h3>
                        <p className="settings-overlay__section-desc">
                            This action cannot be undone. All your data will be permanently deleted.
                        </p>

                        {!showDeleteConfirm ? (
                            <button
                                className="settings-overlay__delete-btn"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                Delete Account
                            </button>
                        ) : (
                            <div className="settings-overlay__delete-confirm">
                                <div className="settings-overlay__delete-info">
                                    <p className="settings-overlay__delete-warning">
                                        ⚠️ You are about to delete your account
                                    </p>
                                    <p className="settings-overlay__delete-details">
                                        <strong>Orbit ID:</strong> {profile?.orbitId}<br />
                                        <strong>Email:</strong> {profile?.email}
                                    </p>
                                </div>

                                <div className="settings-overlay__confirm-input-group">
                                    <label className="settings-overlay__confirm-label">
                                        Type <strong>DELETE</strong> to confirm:
                                    </label>
                                    <input
                                        type="text"
                                        className="settings-overlay__confirm-input"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                        placeholder="Type DELETE here"
                                        disabled={isDeleting}
                                    />
                                </div>

                                <div className="settings-overlay__delete-actions">
                                    <button
                                        className="settings-overlay__cancel-delete"
                                        onClick={handleCancelDelete}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="settings-overlay__confirm-delete"
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting || confirmText !== 'DELETE'}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete Forever'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
