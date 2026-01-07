import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginButton.css';

export default function LoginButton() {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuth();

    // Show loading state while auth is being determined
    if (loading) {
        return (
            <button className="login-button login-button--loading" disabled>
                ...
            </button>
        );
    }

    // User is fully authenticated with profile
    if (isAuthenticated) {
        return (
            <button className="login-button" onClick={() => navigate('/user-dashboard')}>
                Dashboard
            </button>
        );
    }

    // Not authenticated
    return (
        <button className="login-button" onClick={() => navigate('/login')}>
            Login
        </button>
    );
}
