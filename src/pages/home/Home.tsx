import Hero from './sections/Hero';
import AboutTeaser from './sections/AboutTeaser';
import EventsTeaser from './sections/EventsTeaser';
import MembersGlimpse from './sections/MembersGlimpse';
import JoinCTA from './sections/JoinCTA';
import MerchTeaser from './sections/MerchTeaser';
import Footer from '../../components/layout/Footer';
import ScrollReveal from '../../components/scroll/ScrollReveal';

export default function Home() {
    return (
        <>
            <Hero />
            <ScrollReveal direction="up">
                <AboutTeaser />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
                <EventsTeaser />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
                <MembersGlimpse />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
                <JoinCTA />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
                <MerchTeaser />
            </ScrollReveal>
            <Footer />
        </>
    );
}
