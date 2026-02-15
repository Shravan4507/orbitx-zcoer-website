import { motion } from 'framer-motion';
import './Hero.css';
import logo from '../../../assets/logo/Logo_without_background.png';
import zcoerLogo from '../../../assets/logo/ZCOER-Logo-White.png';

export default function Hero() {
    // Bang Animation Variants
    const bangContainer: any = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    };

    const bangItem: any = {
        hidden: {
            scale: 0,
            opacity: 0,
            filter: 'blur(20px) brightness(2)',
            y: 0
        },
        visible: {
            scale: 1,
            opacity: 1,
            filter: 'blur(0px) brightness(1)',
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 15,
                duration: 0.8
            }
        }
    };

    return (
        <section className="hero">
            <motion.div
                className="hero__container"
                variants={bangContainer}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="hero__logo-wrapper"
                    variants={bangItem}
                >
                    <a href="https://zcoer.in" target="_blank" rel="noopener noreferrer" className="hero__zcoer-link">
                        <img src={zcoerLogo} alt="ZCOER" className="hero__zcoer-logo" />
                    </a>
                    <span className="hero__presents">PRESENTS</span>
                    <img src={logo} alt="OrbitX" className="hero__logo" />
                </motion.div>

                <motion.h1
                    className="hero__headline"
                    variants={bangItem}
                >
                    Where Curiosity Meets The Cosmos
                </motion.h1>

                <motion.p
                    className="hero__subheading"
                    variants={bangItem}
                >
                    Join us in pushing the boundaries of space exploration, innovation, and collaborative learning.
                    <br />
                    Together, we reach for the stars.
                </motion.p>
            </motion.div>

            <motion.div
                className="hero__scroll-indicator"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.8, type: 'spring' }}
            >
                <svg className="hero__arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </motion.div>
        </section>
    );
}
