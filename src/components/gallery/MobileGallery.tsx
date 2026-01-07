/**
 * MobileGallery - A simple grid-based gallery for mobile devices
 * Replaces the complex DomeGallery on smaller screens
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import membersData from '../../data/members.json';
import './MobileGallery.css';

interface MemberAcademics {
    year?: string;
    branch?: string;
    division?: string;
    yearOfGraduation?: string;
}

interface MemberData {
    id: string;
    firstName: string;
    lastName: string;
    team: string;
    position: string;
    image: string;
    academics?: MemberAcademics;
    socialLinks?: {
        instagram?: string;
        linkedin?: string;
        github?: string;
        twitter?: string;
    };
}

interface MobileGalleryProps {
    searchQuery?: string;
    teamFilter?: string;
    maxItems?: number;
    showExploreMore?: boolean;
}

export default function MobileGallery({
    searchQuery = '',
    teamFilter = '',
    maxItems,
    showExploreMore = false
}: MobileGalleryProps) {
    const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Get base URL for images
    const baseUrl = import.meta.env.BASE_URL || '/';

    // Filter and prepare members
    const members = useMemo(() => {
        let filtered = (membersData.members as MemberData[]).filter(m => m.firstName && m.lastName);

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(m =>
                `${m.firstName} ${m.lastName}`.toLowerCase().includes(query) ||
                m.position?.toLowerCase().includes(query) ||
                m.team?.toLowerCase().includes(query)
            );
        }

        // Apply team filter
        if (teamFilter) {
            filtered = filtered.filter(m => m.team === teamFilter || m.position === teamFilter);
        }

        // Limit items if specified
        if (maxItems) {
            filtered = filtered.slice(0, maxItems);
        }

        return filtered;
    }, [searchQuery, teamFilter, maxItems]);

    // Get image source with base URL
    const getImageSrc = (image: string) => {
        if (!image) return '';
        if (image.startsWith('http')) return image;
        if (image.startsWith('/')) return baseUrl + image.slice(1);
        return `${baseUrl}members/${image}`;
    };

    const handleCardClick = (member: MemberData) => {
        setSelectedMember(member);
        setIsExpanded(false); // Reset expansion state
    };

    const handleClose = () => {
        setSelectedMember(null);
        setIsExpanded(false);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Check if member has extra details to show
    const hasExtraDetails = (member: MemberData) => {
        const hasAcademics = member.academics && (
            member.academics.branch ||
            member.academics.year ||
            member.academics.division ||
            member.academics.yearOfGraduation
        );
        const hasSocials = member.socialLinks && Object.values(member.socialLinks).some(v => v);
        return hasAcademics || hasSocials;
    };

    // Auto-scroll modal into view when opened
    useEffect(() => {
        if (selectedMember && modalRef.current) {
            setTimeout(() => {
                modalRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);

            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedMember]);

    // Check if there are more members than displayed
    const totalMembers = (membersData.members as MemberData[]).filter(m => m.firstName && m.lastName).length;
    const hasMoreMembers = maxItems && totalMembers > maxItems;

    if (members.length === 0) {
        return (
            <div className="mobile-gallery__empty">
                <p>No members found</p>
                <span>Try adjusting your search or filter</span>
            </div>
        );
    }

    return (
        <div className="mobile-gallery">
            <div className="mobile-gallery__grid">
                {members.map((member) => (
                    <div
                        key={member.id}
                        className="mobile-gallery__card"
                        onClick={() => handleCardClick(member)}
                    >
                        <div className="mobile-gallery__image-wrapper">
                            {member.image ? (
                                <img
                                    src={getImageSrc(member.image)}
                                    alt={`${member.firstName} ${member.lastName}`}
                                    className="mobile-gallery__image"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="mobile-gallery__placeholder">
                                    {member.firstName[0]}{member.lastName[0]}
                                </div>
                            )}
                        </div>
                        <div className="mobile-gallery__info">
                            <h3 className="mobile-gallery__name">
                                {member.firstName} {member.lastName}
                            </h3>
                            <p className="mobile-gallery__role">{member.position}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Explore More Button - Link to Members Page */}
            {showExploreMore && hasMoreMembers && (
                <div className="mobile-gallery__explore">
                    <Link to="/members" className="mobile-gallery__explore-btn">
                        <span>Explore All Members</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                    <p className="mobile-gallery__explore-count">
                        Showing {members.length} of {totalMembers} members
                    </p>
                </div>
            )}

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="mobile-gallery__modal-overlay" onClick={handleClose}>
                    <div
                        ref={modalRef}
                        className={`mobile-gallery__modal ${isExpanded ? 'mobile-gallery__modal--expanded' : ''}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <button className="mobile-gallery__modal-close" onClick={handleClose}>×</button>

                        <div className="mobile-gallery__modal-image">
                            {selectedMember.image ? (
                                <img
                                    src={getImageSrc(selectedMember.image)}
                                    alt={`${selectedMember.firstName} ${selectedMember.lastName}`}
                                />
                            ) : (
                                <div className="mobile-gallery__modal-placeholder">
                                    {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                                </div>
                            )}
                        </div>

                        <div className="mobile-gallery__modal-content">
                            {/* Basic Info - Always Visible */}
                            <h2 className="mobile-gallery__modal-name">
                                {selectedMember.firstName} {selectedMember.lastName}
                            </h2>
                            <span className="mobile-gallery__modal-badge">{selectedMember.position}</span>
                            <p className="mobile-gallery__modal-team">{selectedMember.team}</p>

                            {/* Expandable Section */}
                            {hasExtraDetails(selectedMember) && (
                                <>
                                    <div className={`mobile-gallery__modal-extra ${isExpanded ? 'mobile-gallery__modal-extra--visible' : ''}`}>
                                        {/* Academic Info */}
                                        {selectedMember.academics && (
                                            <div className="mobile-gallery__modal-section">
                                                <h4 className="mobile-gallery__modal-label">Academics</h4>
                                                <div className="mobile-gallery__modal-academics">
                                                    {selectedMember.academics.branch && (
                                                        <span className="mobile-gallery__modal-tag">
                                                            {selectedMember.academics.branch}
                                                        </span>
                                                    )}
                                                    {selectedMember.academics.year && (
                                                        <span className="mobile-gallery__modal-tag">
                                                            {selectedMember.academics.year}
                                                        </span>
                                                    )}
                                                    {selectedMember.academics.division && (
                                                        <span className="mobile-gallery__modal-tag">
                                                            Div {selectedMember.academics.division}
                                                        </span>
                                                    )}
                                                    {selectedMember.academics.yearOfGraduation && (
                                                        <span className="mobile-gallery__modal-tag">
                                                            Batch {selectedMember.academics.yearOfGraduation}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Social Links */}
                                        {selectedMember.socialLinks && Object.values(selectedMember.socialLinks).some(v => v) && (
                                            <div className="mobile-gallery__modal-section">
                                                <h4 className="mobile-gallery__modal-label">Connect</h4>
                                                <div className="mobile-gallery__modal-socials">
                                                    {selectedMember.socialLinks.instagram && (
                                                        <a href={selectedMember.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="mobile-gallery__social-btn mobile-gallery__social-btn--instagram">
                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                                            </svg>
                                                            <span>Instagram</span>
                                                        </a>
                                                    )}
                                                    {selectedMember.socialLinks.linkedin && (
                                                        <a href={selectedMember.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="mobile-gallery__social-btn mobile-gallery__social-btn--linkedin">
                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                                            </svg>
                                                            <span>LinkedIn</span>
                                                        </a>
                                                    )}
                                                    {selectedMember.socialLinks.github && (
                                                        <a href={selectedMember.socialLinks.github} target="_blank" rel="noopener noreferrer" className="mobile-gallery__social-btn mobile-gallery__social-btn--github">
                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                            </svg>
                                                            <span>GitHub</span>
                                                        </a>
                                                    )}
                                                    {selectedMember.socialLinks.twitter && (
                                                        <a href={selectedMember.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="mobile-gallery__social-btn mobile-gallery__social-btn--twitter">
                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                            </svg>
                                                            <span>Twitter</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Explore More Button */}
                                    <button
                                        className={`mobile-gallery__modal-expand ${isExpanded ? 'mobile-gallery__modal-expand--active' : ''}`}
                                        onClick={toggleExpand}
                                    >
                                        <span>{isExpanded ? 'Show Less' : 'Explore More'}</span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
