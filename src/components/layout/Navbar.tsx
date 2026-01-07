import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/logo/Logo_without_background.png';
import { useSnowfall } from '../../contexts/SnowfallContext';
import { useRecruitment } from '../../contexts/RecruitmentContext';

export default function Navbar() {
    const { toggleSnow } = useSnowfall();
    const { isRecruitmentOpen } = useRecruitment();
    const clickCountRef = useRef(0);
    const lastClickTimeRef = useRef(0);
    const [showJoinTooltip, setShowJoinTooltip] = useState(false);

    // Easter egg: 3 clicks on logo triggers snowfall
    const handleLogoClick = (e: React.MouseEvent) => {
        const now = Date.now();

        // Reset counter if more than 1.5 seconds since last click
        if (now - lastClickTimeRef.current > 1500) {
            clickCountRef.current = 0;
        }

        clickCountRef.current++;
        lastClickTimeRef.current = now;

        if (clickCountRef.current >= 3) {
            e.preventDefault(); // Don't navigate on the 3rd click
            toggleSnow();
            clickCountRef.current = 0; // Reset counter
        }
    };

    // Handle Join click when recruitment is closed
    const handleJoinClick = (e: React.MouseEvent) => {
        if (!isRecruitmentOpen) {
            e.preventDefault();
            setShowJoinTooltip(true);
            // Auto-hide tooltip after 5 seconds
            setTimeout(() => setShowJoinTooltip(false), 5000);
        }
    };

    return (
        <nav className="navbar">
            <ul className="navbar__links navbar__links--left">
                <li className="navbar__item">
                    <Link to="/" className="navbar__link">Home</Link>
                </li>
                <li className="navbar__item">
                    <Link to="/about" className="navbar__link">About</Link>
                </li>
                <li className="navbar__item">
                    <Link to="/events" className="navbar__link">Events</Link>
                </li>
            </ul>
            <Link to="/" className="navbar__logo" onClick={handleLogoClick}>
                <img src={logo} alt="OrbitX" className="navbar__logo-img" />
            </Link>
            <ul className="navbar__links navbar__links--right">
                <li className="navbar__item">
                    <Link to="/members" className="navbar__link">Members</Link>
                </li>
                <li className="navbar__item navbar__item--join">
                    <Link
                        to={isRecruitmentOpen ? "/join" : "#"}
                        className={`navbar__link ${!isRecruitmentOpen ? 'navbar__link--disabled' : ''}`}
                        onClick={handleJoinClick}
                    >
                        Join
                    </Link>
                    {showJoinTooltip && (
                        <div className="navbar__tooltip">
                            <span>Recruitment is closed</span>
                            <span className="navbar__tooltip-sub">Check back later!</span>
                        </div>
                    )}
                </li>
                <li className="navbar__item">
                    <Link to="/merch" className="navbar__link">Merch</Link>
                </li>
            </ul>
        </nav>
    );
}
