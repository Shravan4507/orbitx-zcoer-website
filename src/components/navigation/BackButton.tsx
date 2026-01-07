import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './BackButton.css';

export default function BackButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const [canGoBack, setCanGoBack] = useState(false);

    useEffect(() => {
        // Check if there's history to go back to
        // We consider we can go back if we're not on the home page
        // and if the key exists (indicating navigation happened)
        setCanGoBack(location.key !== 'default');
    }, [location]);

    const handleBack = () => {
        if (canGoBack) {
            navigate(-1);
        }
    };

    return (
        <button
            className={`global-back-button ${!canGoBack ? 'global-back-button--hidden' : ''}`}
            onClick={handleBack}
            aria-label="Go back"
            disabled={!canGoBack}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>
    );
}
