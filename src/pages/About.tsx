import './About.css';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/scroll/ScrollReveal';
import zcoerLogo from '../assets/logo/ZCOER-Logo-White.png';

export default function About() {
    return (
        <>
            <main className="about-page">
                <ScrollReveal direction="fade">
                    <section className="about-hero">
                        <div className="about-hero__content">
                            <div className="heritage-badge">
                                <a href="https://zcoer.in" target="_blank" rel="noopener noreferrer" className="heritage-badge__link">
                                    <img src={zcoerLogo} alt="ZCOER Logo" className="heritage-badge__logo" />
                                </a>
                                <span className="heritage-badge__text">ZCOER Official Student Initiative</span>
                            </div>
                            <h1 className="about-hero__title">About OrbitX</h1>
                            <p className="about-hero__text">
                                OrbitX is a student-driven space and astronomy organization focused on exploring space technology,
                                fostering innovation, and building a community of curious learners and creators. We bring together
                                students passionate about space science, engineering, and research to learn, collaborate, and create
                                beyond the classroom.
                            </p>
                        </div>
                        <div className="about-hero__image">
                            <div className="about-hero__placeholder">
                                <span>Team Photo</span>
                            </div>
                        </div>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1}>
                    <section className="about-stats">
                        <div className="about-stats__item">
                            <span className="about-stats__number">28+</span>
                            <span className="about-stats__label">Active Members</span>
                        </div>
                        <div className="about-stats__item">
                            <span className="about-stats__number">1+</span>
                            <span className="about-stats__label">Projects</span>
                        </div>
                        <div className="about-stats__item">
                            <span className="about-stats__number">2+</span>
                            <span className="about-stats__label">Events Conducted</span>
                        </div>
                        <div className="about-stats__item">
                            <span className="about-stats__number">8+</span>
                            <span className="about-stats__label">Achievements</span>
                        </div>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1}>
                    <section className="about-mission-vision">
                        <div className="about-card about-card--mission">
                            <h2 className="about-card__title">Our Mission</h2>
                            <p className="about-card__text">
                                To inspire and empower students to explore space technology through hands-on projects,
                                collaborative learning, and innovative research. We aim to bridge the gap between
                                theoretical knowledge and practical application in aerospace engineering and space sciences.
                            </p>
                        </div>
                        <div className="about-card about-card--vision">
                            <h2 className="about-card__title">Our Vision</h2>
                            <p className="about-card__text">
                                To become a leading student organization contributing to the advancement of space technology
                                and exploration. We envision a future where our members emerge as pioneers in the space industry,
                                driving innovation and pushing the boundaries beyond Earth's horizons.
                            </p>
                        </div>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1}>
                    <section className="about-values">
                        <h2 className="about-values__heading">Our Core Values</h2>
                        <div className="about-values__grid">
                            <div className="about-value-card">
                                <h3 className="about-value-card__title">Innovation</h3>
                                <p className="about-value-card__text">
                                    Pushing boundaries through creative problem-solving and emerging technologies.
                                </p>
                            </div>
                            <div className="about-value-card">
                                <h3 className="about-value-card__title">Collaboration</h3>
                                <p className="about-value-card__text">
                                    Working together as teams to achieve meaningful outcomes in space exploration.
                                </p>
                            </div>
                            <div className="about-value-card">
                                <h3 className="about-value-card__title">Learning</h3>
                                <p className="about-value-card__text">
                                    Continuous growth through hands-on experience, experimentation, and knowledge sharing.
                                </p>
                            </div>
                            <div className="about-value-card">
                                <h3 className="about-value-card__title">Excellence</h3>
                                <p className="about-value-card__text">
                                    Striving for high standards, precision, and impact in everything we build.
                                </p>
                            </div>
                        </div>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1}>
                    <section className="about-journey">
                        <h2 className="about-journey__heading">Our Journey</h2>
                        <div className="about-journey__container">
                            <div className="about-journey__gallery">
                                <div className="about-journey__image-placeholder">
                                    <span>Event Photo 1</span>
                                </div>
                                <div className="about-journey__image-placeholder">
                                    <span>Event Photo 2</span>
                                </div>
                                <div className="about-journey__image-placeholder about-journey__image-placeholder--large">
                                    <span>Workshop / Session Photo</span>
                                </div>
                            </div>
                            <div className="about-journey__content">
                                <p className="about-journey__text">
                                    Founded at Zeal College of Engineering and Research (ZCOER), OrbitX began as a small group
                                    of students fascinated by space exploration and technology. What started as informal discussions
                                    about rockets and satellites gradually evolved into a structured and purpose-driven organization.
                                </p>
                                <p className="about-journey__text">
                                    Today, OrbitX comprises six dedicated teams working across multiple domains of space technology,
                                    including satellite development, research, and exploration concepts. Our members collaborate on
                                    real-world projects, participate in national-level competitions, and actively contribute to
                                    India's growing space technology ecosystem.
                                </p>
                                <p className="about-journey__text">
                                    We believe the future of space exploration lies in the hands of today's students. Through OrbitX,
                                    we provide a platform for learning, experimentation, and innovation—preparing our members for
                                    careers in the rapidly expanding space and aerospace industry.
                                </p>
                            </div>
                        </div>
                    </section>
                </ScrollReveal>
            </main>
            <Footer />
        </>
    );
}
