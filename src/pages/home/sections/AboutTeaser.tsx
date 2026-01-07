import { Link } from 'react-router-dom';
import './AboutTeaser.css';

export default function AboutTeaser() {
    return (
        <section className="about-teaser">
            <div className="about-teaser__fade"></div>
            <div className="about-teaser__container">
                <div className="about-teaser__image">
                    <div className="about-teaser__placeholder"></div>
                </div>
                <div className="about-teaser__content">
                    <h2 className="about-teaser__heading">What is OrbitX?</h2>
                    <p className="about-teaser__body">
                        OrbitX is a student-driven space and astronomy club focused on exploration, innovation, and hands-on learning.
                        <br />
                        We bring together curious minds to experiment, collaborate, and push beyond the classroom.
                    </p>
                    <Link to="/about" className="about-teaser__button">Explore More <span className="about-teaser__arrow">→</span></Link>
                </div>
            </div>
        </section>
    );
}
