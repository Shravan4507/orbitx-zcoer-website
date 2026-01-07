import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase/config';
import { EventCard, EventModal, RegistrationModal, type EventData, type RegistrationData } from '../components/events';
import { generateEventPass, downloadPass, checkExistingRegistration, generatePassPdfForRegistration, getUserRegistrations, type RegistrationRecord } from '../services/firebase/eventPass';
import { useToast } from '../components/toast/Toast';
import { SearchInput, FilterDropdown, Toolbar } from '../components/ui';
import './Events.css';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/scroll/ScrollReveal';

interface UserProfile {
    orbitId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    collegeName: string;
    gender: string;
}

export default function Events() {
    const { showToast } = useToast();
    const [events, setEvents] = useState<EventData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [isModalClosing, setIsModalClosing] = useState(false);
    const [showPastEvents, setShowPastEvents] = useState(false);

    // Registration modal state
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [registrationEvent, setRegistrationEvent] = useState<EventData | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isGeneratingPass, setIsGeneratingPass] = useState(false);

    // Track user's registered events
    const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
    const [userRegistrations, setUserRegistrations] = useState<Map<string, RegistrationRecord>>(new Map());

    // Success modal state (for download prompt)
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedRegistration, setCompletedRegistration] = useState<{
        registration: RegistrationRecord;
        eventVenue?: string;
        eventName: string;
    } | null>(null);

    // Fetch user profile
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Try users collection first
                let userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    // Try admins collection
                    userDoc = await getDoc(doc(db, 'admins', user.uid));
                }

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserProfile({
                        orbitId: data.orbitId || '',
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                        mobile: data.mobile || '',
                        collegeName: data.collegeName || '',
                        gender: data.gender || ''
                    });
                }
            } else {
                setUserProfile(null);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Fetch user's registered events
    useEffect(() => {
        const fetchUserRegistrations = async () => {
            if (userProfile?.orbitId) {
                const registrations = await getUserRegistrations(userProfile.orbitId);
                const eventIdSet = new Set(registrations.map(r => r.eventId));
                const regMap = new Map<string, RegistrationRecord>();
                registrations.forEach(r => regMap.set(r.eventId, r));
                setRegisteredEventIds(eventIdSet);
                setUserRegistrations(regMap);
            } else {
                setRegisteredEventIds(new Set());
                setUserRegistrations(new Map());
            }
        };
        fetchUserRegistrations();
    }, [userProfile]);

    // Fetch events from Firestore
    useEffect(() => {
        const q = query(collection(db, 'events'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents: EventData[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedEvents.push({
                    id: doc.id,
                    type: data.type || 'Event',
                    title: data.title || '',
                    description: data.description || '',
                    date: data.date || '',
                    venue: data.venue || '',
                    venueUrl: data.venueUrl,
                    time: data.time || '',
                    registrationOpen: data.registrationOpen ?? false,
                    isPast: data.isPast ?? false,
                    mode: data.mode,
                    registrationDeadline: data.registrationDeadline,
                    eligibility: data.eligibility,
                    speakers: data.speakers,
                    images: data.images || [],
                    amount: data.amount,
                });
            });
            setEvents(fetchedEvents);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching events:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredUpcoming = events.filter(event => {
        if (event.isPast) return false;
        if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedType && event.type !== selectedType) return false;
        return true;
    });

    const filteredPast = events.filter(event => {
        if (!event.isPast) return false;
        if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedType && event.type !== selectedType) return false;
        return true;
    });

    const openModal = (event: EventData) => {
        setSelectedEvent(event);
        setIsModalClosing(false);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setIsModalClosing(true);
        setTimeout(() => {
            setSelectedEvent(null);
            setIsModalClosing(false);
            document.body.style.overflow = '';
        }, 200);
    };

    // Handle registration click
    const handleRegisterClick = async (event: EventData) => {
        if (!userProfile) {
            showToast('Please log in to register for events', 'error');
            return;
        }

        // Check if already registered
        const existing = await checkExistingRegistration(event.id, userProfile.orbitId);
        if (existing) {
            showToast('You are already registered for this event', 'info');
            return;
        }

        setRegistrationEvent(event);
        setShowRegistrationModal(true);
    };

    // Handle registration completion
    const handleRegistrationComplete = async (registrationData: RegistrationData) => {
        if (!userProfile || !registrationEvent) return;

        setIsGeneratingPass(true);
        setShowRegistrationModal(false);

        try {
            // Register for event (no PDF generation yet)
            const { registration } = await generateEventPass({
                orbitId: userProfile.orbitId,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                email: userProfile.email,
                collegeName: userProfile.collegeName,
                gender: userProfile.gender,
                govIdLast4: registrationData.govIdLast4,
                govIdType: registrationData.govIdType,
                eventId: registrationEvent.id,
                eventName: registrationEvent.title,
                eventDate: registrationEvent.date,
                eventVenue: registrationEvent.venue
            });

            // Store for potential download
            setCompletedRegistration({
                registration,
                eventVenue: registrationEvent.venue,
                eventName: registrationEvent.title
            });

            // Update local state for immediate UI feedback
            setRegisteredEventIds(prev => new Set([...prev, registrationEvent.id]));
            setUserRegistrations(prev => {
                const next = new Map(prev);
                next.set(registrationEvent.id, registration);
                return next;
            });

            // Show success modal with download option
            setShowSuccessModal(true);
            showToast('Registration Successful!', 'success');

        } catch (error) {
            console.error('Error registering:', error);
            showToast('Registration failed. Please try again.', 'error');
        } finally {
            setIsGeneratingPass(false);
            setRegistrationEvent(null);
        }
    };

    // Handle download pass from success modal
    const handleDownloadPass = async () => {
        if (!completedRegistration || !userProfile) return;

        try {
            setIsGeneratingPass(true);
            const pdfBlob = await generatePassPdfForRegistration(
                completedRegistration.registration,
                completedRegistration.eventVenue
            );
            downloadPass(pdfBlob, completedRegistration.eventName, userProfile.orbitId);
            showToast('Pass downloaded!', 'success');
        } catch (error) {
            console.error('Error downloading pass:', error);
            showToast('Download failed. Try from Dashboard.', 'error');
        } finally {
            setIsGeneratingPass(false);
            setShowSuccessModal(false);
            setCompletedRegistration(null);
        }
    };

    // Close success modal without download
    const handleSkipDownload = () => {
        setShowSuccessModal(false);
        setCompletedRegistration(null);
        showToast('Collect your pass from My Events in Dashboard', 'info');
    };

    // Handle download pass for a registered event (from cards/modal)
    const handleDownloadEventPass = async (event: EventData) => {
        if (!userProfile) return;

        const registration = userRegistrations.get(event.id);
        if (!registration) {
            showToast('Registration not found', 'error');
            return;
        }

        try {
            setIsGeneratingPass(true);
            const pdfBlob = await generatePassPdfForRegistration(registration, event.venue);
            downloadPass(pdfBlob, event.title, userProfile.orbitId);
            showToast('Pass downloaded!', 'success');
        } catch (error) {
            console.error('Error downloading pass:', error);
            showToast('Download failed. Try from Dashboard.', 'error');
        } finally {
            setIsGeneratingPass(false);
        }
    };

    return (
        <>
            <main className="events-page">
                <ScrollReveal direction="fade">
                    <section className="events-hero">
                        <h1 className="events-hero__title">Events & Activities</h1>
                        <p className="events-hero__subtitle">Workshops, talks, competitions, and stargazing sessions to fuel your curiosity.</p>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1} className="scroll-reveal--z-high">
                    <Toolbar>
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search events..."
                        />
                        <FilterDropdown
                            options={[
                                { value: '', label: 'All Types' },
                                { value: 'Workshop', label: 'Workshop' },
                                { value: 'Talk', label: 'Talk' },
                                { value: 'Competition', label: 'Competition' },
                                { value: 'Outreach', label: 'Outreach' }
                            ]}
                            value={selectedType}
                            onChange={setSelectedType}
                        />
                    </Toolbar>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.15}>
                    <section className="events-section">
                        <h2 className="events-section__heading">Upcoming Events</h2>
                        {isLoading ? (
                            <p className="events-empty">Loading events...</p>
                        ) : filteredUpcoming.length > 0 ? (
                            <div className="events-grid">
                                {filteredUpcoming.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        onClick={openModal}
                                        variant="full"
                                        onRegisterClick={handleRegisterClick}
                                        isRegistered={registeredEventIds.has(event.id)}
                                        onDownloadPass={handleDownloadEventPass}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="events-empty">No upcoming events match your search.</p>
                        )}
                    </section>
                </ScrollReveal>

                <section className="events-section events-section--past">
                    <button
                        className="events-toggle"
                        onClick={() => setShowPastEvents(!showPastEvents)}
                    >
                        {showPastEvents ? 'Hide Past Events' : 'View Past Events'}
                        <span className={`events-toggle__arrow ${showPastEvents ? 'events-toggle__arrow--up' : ''}`}>↓</span>
                    </button>
                    {showPastEvents && (
                        <div className="events-grid events-grid--past">
                            {filteredPast.length > 0 ? (
                                filteredPast.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        onClick={openModal}
                                        variant="full"
                                        isRegistered={registeredEventIds.has(event.id)}
                                        onDownloadPass={handleDownloadEventPass}
                                    />
                                ))
                            ) : (
                                <p className="events-empty">No past events match your search.</p>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    isClosing={isModalClosing}
                    onClose={closeModal}
                    onRegisterClick={handleRegisterClick}
                    isRegistered={registeredEventIds.has(selectedEvent.id)}
                    onDownloadPass={handleDownloadEventPass}
                />
            )}

            {registrationEvent && (
                <RegistrationModal
                    event={registrationEvent}
                    isOpen={showRegistrationModal}
                    onClose={() => {
                        setShowRegistrationModal(false);
                        setRegistrationEvent(null);
                    }}
                    userProfile={userProfile}
                    onRegisterComplete={handleRegistrationComplete}
                />
            )}

            {/* Pass Generation Loading Overlay */}
            {isGeneratingPass && (
                <div className="pass-generating-overlay">
                    <div className="pass-generating-content">
                        <div className="pass-generating-spinner"></div>
                        <p>Generating your pass...</p>
                    </div>
                </div>
            )}

            {/* Registration Success Modal */}
            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        <div className="success-modal__icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                                <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h3 className="success-modal__title">Registration Successful!</h3>
                        <p className="success-modal__text">
                            Would you like to download your event pass now?
                        </p>
                        <div className="success-modal__actions">
                            <button
                                className="success-modal__btn success-modal__btn--primary"
                                onClick={handleDownloadPass}
                            >
                                Download Pass
                            </button>
                            <button
                                className="success-modal__btn success-modal__btn--secondary"
                                onClick={handleSkipDownload}
                            >
                                Get it later from Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}

