import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginButton.css';

export default function LoginButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading, profile, logout } = useAuth();

    // Dropdown state
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownClosing, setDropdownClosing] = useState(false);

    // Check if we're on the dashboard
    const isOnDashboard = location.pathname === '/user-dashboard';

    // Get user initials for fallback
    const getInitials = () => {
        const first = profile?.firstName?.[0] || 'U';
        const last = profile?.lastName?.[0] || '';
        return `${first}${last}`.toUpperCase();
    };

    // Toggle dropdown with animation
    const toggleDropdown = () => {
        if (showDropdown) {
            setDropdownClosing(true);
            setTimeout(() => {
                setShowDropdown(false);
                setDropdownClosing(false);
            }, 300);
        } else {
            setShowDropdown(true);
        }
    };

    // Handle avatar click
    const handleAvatarClick = () => {
        if (isOnDashboard) {
            toggleDropdown();
        } else {
            navigate('/user-dashboard');
        }
    };

    // Handle dropdown navigation
    const handleNavigation = (path: string) => {
        toggleDropdown();
        navigate(path);
    };

    // Handle logout
    const handleLogout = async () => {
        toggleDropdown();
        await logout();
        navigate('/');
    };

    // Close dropdown when clicking outside
    const handleOutsideClick = () => {
        if (showDropdown) {
            toggleDropdown();
        }
    };

    // Show loading state while auth is being determined
    if (loading) {
        return (
            <div className="login-avatar login-avatar--loading">
                <div className="login-avatar__spinner" />
            </div>
        );
    }

    // User is fully authenticated with profile - show avatar
    if (isAuthenticated) {
        return (
            <>
                {/* Backdrop to close dropdown when clicking outside */}
                {showDropdown && (
                    <div className="login-avatar-backdrop" onClick={handleOutsideClick} />
                )}

                <div className="login-avatar-wrap">
                    <button
                        className="login-avatar"
                        onClick={handleAvatarClick}
                        aria-label={isOnDashboard ? "Open menu" : "Go to Dashboard"}
                    >
                        {profile?.avatar ? (
                            <img
                                src={profile.avatar}
                                alt=""
                                className="login-avatar__img"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="login-avatar__initials">{getInitials()}</span>
                        )}
                    </button>

                    {/* Dropdown Menu (only on dashboard) */}
                    {showDropdown && (
                        <div className={`login-avatar-dropdown ${dropdownClosing ? 'closing' : ''}`}>
                            <button onClick={() => handleNavigation('/user-dashboard')}>
                                Dashboard
                            </button>
                            <button onClick={() => handleNavigation('/user-dashboard')}>
                                Profile
                            </button>
                            <button onClick={() => handleNavigation('/user-dashboard')}>
                                Settings
                            </button>
                            <button onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // Not authenticated - show login button
    return (
        <button className="login-button" onClick={() => navigate('/login')}>
            Login
        </button>
    );
}
