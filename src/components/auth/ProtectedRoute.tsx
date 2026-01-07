// Protected Route Component - Requires authentication to access
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Show nothing while checking auth status (or you could show a loading spinner)
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading__spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // Not authenticated - redirect to login, preserving intended destination
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // Authenticated - render the protected content
    return <>{children}</>;
}
