// Public Route Component - Redirects to dashboard if already authenticated
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PublicRouteProps {
    children: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Get the page they were trying to access before being redirected to login
    const from = (location.state as { from?: string })?.from || '/user-dashboard';

    // Show nothing while checking auth status
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading__spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Already authenticated - redirect to dashboard (or where they came from)
    if (isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    // Not authenticated - render the public content (login/signup page)
    return <>{children}</>;
}
