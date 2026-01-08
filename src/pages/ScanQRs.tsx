/**
 * Scan QRs Page
 * 
 * Page for volunteers to scan event QR codes
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VolunteerScanner from '../components/scanner/VolunteerScanner';

export default function ScanQRs() {
    const navigate = useNavigate();
    const { isAuthenticated, profile, loading } = useAuth();
    const [userOrbitId, setUserOrbitId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                navigate('/login');
                return;
            }

            if (profile?.orbitId) {
                setUserOrbitId(profile.orbitId);
            }
        }
    }, [isAuthenticated, profile, loading, navigate]);

    if (loading || !userOrbitId) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#0a0a0f',
                color: '#fff',
            }}>
                Loading...
            </div>
        );
    }

    return (
        <VolunteerScanner
            userOrbitId={userOrbitId}
            onClose={() => navigate('/user-dashboard')}
        />
    );
}
