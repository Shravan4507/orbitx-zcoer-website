import { useState, useEffect } from 'react';
import './Members.css';
import ResponsiveGallery from '../components/gallery/ResponsiveGallery';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/scroll/ScrollReveal';
import { SearchInput, FilterDropdown, Toolbar } from '../components/ui';

const TEAM_OPTIONS = [
    { value: 'All Teams', label: 'All Teams' },
    { value: 'President', label: 'President' },
    { value: 'Chairman', label: 'Chairman' },
    { value: 'Secretary', label: 'Secretary' },
    { value: 'Treasurer', label: 'Treasurer' },
    { value: 'Co-Treasurer', label: 'Co-Treasurer' },
    { value: 'Technical Team', label: 'Technical Team' },
    { value: 'Public Outreach Team', label: 'Public Outreach Team' },
    { value: 'Documentation Team', label: 'Documentation Team' },
    { value: 'Social Media & Editing Team', label: 'Social Media & Editing' },
    { value: 'Design & Innovation Team', label: 'Design & Innovation' },
    { value: 'Management & Operations Team', label: 'Management & Operations' }
];

export default function Members() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('All Teams');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery.trim().toLowerCase());
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <>
            <main className="members-page">
                <ScrollReveal direction="fade">
                    <section className="members-hero">
                        <h1 className="members-hero__title">Our Members</h1>
                        <p className="members-hero__subtitle">Meet the passionate individuals who make OrbitX thrive.</p>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1} className="scroll-reveal--z-high">
                    <Toolbar>
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search members..."
                        />
                        <FilterDropdown
                            options={TEAM_OPTIONS}
                            value={selectedTeam}
                            onChange={setSelectedTeam}
                        />
                    </Toolbar>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.2}>
                    <section className="members-gallery">
                        <ResponsiveGallery
                            autoRotate={true}
                            autoRotateSpeed={0.05}
                            grayscale={false}
                            maxVerticalRotationDeg={0}
                            searchQuery={debouncedQuery}
                            teamFilter={selectedTeam === 'All Teams' ? '' : selectedTeam}
                        />
                    </section>
                </ScrollReveal>
            </main>
            <Footer />
        </>
    );
}
