import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../services/firebase/config';
import { useNavigate } from 'react-router-dom';
import { EventCard, EventModal, type EventData } from '../../../components/events';
import { getUserRegistrations } from '../../../services/firebase/eventPass';
import './EventsTeaser.css';

export default function EventsTeaser() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<EventData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());

    // Fetch user orbitId and registrations
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Try to get orbitId from users collection
                let userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    userDoc = await getDoc(doc(db, 'admins', user.uid));
                }

                if (userDoc.exists()) {
                    const id = userDoc.data()?.orbitId;
                    if (id) {
                        const regs = await getUserRegistrations(id);
                        setRegisteredEventIds(new Set(regs.map(r => r.eventId)));
                    }
                }
            } else {
                setRegisteredEventIds(new Set());
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch events from Firestore - prioritize upcoming, fill with past
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Fetch all events, ordered by date
                const q = query(
                    collection(db, 'events'),
                    orderBy('date', 'desc')
                );

                const snapshot = await getDocs(q);
                const allEvents: EventData[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    allEvents.push({
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
                        images: data.images || [],
                        amount: data.amount,
                    });
                });

                // Separate upcoming and past events
                const upcomingEvents = allEvents.filter(e => !e.isPast);
                const pastEvents = allEvents.filter(e => e.isPast);

                // Sort upcoming by date ascending (soonest first)
                upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));

                // Sort past by date descending (most recent first)
                pastEvents.sort((a, b) => b.date.localeCompare(a.date));

                // Combine: prioritize upcoming, fill with past to get 3 total
                const displayEvents: EventData[] = [];

                // Add upcoming events first
                for (const event of upcomingEvents) {
                    if (displayEvents.length >= 3) break;
                    displayEvents.push(event);
                }

                // Fill remaining slots with past events
                for (const event of pastEvents) {
                    if (displayEvents.length >= 3) break;
                    displayEvents.push(event);
                }

                setEvents(displayEvents);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const handleCardClick = (event: EventData) => {
        setSelectedEvent(event);
        setIsClosing(false);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setSelectedEvent(null);
            setIsClosing(false);
        }, 300);
    };

    const handleViewAll = () => {
        navigate('/events');
    };

    if (isLoading) {
        return (
            <section className="events-teaser">
                <div className="events-teaser__header">
                    <h2 className="events-teaser__heading">Events & Activities</h2>
                    <p className="events-teaser__subtext">
                        Participate in workshops, stargazing sessions, and hands-on experiments that bring space science to life.
                    </p>
                </div>
                <div className="events-teaser__loading">Loading events...</div>
            </section>
        );
    }

    if (events.length === 0) {
        return (
            <section className="events-teaser">
                <div className="events-teaser__header">
                    <h2 className="events-teaser__heading">Events & Activities</h2>
                    <p className="events-teaser__subtext">
                        Participate in workshops, stargazing sessions, and hands-on experiments that bring space science to life.
                    </p>
                </div>
                <div className="events-teaser__empty">
                    <p>No events at the moment.</p>
                    <span>Check back soon for exciting activities!</span>
                </div>
            </section>
        );
    }

    return (
        <section className="events-teaser">
            <div className="events-teaser__header">
                <h2 className="events-teaser__heading">Events & Activities</h2>
                <p className="events-teaser__subtext">
                    Participate in workshops, stargazing sessions, and hands-on experiments that bring space science to life.
                </p>
            </div>
            <div className="events-teaser__grid">
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        onClick={handleCardClick}
                        variant="teaser"
                        isRegistered={registeredEventIds.has(event.id)}
                    />
                ))}
            </div>
            <button onClick={handleViewAll} className="events-teaser__cta">View All Events →</button>

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    isClosing={isClosing}
                    onClose={handleClose}
                    isRegistered={registeredEventIds.has(selectedEvent.id)}
                    onDownloadPass={() => navigate('/events')}
                    onRegisterClick={() => navigate('/events')}
                />
            )}
        </section>
    );
}
