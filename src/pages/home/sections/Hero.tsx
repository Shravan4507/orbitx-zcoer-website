import './Hero.css';
import logo from '../../../assets/logo/Logo_without_background.png';

export default function Hero() {
    return (
        <section className="hero">
            <div className="hero__container">
                <div className="hero__logo-wrapper">
                    <img src={logo} alt="OrbitX" className="hero__logo" />
                </div>
                <h1 className="hero__headline">Where Curiosity Meets The Cosmos</h1>
                <p className="hero__subheading">
                    Join us in pushing the boundaries of space exploration, innovation, and collaborative learning.
                    <br />
                    Together, we reach for the stars.
                </p>
            </div>
            <div className="hero__scroll-indicator">
                <svg className="hero__arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </section>
    );
}
