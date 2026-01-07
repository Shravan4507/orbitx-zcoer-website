import { Link } from 'react-router-dom';
import './Footer.css';
import footerLogo from '../../assets/logo/Logo_without_background.png';
import { useRecruitment } from '../../contexts/RecruitmentContext';

export default function Footer() {
    const { isRecruitmentOpen } = useRecruitment();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-column footer-brand">
                    <img
                        src={footerLogo}
                        alt="OrbitX"
                        className="footer-logo"
                    />
                    <p>Student-driven space and astronomy club focused on exploration, innovation, and hands-on learning.</p>
                </div>

                <div className="footer-column">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/about">About</Link></li>
                        <li><Link to="/events">Events</Link></li>
                        <li><Link to="/members">Members</Link></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Get Involved</h4>
                    <ul>
                        {isRecruitmentOpen ? (
                            <li><Link to="/join">Join OrbitX</Link></li>
                        ) : (
                            <li><Link to="/contact">Get in Touch</Link></li>
                        )}
                        <li><Link to="/merch">Merchandise</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Connect</h4>
                    <ul>
                        <li><a href="https://www.instagram.com/orbitx_zcoer/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                        <li><a href="https://www.linkedin.com/company/orbitx-zcoer/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                        <li><a href="mailto:contact@orbitxzcoer.club">E-mail</a></li>
                    </ul>
                </div>


                <div className="footer-column">
                    <h4>Location</h4>
                    <p>
                        <a
                            href="https://maps.app.goo.gl/zr4Yg3uhrYabnjH49"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="location-link"
                        >
                            Department Of Computer Engineering,<br />
                            Zeal College of Engineering and Research,<br />
                            Pune, Maharashtra 411041
                        </a>
                    </p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2025 OrbitX. All rights reserved.</p>
                <p className="footer-tagline"><a href="https://www.instagram.com/shravan45x/" target="_blank" rel="noopener noreferrer" className="creator-link">Creator - </a><span className="tooltip-wrapper" data-tooltip="@shravan45x"><a href="https://www.instagram.com/shravan45x/" target="_blank" rel="noopener noreferrer" className="spinning-dollar">$</a></span></p>
            </div>
        </footer>
    );
}
