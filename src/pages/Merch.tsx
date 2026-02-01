import './Merch.css';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/scroll/ScrollReveal';

export default function Merch() {
    return (
        <>
            <main className="merch-page merch-page--coming-soon">
                <ScrollReveal direction="fade">
                    <section className="merch-hero">
                        <h1 className="merch-hero__title">OrbitX Merchandise</h1>
                        <p className="merch-hero__subtitle">
                            Support our community while showcasing your passion for space.
                            Every purchase helps fund our events, workshops, and outreach programs.
                        </p>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.2}>
                    <div className="merch-coming-soon">
                        <div className="merch-coming-soon__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </div>
                        <h2 className="merch-coming-soon__title">Coming Soon...</h2>
                        <p className="merch-coming-soon__text">
                            We're working on something stellar! Our exclusive merchandise collection
                            will be launching soon with cosmic designs, premium quality, and sustainable materials.
                        </p>
                        <p className="merch-coming-soon__text">
                            Stay tuned and follow us on social media for updates and early access!
                        </p>
                    </div>
                </ScrollReveal>
            </main>

            <Footer />
        </>
    );
}
