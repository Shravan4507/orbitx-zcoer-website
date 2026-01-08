/**
 * Event Scanner Page
 * 
 * Admin page for QR scanning at events
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import QRScanner from '../components/admin/QRScanner';

export default function EventScanner() {
    const navigate = useNavigate();
    const [adminOrbitId, setAdminOrbitId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate('/login');
                return;
            }

            // Check if user is admin
            const adminDoc = await getDoc(doc(db, 'admins', user.uid));
            if (adminDoc.exists()) {
                setAdminOrbitId(adminDoc.data().orbitId || user.uid);
            } else {
                // Not an admin
                navigate('/user-dashboard');
                return;
            }

            setIsLoading(false);
        };

        checkAdmin();
    }, [navigate]);

    if (isLoading) {
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

    if (!adminOrbitId) {
        return null;
    }

    return (
        <QRScanner
            adminOrbitId={adminOrbitId}
            onClose={() => navigate('/user-dashboard')}
        />
    );
}
