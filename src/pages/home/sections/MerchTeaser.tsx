import { Link } from 'react-router-dom';
import './MerchTeaser.css';

export default function MerchTeaser() {
    return (
        <section className="merch-teaser merch-teaser--coming-soon">
            <div className="merch-teaser__header">
                <h2 className="merch-teaser__heading">OrbitX Merchandise</h2>
                <p className="merch-teaser__subheading">
                    Wear your passion. Support the mission.
                </p>
            </div>

            <div className="merch-teaser__coming-soon">
                <div className="merch-teaser__coming-soon-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                </div>
                <h3 className="merch-teaser__coming-soon-title">Coming Soon</h3>
                <p className="merch-teaser__coming-soon-text">
                    Our exclusive merchandise collection is launching soon!
                    Premium quality, cosmic designs, and sustainable materials.
                </p>
                <Link to="/merch" className="merch-teaser__cta">
                    Learn More
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </Link>
            </div>
        </section>
    );
}
