import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import './Dashboard.css';
import Footer from '../components/layout/Footer';
import ProfileOverlay from '../components/profile/ProfileOverlay';
import SettingsOverlay from '../components/settings/SettingsOverlay';
import KeyboardShortcuts from '../components/shortcuts/KeyboardShortcuts';
import PromoManager from '../components/admin/PromoManager';
import EventManager from '../components/admin/EventManager';
import { EventModal, type EventData } from '../components/events';
import { useToast } from '../components/toast/Toast';
import { SkeletonEventList } from '../components/skeleton/Skeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAuth } from '../contexts/AuthContext';
import { useRecruitment } from '../contexts/RecruitmentContext';
import { ADMIN_PERMISSIONS } from '../types/user';
import type { Promotion } from '../types/user';
import { getUserRegistrations, generatePassPdfForRegistration, downloadPass, type RegistrationRecord } from '../services/firebase/eventPass';
import { hasVolunteerAccess } from '../services/scanner/volunteerService';

export default function Dashboard() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { logout, profile, isAdmin, hasPermission } = useAuth();

    // Get user data from profile
    const firstName = profile?.firstName || 'User';
    const lastName = profile?.lastName || '';
    const orbitId = profile?.orbitId || 'ORB-XXX-0000';
    const userAvatar = profile?.avatar;

    // Generate initials for avatar fallback
    const getInitials = () => {
        const firstInitial = firstName.charAt(0).toUpperCase();
        const lastInitial = lastName.charAt(0).toUpperCase();
        return `${firstInitial}${lastInitial}`;
    };
    const [activeView, setActiveView] = useState<'events' | 'merch' | 'members' | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuClosing, setMenuClosing] = useState(false);
    const [promoIndex, setPromoIndex] = useState(0);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEventsLoading, setIsEventsLoading] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    // User registrations
    const [userRegistrations, setUserRegistrations] = useState<RegistrationRecord[]>([]);
    const [downloadingPassId, setDownloadingPassId] = useState<string | null>(null);

    // Event modal state
    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [isEventModalClosing, setIsEventModalClosing] = useState(false);

    // Highlight event image
    const [highlightEventImage, setHighlightEventImage] = useState<string | null>(null);

    // Admin state
    const [showManageDropdown, setShowManageDropdown] = useState(false);
    const [isPromoManagerOpen, setIsPromoManagerOpen] = useState(false);
    const [isEventManagerOpen, setIsEventManagerOpen] = useState(false);
    const manageDropdownRef = useRef<HTMLDivElement>(null);

    // Check admin permissions
    const canManagePromos = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_PROMOS);
    const canManageEvents = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_EVENTS);
    const canManageJoin = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_JOIN);
    const canManageApplications = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_APPLICATIONS);
    const canManageQueries = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_QUERIES);
    const canManageMerchOrders = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_MERCH_ORDERS);
    const canManageMerch = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_MERCH);
    const canScanQr = isAdmin && hasPermission(ADMIN_PERMISSIONS.SCAN_QR);

    // Volunteer scanner access (non-admin users who are assigned as volunteers)
    const [isVolunteer, setIsVolunteer] = useState(false);

    // Recruitment context
    const { isRecruitmentOpen, toggleRecruitment } = useRecruitment();
    const [isTogglingRecruitment, setIsTogglingRecruitment] = useState(false);

    // Auto-scroll sidebar to make dropdown visible when opened
    useEffect(() => {
        if (showManageDropdown && manageDropdownRef.current) {
            // Small delay for smoother visual transition
            const timer = setTimeout(() => {
                // Find the scrollable sidebar container
                const sidebarZone = manageDropdownRef.current?.closest('.sidebar-zone--middle');
                if (sidebarZone) {
                    // Scroll to the bottom to show the dropdown
                    sidebarZone.scrollTo({
                        top: sidebarZone.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showManageDropdown]);

    // Check if user has volunteer access (for non-admins who are assigned as event volunteers)
    useEffect(() => {
        const checkVolunteerAccess = async () => {
            if (profile?.orbitId && !canScanQr) {
                const hasAccess = await hasVolunteerAccess(profile.orbitId);
                setIsVolunteer(hasAccess);
            }
        };
        checkVolunteerAccess();
    }, [profile?.orbitId, canScanQr]);

    // Promotions from Firestore
    const [promos, setPromos] = useState<Promotion[]>([]);

    // Fetch promotions from Firestore
    useEffect(() => {
        // Simple query - filter and sort client-side to avoid composite index requirement
        const q = query(collection(db, 'promotions'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPromos: Promotion[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as Promotion;
                // Only include active promotions
                if (data.isActive) {
                    fetchedPromos.push({ ...data, id: doc.id });
                }
            });
            // Sort by priority
            fetchedPromos.sort((a, b) => (a.priority || 0) - (b.priority || 0));
            setPromos(fetchedPromos);
        }, (error) => {
            console.error('Error fetching promotions:', error);
        });

        return () => unsubscribe();
    }, []);

    // Fetch user registrations for dashboard highlight and My Events
    useEffect(() => {
        if (orbitId && orbitId !== 'ORB-XXX-0000') {
            console.log('Fetching registrations for user:', orbitId);
            setIsEventsLoading(true);
            getUserRegistrations(orbitId)
                .then(registrations => {
                    console.log('Dashboard received registrations:', registrations);
                    setUserRegistrations(registrations);
                })
                .catch(error => {
                    console.error('Error fetching registrations:', error);
                })
                .finally(() => {
                    setIsEventsLoading(false);
                });
        }
    }, [orbitId]);

    useKeyboardShortcuts({
        onEscape: () => {
            if (showShortcuts) setShowShortcuts(false);
            else if (isProfileOpen) setIsProfileOpen(false);
            else if (isSettingsOpen) setIsSettingsOpen(false);
            else if (isPromoManagerOpen) setIsPromoManagerOpen(false);
            else if (isEventManagerOpen) setIsEventManagerOpen(false);
            else if (showManageDropdown) setShowManageDropdown(false);
            else if (menuOpen) setMenuOpen(false);
        },
        onShowHelp: () => setShowShortcuts(true)
    });

    const actions = [
        {
            id: 'action-my-events',
            label: 'My Events',
            action: () => setActiveView(activeView === 'events' ? null : 'events')
        },
        {
            id: 'action-browse-events',
            label: 'Browse Events',
            action: () => navigate('/events')
        },
        {
            id: 'action-explore-merch',
            label: 'Explore Merch',
            action: () => navigate('/merch')
        },
        {
            id: 'action-members',
            label: 'Members',
            action: () => navigate('/members')
        }
    ];

    // Close manage dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showManageDropdown &&
                manageDropdownRef.current &&
                !manageDropdownRef.current.contains(event.target as Node)
            ) {
                setShowManageDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showManageDropdown]);

    const closeMenu = () => {
        setMenuClosing(true);
        setTimeout(() => {
            setMenuOpen(false);
            setMenuClosing(false);
        }, 300);
    };

    const toggleMenu = () => {
        if (menuOpen) {
            closeMenu();
        } else {
            setMenuOpen(true);
        }
    };

    useEffect(() => {
        if (promos.length <= 1) return;
        const interval = setInterval(() => {
            setPromoIndex(prev => (prev + 1) % promos.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [promos.length]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuOpen &&
                dropdownRef.current &&
                menuButtonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !menuButtonRef.current.contains(event.target as Node)
            ) {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleLogout = async () => {
        try {
            await logout();
            showToast('Logged out successfully', 'info');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Failed to logout', 'error');
        }
    };

    const handlePromoClick = (promo: Promotion) => {
        if (promo.linkUrl) {
            window.open(promo.linkUrl, '_blank');
        }
    };

    // Handle download pass from My Events
    const handleDownloadEventPass = async (registration: RegistrationRecord) => {
        if (!registration) return;
        try {
            setDownloadingPassId(registration.registrationId);
            const pdfBlob = await generatePassPdfForRegistration(registration);
            downloadPass(pdfBlob, registration.eventName, orbitId);
            showToast('Pass downloaded!', 'success');
        } catch (error) {
            console.error('Error downloading pass:', error);
            showToast('Failed to download pass', 'error');
        } finally {
            setDownloadingPassId(null);
        }
    };

    // Handle download pass from Modal for Dashboard
    const handleDownloadFromModal = (event: EventData) => {
        const registration = userRegistrations.find(r => r.eventId === event.id);
        if (registration) {
            handleDownloadEventPass(registration);
        } else {
            showToast('Registration details not found', 'error');
        }
    };

    // Format date for display
    const formatEventDate = (dateStr: string): string => {
        if (!dateStr) return '';
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Check if event date is upcoming
    const isEventUpcoming = (dateStr: string): boolean => {
        if (!dateStr) return false;
        const eventDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    };

    // Get the next upcoming registered event for the highlight section
    const nextUpcomingEvent = userRegistrations
        .filter(reg => isEventUpcoming(reg.eventDate))
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0] || null;

    // Fetch the event image for highlight section
    useEffect(() => {
        const fetchHighlightImage = async () => {
            if (nextUpcomingEvent) {
                try {
                    const eventDoc = await getDoc(doc(db, 'events', nextUpcomingEvent.eventId));
                    if (eventDoc.exists()) {
                        const data = eventDoc.data();
                        if (data.images && data.images.length > 0) {
                            setHighlightEventImage(data.images[0]);
                        } else {
                            setHighlightEventImage(null);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching highlight event image:', error);
                    setHighlightEventImage(null);
                }
            } else {
                setHighlightEventImage(null);
            }
        };
        fetchHighlightImage();
    }, [nextUpcomingEvent?.eventId]);

    // Handle clicking on an event card to view details
    const handleEventCardClick = async (registration: RegistrationRecord) => {
        try {
            // Fetch the full event data from Firestore
            const eventDoc = await getDoc(doc(db, 'events', registration.eventId));
            if (eventDoc.exists()) {
                const data = eventDoc.data();
                const eventData: EventData = {
                    id: eventDoc.id,
                    title: data.title || registration.eventName,
                    description: data.description || '',
                    date: data.date || registration.eventDate,
                    time: data.time || '',
                    venue: data.venue || '',
                    type: data.type || 'workshop',
                    isPast: !isEventUpcoming(data.date || registration.eventDate),
                    registrationOpen: data.registrationOpen ?? false,
                    images: data.images || [],
                    amount: data.amount
                };
                setSelectedEvent(eventData);
            } else {
                // If event doc not found, create minimal event data from registration
                setSelectedEvent({
                    id: registration.eventId,
                    title: registration.eventName,
                    description: '',
                    date: registration.eventDate,
                    time: '',
                    venue: '',
                    type: 'workshop',
                    isPast: !isEventUpcoming(registration.eventDate),
                    registrationOpen: false,
                    images: []
                });
            }
        } catch (error) {
            console.error('Error fetching event:', error);
            showToast('Could not load event details', 'error');
        }
    };

    // Close event modal
    const closeEventModal = () => {
        setIsEventModalClosing(true);
        setTimeout(() => {
            setSelectedEvent(null);
            setIsEventModalClosing(false);
        }, 200);
    };

    return (
        <>
            <div className="dashboard-page page-transition">
                <div className="dashboard-sidebar">
                    <div className="dashboard-sidebar-container">
                        <div className="sidebar-zone sidebar-zone--top">
                            <div className="promo-screen">
                                {promos.length > 0 ? (
                                    <>
                                        {promos.map((promo, index) => (
                                            <div
                                                key={promo.id}
                                                className={`promo-screen__item ${index === promoIndex ? 'promo-screen__item--active' : ''}`}
                                                onClick={() => handlePromoClick(promo)}
                                                style={{ cursor: promo.linkUrl ? 'pointer' : 'default' }}
                                            >
                                                {promo.mediaType === 'video' ? (
                                                    <video src={promo.mediaUrl} autoPlay muted loop playsInline />
                                                ) : (
                                                    <img src={promo.mediaUrl} alt={promo.title} />
                                                )}
                                            </div>
                                        ))}
                                        {promos.length > 1 && (
                                            <div className="promo-screen__indicators">
                                                {promos.map((_, index) => (
                                                    <span
                                                        key={index}
                                                        className={`promo-screen__indicator ${index === promoIndex ? 'promo-screen__indicator--active' : ''}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="promo-screen__empty">
                                        <span>No promotions</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sidebar-zone sidebar-zone--middle">
                            <div className="sidebar-actions">
                                {actions.map(action => (
                                    <button
                                        key={action.id}
                                        className={`sidebar-action-btn ${action.id === 'action-my-events' && activeView === 'events' ? 'sidebar-action-btn--active' : ''}`}
                                        onClick={action.action}
                                    >
                                        {action.label}
                                    </button>
                                ))}

                                {/* Volunteer Scan QRs Button */}
                                {isVolunteer && !canScanQr && (
                                    <button
                                        className="sidebar-action-btn sidebar-action-btn--volunteer"
                                        onClick={() => navigate('/scan-qrs')}
                                    >
                                        📷 Scan QRs
                                    </button>
                                )}

                                {
                                    /* Admin Manage Dropdown */
                                    (canManagePromos || canManageEvents || canManageJoin || canManageApplications || canManageQueries || canManageMerchOrders || canManageMerch) && (
                                        <div className="manage-dropdown" ref={manageDropdownRef}>
                                            <button
                                                className={`sidebar-action-btn sidebar-action-btn--manage ${showManageDropdown ? 'sidebar-action-btn--active' : ''}`}
                                                onClick={() => setShowManageDropdown(!showManageDropdown)}
                                            >
                                                <span>Manage</span>
                                                <svg
                                                    className={`manage-dropdown__arrow ${showManageDropdown ? 'manage-dropdown__arrow--open' : ''}`}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </button>

                                            {showManageDropdown && (
                                                <div className="manage-dropdown__menu">
                                                    {canManagePromos && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                setIsPromoManagerOpen(true);
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                                <polyline points="21 15 16 10 5 21"></polyline>
                                                            </svg>
                                                            <span>Promotional Screen</span>
                                                        </button>
                                                    )}
                                                    {canManageEvents && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                setIsEventManagerOpen(true);
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                                            </svg>
                                                            <span>Events</span>
                                                        </button>
                                                    )}
                                                    {canManageJoin && (
                                                        <button
                                                            className={`manage-dropdown__item manage-dropdown__item--toggle ${isRecruitmentOpen ? 'manage-dropdown__item--active' : ''}`}
                                                            onClick={async () => {
                                                                if (isTogglingRecruitment) return;
                                                                setIsTogglingRecruitment(true);
                                                                try {
                                                                    await toggleRecruitment();
                                                                    showToast(
                                                                        isRecruitmentOpen ? 'Recruitment closed' : 'Recruitment opened',
                                                                        'success'
                                                                    );
                                                                } catch {
                                                                    showToast('Failed to toggle recruitment', 'error');
                                                                } finally {
                                                                    setIsTogglingRecruitment(false);
                                                                }
                                                            }}
                                                            disabled={isTogglingRecruitment}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                                            </svg>
                                                            <span>Recruitment</span>
                                                            <span className={`recruitment-status ${isRecruitmentOpen ? 'recruitment-status--open' : 'recruitment-status--closed'}`}>
                                                                {isRecruitmentOpen ? 'Open' : 'Closed'}
                                                            </span>
                                                        </button>
                                                    )}
                                                    {canManageApplications && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                navigate('/manage-user-applications');
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                                <polyline points="10 9 9 9 8 9"></polyline>
                                                            </svg>
                                                            <span>Applications</span>
                                                        </button>
                                                    )}
                                                    {canManageQueries && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                navigate('/manage-user-queries');
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                            </svg>
                                                            <span>Queries</span>
                                                        </button>
                                                    )}
                                                    {canManageMerchOrders && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                navigate('/manage-merch-orders');
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                                                                <path d="M3 6h18"></path>
                                                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                                                            </svg>
                                                            <span>Merch Orders</span>
                                                        </button>
                                                    )}
                                                    {canManageMerch && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                navigate('/manage-merch');
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                                                <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                                            </svg>
                                                            <span>Manage Merch</span>
                                                        </button>
                                                    )}
                                                    {canScanQr && (
                                                        <button
                                                            className="manage-dropdown__item"
                                                            onClick={() => {
                                                                setShowManageDropdown(false);
                                                                navigate('/event-scanner');
                                                            }}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="3" width="7" height="7"></rect>
                                                                <rect x="14" y="3" width="7" height="7"></rect>
                                                                <rect x="3" y="14" width="7" height="7"></rect>
                                                                <rect x="14" y="14" width="7" height="7"></rect>
                                                            </svg>
                                                            <span>Event Scanner</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>
                        </div>

                        <div className="sidebar-zone sidebar-zone--bottom">
                            <div className="member-id-display">
                                <span className="member-id-value">{orbitId}</span>
                            </div>

                            <div className="user-profile-section">
                                {userAvatar ? (
                                    <img
                                        src={userAvatar}
                                        alt={firstName}
                                        className="user-avatar"
                                    />
                                ) : (
                                    <div className="user-avatar user-avatar--initials">
                                        {getInitials()}
                                    </div>
                                )}
                                <div className="user-info">
                                    <span className="user-name">{firstName}</span>
                                </div>
                                <button
                                    ref={menuButtonRef}
                                    className="user-menu-btn"
                                    onClick={toggleMenu}
                                >
                                    ⋮
                                </button>
                                {menuOpen && (
                                    <div ref={dropdownRef} className={`user-dropdown-menu ${menuClosing ? 'closing' : ''}`}>
                                        <button onClick={() => { closeMenu(); setIsProfileOpen(true); }}>Profile</button>
                                        <button onClick={() => { closeMenu(); setIsSettingsOpen(true); }}>Settings</button>
                                        <button onClick={handleLogout}>Logout</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-main-content">
                    {activeView === 'events' && (
                        <div className="content-container">
                            <h2 className="content-title">My Events</h2>
                            {isEventsLoading ? (
                                <>
                                    <h3 className="dashboard-events__section-title">Upcoming</h3>
                                    <SkeletonEventList />
                                </>
                            ) : userRegistrations.length > 0 ? (
                                <>
                                    {/* Upcoming Events */}
                                    {userRegistrations.filter(r => isEventUpcoming(r.eventDate)).length > 0 && (
                                        <div className="dashboard-events__section">
                                            <h3 className="dashboard-events__section-title">Upcoming</h3>
                                            <div className="dashboard-events__list">
                                                {userRegistrations
                                                    .filter(r => isEventUpcoming(r.eventDate))
                                                    .map(registration => (
                                                        <div key={registration.registrationId} className="my-event-card">
                                                            <div
                                                                className="my-event-card__info my-event-card__info--clickable"
                                                                onClick={() => handleEventCardClick(registration)}
                                                            >
                                                                <h4 className="my-event-card__title">{registration.eventName}</h4>
                                                                <p className="my-event-card__date">{formatEventDate(registration.eventDate)}</p>
                                                            </div>
                                                            <button
                                                                className="my-event-card__download"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadEventPass(registration);
                                                                }}
                                                                disabled={downloadingPassId === registration.registrationId}
                                                            >
                                                                {downloadingPassId === registration.registrationId ? (
                                                                    'Downloading...'
                                                                ) : (
                                                                    <>
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                                            <polyline points="7 10 12 15 17 10" />
                                                                            <line x1="12" y1="15" x2="12" y2="3" />
                                                                        </svg>
                                                                        Pass
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Past Events */}
                                    {userRegistrations.filter(r => !isEventUpcoming(r.eventDate)).length > 0 && (
                                        <div className="dashboard-events__section">
                                            <h3 className="dashboard-events__section-title">Past</h3>
                                            <div className="dashboard-events__list">
                                                {userRegistrations
                                                    .filter(r => !isEventUpcoming(r.eventDate))
                                                    .map(registration => (
                                                        <div
                                                            key={registration.registrationId}
                                                            className="my-event-card my-event-card--past my-event-card--clickable"
                                                            onClick={() => handleEventCardClick(registration)}
                                                        >
                                                            <div className="my-event-card__info">
                                                                <h4 className="my-event-card__title">{registration.eventName}</h4>
                                                                <p className="my-event-card__date">{formatEventDate(registration.eventDate)}</p>
                                                                {registration.attendanceStatus && (
                                                                    <span className="my-event-card__attended">✓ Attended</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="dashboard-events__section">
                                        <h3 className="dashboard-events__section-title">Upcoming</h3>
                                        <div className="dashboard-events__empty">
                                            <p>You haven't registered for any events yet.</p>
                                            <button
                                                className="dashboard-events__cta"
                                                onClick={() => navigate('/events')}
                                            >
                                                Browse Events
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeView === 'merch' && (
                        <div className="content-container">
                            <h2 className="content-title">Merchandise</h2>
                            <p className="content-placeholder">Your merch orders and wishlist will appear here.</p>
                            <button className="content-cta" onClick={() => navigate('/merch')}>
                                Browse Merch
                            </button>
                        </div>
                    )}

                    {!activeView && (
                        <div className="dashboard-welcome-section">
                            <h1 className="welcome-heading">
                                <span className="typewriter" style={{ '--char-count': `${getTimeBasedGreeting().length + firstName.length + 5}` } as React.CSSProperties}>
                                    {getTimeBasedGreeting()}, <span>{firstName}</span>...
                                </span>
                            </h1>
                            <p className="welcome-tagline">
                                The cosmos awaits—your next adventure is just a click away.
                            </p>

                            <div className="dashboard-highlight">
                                {nextUpcomingEvent ? (
                                    <div
                                        className="dashboard-highlight__card"
                                        onClick={() => handleEventCardClick(nextUpcomingEvent)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span className="dashboard-highlight__badge">Up Next</span>
                                        <div className="dashboard-highlight__image">
                                            {highlightEventImage ? (
                                                <img src={highlightEventImage} alt={nextUpcomingEvent.eventName} />
                                            ) : (
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    background: 'linear-gradient(135deg, rgba(169, 78, 255, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="dashboard-highlight__content">
                                            <h3 className="dashboard-highlight__title">{nextUpcomingEvent.eventName}</h3>
                                            <div className="dashboard-highlight__meta">
                                                <span>📅 {formatEventDate(nextUpcomingEvent.eventDate)}</span>
                                            </div>
                                            <span className="dashboard-highlight__status dashboard-event__status--registered">
                                                ✓ Registered
                                            </span>
                                            <button
                                                className="dashboard-highlight__btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEventCardClick(nextUpcomingEvent);
                                                }}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="dashboard-highlight__empty">
                                        <p>You haven't registered for any upcoming events yet.</p>
                                        <button className="dashboard-highlight__btn" onClick={() => navigate('/events')}>
                                            Explore Events
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div >
            <Footer />
            <ProfileOverlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
            <SettingsOverlay
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
            <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

            {/* Admin PromoManager Overlay */}
            {canManagePromos && (
                <PromoManager
                    isOpen={isPromoManagerOpen}
                    onClose={() => setIsPromoManagerOpen(false)}
                    adminOrbitId={orbitId}
                />
            )}

            {/* Admin EventManager Overlay */}
            {canManageEvents && (
                <EventManager
                    isOpen={isEventManagerOpen}
                    onClose={() => setIsEventManagerOpen(false)}
                    adminOrbitId={orbitId}
                />
            )}

            {/* Event Details Modal */}
            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    isClosing={isEventModalClosing}
                    onClose={closeEventModal}
                    isRegistered={true}
                    onDownloadPass={handleDownloadFromModal}
                />
            )}
        </>
    );
}
