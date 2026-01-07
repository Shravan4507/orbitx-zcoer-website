import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/toast/Toast';
import './ForgotPassword.css';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email');
            return;
        }

        setIsSubmitted(true);
        showToast('Reset link sent to your email', 'success');
    };

    return (
        <main className="forgot-password-page page-transition">
            <div className="forgot-password-container">
                {!isSubmitted ? (
                    <>
                        <div className="forgot-password-header">
                            <div className="forgot-password-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            <h1 className="forgot-password-title">Forgot Password?</h1>
                            <p className="forgot-password-subtitle">
                                No worries! Enter your email and we'll send you a reset link.
                            </p>
                        </div>

                        <form className="forgot-password-form" onSubmit={handleSubmit}>
                            <div className="forgot-password-form__group">
                                <label className="forgot-password-form__label">Email Address</label>
                                <input
                                    type="email"
                                    className={`forgot-password-form__input ${error ? 'forgot-password-form__input--error' : ''}`}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError('');
                                    }}
                                />
                                {error && <span className="forgot-password-form__error">{error}</span>}
                            </div>

                            <button type="submit" className="forgot-password-form__submit">
                                Send Reset Link
                            </button>
                        </form>

                        <button
                            className="forgot-password-back"
                            onClick={() => navigate('/login')}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back to Login
                        </button>
                    </>
                ) : (
                    <div className="forgot-password-success">
                        <div className="forgot-password-success__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <h2 className="forgot-password-success__title">Check Your Email</h2>
                        <p className="forgot-password-success__text">
                            We've sent a password reset link to<br />
                            <strong>{email}</strong>
                        </p>
                        <p className="forgot-password-success__hint">
                            Didn't receive the email? Check your spam folder.
                        </p>
                        <button
                            className="forgot-password-success__btn"
                            onClick={() => navigate('/login')}
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
