import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useToast } from '../toast/Toast';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';
import CustomSelect from '../ui/CustomSelect';
import './EventManager.css';

export type EventType = 'Workshop' | 'Talk' | 'Competition' | 'Outreach';
export type EventMode = 'Online' | 'Offline';

export interface AdminEvent {
    id: string;
    eventId?: string; // Auto-generated event ID (EVT-YYYY-XXXX) - immutable once created
    title: string;
    description: string;
    date: string;
    time: string;
    type: EventType;
    mode: EventMode;
    venue: string;
    venueUrl?: string; // URL to the venue location (e.g., Google Maps link)
    registrationDeadline: string;
    eligibility: string;
    speakers: string[];
    images: string[];
    imagePositions?: { [key: string]: { x: number; y: number } };
    registrationOpen: boolean;
    isPast: boolean;
    amount?: number; // Event fee in rupees (0 or undefined = free)
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

interface EventManagerProps {
    isOpen: boolean;
    onClose: () => void;
    adminOrbitId: string;
}

const EVENT_TYPES = [
    { value: 'Workshop', label: 'Workshop' },
    { value: 'Talk', label: 'Talk' },
    { value: 'Competition', label: 'Competition' },
    { value: 'Outreach', label: 'Outreach' }
];

const EVENT_MODES = [
    { value: 'Online', label: 'Online' },
    { value: 'Offline', label: 'Offline' }
];

const ELIGIBILITY_OPTIONS = [
    { value: 'Open to all', label: 'Open to all' },
    { value: 'Open to all students', label: 'Open to all students' },
    { value: 'Open to all engineering students', label: 'Open to all engineering students' },
    { value: 'First year students only', label: 'First year students only' },
    { value: 'Second year students only', label: 'Second year students only' },
    { value: 'Third year students only', label: 'Third year students only' },
    { value: 'Final year students only', label: 'Final year students only' },
    { value: 'Teams of 2-3 members', label: 'Teams of 2-3 members' },
    { value: 'Teams of 3-5 members', label: 'Teams of 3-5 members' },
    { value: 'OrbitX members only', label: 'OrbitX members only' },
    { value: 'Faculty and students', label: 'Faculty and students' }
];

// Helper to check if a date has passed
const isDatePassed = (dateString: string): boolean => {
    if (!dateString) return false;
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
};

// Format 24h time to 12h display
const formatTime12h = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};

/**
 * Generates a unique Event ID
 * Format: EVT-YYYY-XXXX where YYYY is the year, XXXX is auto-increment number
 */
const generateEventId = async (): Promise<string> => {
    try {
        const currentYear = new Date().getFullYear();
        const registryRef = doc(db, 'system', 'eventIdRegistry');
        const registryDoc = await getDoc(registryRef);

        let currentCounter = 0;

        if (registryDoc.exists()) {
            const data = registryDoc.data();
            // Reset counter if year changed
            if (data.year === currentYear) {
                currentCounter = data.counter || 0;
            }
        }

        // Increment counter
        const newCounter = currentCounter + 1;

        // Update registry
        await setDoc(registryRef, {
            year: currentYear,
            counter: newCounter,
            lastUpdated: new Date().toISOString()
        });

        // Format: EVT-2025-0001
        return `EVT-${currentYear}-${String(newCounter).padStart(4, '0')}`;
    } catch (error) {
        // If registry fails (e.g., permissions), generate a timestamp-based ID as fallback
        console.error('Error generating eventId from registry, using fallback:', error);
        const currentYear = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        return `EVT-${currentYear}-${timestamp}`;
    }
};

export default function EventManager({ isOpen, onClose, adminOrbitId }: EventManagerProps) {
    const { showToast } = useToast();
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'images'>('details');
    const [isSaving, setIsSaving] = useState(false);
    const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Create form state
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'Workshop' as EventType,
        mode: 'Offline' as EventMode,
        venue: '',
        venueUrl: '', // URL to the venue location
        registrationDeadline: '',
        eligibility: 'Open to all',
        speakers: '',
        amount: '', // Event fee in rupees (empty = free)
    });


    // Multiple images state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);

    // Image position for thumbnail (draggable)
    const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const previewImageRef = useRef<HTMLDivElement>(null);

    // Fetch events and auto-update based on dates
    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'events'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const fetchedEvents: AdminEvent[] = [];
            const updates: Promise<void>[] = [];

            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data() as Omit<AdminEvent, 'id'>;
                const event = { ...data, id: docSnapshot.id };

                // Auto-mark as past if date has passed
                if (!event.isPast && isDatePassed(event.date)) {
                    updates.push(
                        updateDoc(doc(db, 'events', docSnapshot.id), {
                            isPast: true,
                            registrationOpen: false,
                            updatedAt: new Date().toISOString()
                        })
                    );
                    event.isPast = true;
                    event.registrationOpen = false;
                }

                // Auto-close registration if deadline passed
                if (event.registrationOpen && event.registrationDeadline && isDatePassed(event.registrationDeadline)) {
                    updates.push(
                        updateDoc(doc(db, 'events', docSnapshot.id), {
                            registrationOpen: false,
                            updatedAt: new Date().toISOString()
                        })
                    );
                    event.registrationOpen = false;
                }

                fetchedEvents.push(event as AdminEvent);
            });

            // Execute all updates
            if (updates.length > 0) {
                await Promise.all(updates);
            }

            setEvents(fetchedEvents);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching events:', error);
            showToast('Failed to load events', 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, showToast]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setShowCreateForm(false);
            setEditingEvent(null);
            setActiveTab('details');
            resetForm();
            onClose();
        }, 300);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const resetForm = () => {
        setNewEvent({
            title: '',
            description: '',
            date: '',
            startTime: '',
            endTime: '',
            type: 'Workshop',
            mode: 'Offline',
            venue: '',
            venueUrl: '',
            registrationDeadline: '',
            eligibility: 'Open to all',
            speakers: '',
            amount: '',
        });
        // Clean up preview URLs
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setSelectedFiles([]);
        setPreviewUrls([]);
        setActiveTab('details');
        setImagePosition({ x: 50, y: 50 });
        setEditingEvent(null);
    };

    // Parse time string like "10:00 AM - 2:00 PM" to get start and end times in 24h format
    const parseTimeString = (timeStr: string): { start: string; end: string } => {
        if (!timeStr) return { start: '', end: '' };

        const parse12hTo24h = (time12: string): string => {
            const match = time12.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return '';
            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const period = match[3].toUpperCase();

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            return `${String(hours).padStart(2, '0')}:${minutes}`;
        };

        const parts = timeStr.split(' - ');
        return {
            start: parse12hTo24h(parts[0] || ''),
            end: parts[1] ? parse12hTo24h(parts[1]) : ''
        };
    };

    // Handle editing an event
    const handleEditEvent = (event: AdminEvent) => {
        const times = parseTimeString(event.time);

        setNewEvent({
            title: event.title,
            description: event.description,
            date: event.date,
            startTime: times.start,
            endTime: times.end,
            type: event.type,
            mode: event.mode,
            venue: event.venue,
            venueUrl: event.venueUrl || '',
            registrationDeadline: event.registrationDeadline,
            eligibility: event.eligibility,
            speakers: event.speakers.join(', '),
            amount: event.amount ? String(event.amount) : '',
        });

        // Set image position if available
        if (event.imagePositions && event.imagePositions['0']) {
            setImagePosition(event.imagePositions['0']);
        }

        setEditingEvent(event);
        setShowCreateForm(true);
        setActiveTab('details');
    };

    // Image handling - Multiple files
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            addFiles(files);
        } else {
            showToast('Please select image files', 'error');
        }
    };

    const addFiles = (files: File[]) => {
        const newFiles = [...selectedFiles, ...files];
        const newUrls = files.map(f => URL.createObjectURL(f));
        setSelectedFiles(newFiles);
        setPreviewUrls([...previewUrls, ...newUrls]);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            addFiles(files);
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previewUrls[index]);
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    // Draggable image position
    const handleImageMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleImageMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !previewImageRef.current) return;

        const rect = previewImageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setImagePosition({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        });
    };

    const handleImageMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            const handleGlobalMouseUp = () => setIsDragging(false);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
        }
    }, [isDragging]);

    const handleSaveEvent = async () => {
        if (!newEvent.title.trim()) {
            showToast('Please enter a title', 'error');
            setActiveTab('details');
            return;
        }
        if (!newEvent.date) {
            showToast('Please select a date', 'error');
            setActiveTab('details');
            return;
        }

        setIsSaving(true);

        try {
            // Format time
            let timeString = '';
            if (newEvent.startTime) {
                timeString = formatTime12h(newEvent.startTime);
                if (newEvent.endTime) {
                    timeString += ` - ${formatTime12h(newEvent.endTime)}`;
                }
            }

            if (editingEvent) {
                // Update existing event
                const amountValue = newEvent.amount ? parseInt(newEvent.amount, 10) : undefined;
                await updateDoc(doc(db, 'events', editingEvent.id), {
                    title: newEvent.title.trim(),
                    description: newEvent.description.trim(),
                    date: newEvent.date,
                    time: timeString,
                    type: newEvent.type,
                    mode: newEvent.mode,
                    venue: newEvent.venue.trim(),
                    venueUrl: newEvent.venueUrl.trim() || null,
                    registrationDeadline: newEvent.registrationDeadline,
                    eligibility: newEvent.eligibility,
                    speakers: newEvent.speakers.split(',').map(s => s.trim()).filter(Boolean),
                    imagePositions: previewUrls.length > 0 || editingEvent.images.length > 0 ? { '0': imagePosition } : undefined,
                    amount: amountValue && amountValue > 0 ? amountValue : null,
                    updatedAt: new Date().toISOString(),
                });

                showToast('Event updated successfully!', 'success');
            } else {
                // Create new event
                const amountValue = newEvent.amount ? parseInt(newEvent.amount, 10) : undefined;

                // Generate unique Event ID (EVT-YYYY-XXXX)
                const eventId = await generateEventId();

                const eventData: Omit<AdminEvent, 'id'> = {
                    eventId, // Immutable once created
                    title: newEvent.title.trim(),
                    description: newEvent.description.trim(),
                    date: newEvent.date,
                    time: timeString,
                    type: newEvent.type,
                    mode: newEvent.mode,
                    venue: newEvent.venue.trim(),
                    registrationDeadline: newEvent.registrationDeadline,
                    eligibility: newEvent.eligibility,
                    speakers: newEvent.speakers.split(',').map(s => s.trim()).filter(Boolean),
                    images: selectedFiles.map(f => f.name),
                    registrationOpen: true,
                    isPast: false,
                    createdBy: adminOrbitId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    // Only include optional fields if they have values
                    ...(newEvent.venueUrl.trim() && { venueUrl: newEvent.venueUrl.trim() }),
                    ...(previewUrls.length > 0 && { imagePositions: { '0': imagePosition } }),
                    ...(amountValue && amountValue > 0 && { amount: amountValue }),
                };

                await addDoc(collection(db, 'events'), eventData);
                showToast('Event created successfully!', 'success');
            }

            setShowCreateForm(false);
            resetForm();
        } catch (error: any) {
            console.error('Error saving event:', error);
            const errorMessage = error?.message || error?.code || 'Unknown error';
            showToast(`Failed to ${editingEvent ? 'update' : 'create'} event: ${errorMessage}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleRegistration = async (event: AdminEvent) => {
        if (event.isPast && !event.registrationOpen) {
            showToast('Cannot open registration for past events', 'error');
            return;
        }
        if (!event.registrationOpen && event.registrationDeadline && isDatePassed(event.registrationDeadline)) {
            showToast('Registration deadline has passed', 'error');
            return;
        }

        try {
            await updateDoc(doc(db, 'events', event.id), {
                registrationOpen: !event.registrationOpen,
                updatedAt: new Date().toISOString()
            });
            showToast(`Registration ${event.registrationOpen ? 'closed' : 'opened'}`, 'success');
        } catch (error) {
            console.error('Error updating event:', error);
            showToast('Failed to update event', 'error');
        }
    };

    const handleTogglePast = async (event: AdminEvent) => {
        try {
            await updateDoc(doc(db, 'events', event.id), {
                isPast: !event.isPast,
                registrationOpen: false,
                updatedAt: new Date().toISOString()
            });
            showToast(`Event marked as ${event.isPast ? 'upcoming' : 'past'}`, 'success');
        } catch (error) {
            console.error('Error updating event:', error);
            showToast('Failed to update event', 'error');
        }
    };

    const handleDeleteEvent = async (event: AdminEvent) => {
        if (!confirm(`Are you sure you want to delete "${event.title}"?`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'events', event.id));
            showToast('Event deleted', 'success');
        } catch (error) {
            console.error('Error deleting event:', error);
            showToast('Failed to delete event', 'error');
        }
    };

    const getTypeBadgeClass = (type: EventType) => {
        switch (type) {
            case 'Workshop': return 'event-manager__badge--workshop';
            case 'Talk': return 'event-manager__badge--talk';
            case 'Competition': return 'event-manager__badge--competition';
            case 'Outreach': return 'event-manager__badge--outreach';
            default: return '';
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`event-manager ${isClosing ? 'event-manager--closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className="event-manager__modal">
                <div className="event-manager__header">
                    <h2 className="event-manager__title">Event Manager</h2>
                    <button className="event-manager__close" onClick={handleClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="event-manager__content">
                    {!showCreateForm ? (
                        <>
                            <div className="event-manager__toolbar">
                                <button
                                    className="event-manager__create-btn"
                                    onClick={() => setShowCreateForm(true)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Create Event
                                </button>
                            </div>

                            <div className="event-manager__list">
                                {isLoading ? (
                                    <div className="event-manager__loading">Loading events...</div>
                                ) : events.length === 0 ? (
                                    <div className="event-manager__empty">
                                        <p>No events yet</p>
                                        <span>Click "Create Event" to add your first event</span>
                                    </div>
                                ) : (
                                    events.map((event) => (
                                        <div key={event.id} className={`event-manager__item ${event.isPast ? 'event-manager__item--past' : ''}`}>
                                            <div className="event-manager__item-preview">
                                                <div className="event-manager__item-placeholder">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="event-manager__item-info">
                                                <div className="event-manager__item-header">
                                                    <h4 className="event-manager__item-title">{event.title}</h4>
                                                    <span className={`event-manager__badge ${getTypeBadgeClass(event.type)}`}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                                <div className="event-manager__item-meta">
                                                    <span>{event.date}</span>
                                                    <span>•</span>
                                                    <span>{event.mode}</span>
                                                    <span>•</span>
                                                    <span className={event.registrationOpen ? 'event-manager__status--open' : 'event-manager__status--closed'}>
                                                        {event.registrationOpen ? 'Open' : 'Closed'}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="event-manager__item-price">
                                                        {event.amount && event.amount > 0 ? `₹${event.amount}` : 'Free'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="event-manager__item-actions">
                                                <button
                                                    className="event-manager__item-btn event-manager__item-btn--edit"
                                                    onClick={() => handleEditEvent(event)}
                                                    title="Edit Event"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    className="event-manager__item-btn"
                                                    onClick={() => handleToggleRegistration(event)}
                                                    title={event.registrationOpen ? 'Close Registration' : 'Open Registration'}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        {event.registrationOpen ? (
                                                            <path d="M18 6L6 18M6 6l12 12" />
                                                        ) : (
                                                            <path d="M20 6L9 17l-5-5" />
                                                        )}
                                                    </svg>
                                                </button>
                                                <button
                                                    className="event-manager__item-btn"
                                                    onClick={() => handleTogglePast(event)}
                                                    title={event.isPast ? 'Mark as Upcoming' : 'Mark as Past'}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                                </button>
                                                <button
                                                    className="event-manager__item-btn event-manager__item-btn--delete"
                                                    onClick={() => handleDeleteEvent(event)}
                                                    title="Delete"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="event-manager__create-form">
                            <div className="event-manager__form-header">
                                <button
                                    className="event-manager__back-btn"
                                    onClick={() => { setShowCreateForm(false); resetForm(); }}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                    {editingEvent ? 'Cancel' : 'Back'}
                                </button>

                                <div className="event-manager__tabs">
                                    <button
                                        className={`event-manager__tab ${activeTab === 'details' ? 'event-manager__tab--active' : ''}`}
                                        onClick={() => setActiveTab('details')}
                                    >
                                        Details
                                    </button>
                                    <button
                                        className={`event-manager__tab ${activeTab === 'images' ? 'event-manager__tab--active' : ''}`}
                                        onClick={() => setActiveTab('images')}
                                    >
                                        Images
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'details' && (
                                <>
                                    <div className="event-manager__form-grid">
                                        <div className="event-manager__form-group event-manager__form-group--full">
                                            <label className="event-manager__label">Title *</label>
                                            <input
                                                type="text"
                                                className="event-manager__input"
                                                value={newEvent.title}
                                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                placeholder="Event title"
                                            />
                                        </div>

                                        <div className="event-manager__form-group event-manager__form-group--full">
                                            <label className="event-manager__label">Description</label>
                                            <textarea
                                                className="event-manager__textarea"
                                                value={newEvent.description}
                                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                                placeholder="Event description..."
                                                rows={3}
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Event Date *</label>
                                            <CustomDatePicker
                                                value={newEvent.date}
                                                onChange={(value) => setNewEvent({ ...newEvent, date: value })}
                                                placeholder="Select date"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Registration Deadline</label>
                                            <CustomDatePicker
                                                value={newEvent.registrationDeadline}
                                                onChange={(value) => setNewEvent({ ...newEvent, registrationDeadline: value })}
                                                placeholder="Select deadline"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Start Time</label>
                                            <CustomTimePicker
                                                value={newEvent.startTime}
                                                onChange={(value) => setNewEvent({ ...newEvent, startTime: value })}
                                                placeholder="Select start time"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">End Time</label>
                                            <CustomTimePicker
                                                value={newEvent.endTime}
                                                onChange={(value) => setNewEvent({ ...newEvent, endTime: value })}
                                                placeholder="Select end time"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Type</label>
                                            <CustomSelect
                                                options={EVENT_TYPES}
                                                value={newEvent.type}
                                                onChange={(value) => setNewEvent({ ...newEvent, type: value as EventType })}
                                                placeholder="Select type"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Mode</label>
                                            <CustomSelect
                                                options={EVENT_MODES}
                                                value={newEvent.mode}
                                                onChange={(value) => setNewEvent({ ...newEvent, mode: value as EventMode })}
                                                placeholder="Select mode"
                                            />
                                        </div>

                                        <div className="event-manager__form-group event-manager__form-group--full">
                                            <label className="event-manager__label">Venue</label>
                                            <input
                                                type="text"
                                                className="event-manager__input"
                                                value={newEvent.venue}
                                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                                                placeholder="Event location (e.g., IIT Delhi)"
                                            />
                                        </div>

                                        <div className="event-manager__form-group event-manager__form-group--full">
                                            <label className="event-manager__label">Venue URL (Optional)</label>
                                            <input
                                                type="url"
                                                className="event-manager__input"
                                                value={newEvent.venueUrl}
                                                onChange={(e) => setNewEvent({ ...newEvent, venueUrl: e.target.value })}
                                                placeholder="Google Maps link (e.g., https://maps.app.goo.gl/...)"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Eligibility</label>
                                            <CustomSelect
                                                options={ELIGIBILITY_OPTIONS}
                                                value={newEvent.eligibility}
                                                onChange={(value) => setNewEvent({ ...newEvent, eligibility: value })}
                                                placeholder="Select eligibility"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Speakers</label>
                                            <input
                                                type="text"
                                                className="event-manager__input"
                                                value={newEvent.speakers}
                                                onChange={(e) => setNewEvent({ ...newEvent, speakers: e.target.value })}
                                                placeholder="Comma separated names"
                                            />
                                        </div>

                                        <div className="event-manager__form-group">
                                            <label className="event-manager__label">Amount (₹)</label>
                                            <input
                                                type="number"
                                                className="event-manager__input event-manager__input--amount"
                                                value={newEvent.amount}
                                                onChange={(e) => setNewEvent({ ...newEvent, amount: e.target.value })}
                                                onWheel={(e) => {
                                                    // Prevent page scroll, let browser handle number increment
                                                    e.currentTarget.focus();
                                                    e.stopPropagation();
                                                }}
                                                onFocus={(e) => {
                                                    // Prevent scroll when focused
                                                    const modal = e.currentTarget.closest('.event-manager__content');
                                                    if (modal) {
                                                        const preventScroll = (ev: Event) => ev.preventDefault();
                                                        modal.addEventListener('wheel', preventScroll, { passive: false });
                                                        e.currentTarget.addEventListener('blur', () => {
                                                            modal.removeEventListener('wheel', preventScroll);
                                                        }, { once: true });
                                                    }
                                                }}
                                                placeholder="Leave empty for free event"
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        className="event-manager__next-btn"
                                        onClick={() => setActiveTab('images')}
                                    >
                                        Next: Add Images
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </button>
                                </>
                            )}

                            {activeTab === 'images' && (
                                <>
                                    <div className="event-manager__images-section">
                                        <div className="event-manager__images-upload">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileInputChange}
                                                accept="image/*"
                                                multiple
                                                style={{ display: 'none' }}
                                            />

                                            <div
                                                className={`event-manager__dropzone ${isDragActive ? 'event-manager__dropzone--active' : ''}`}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <div className="event-manager__dropzone-content">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                    <p>Drag & drop images here</p>
                                                    <span>or click to browse</span>
                                                </div>
                                            </div>

                                            {/* Uploaded images list */}
                                            {previewUrls.length > 0 && (
                                                <div className="event-manager__images-list">
                                                    {previewUrls.map((url, index) => (
                                                        <div key={index} className="event-manager__image-item">
                                                            <img src={url} alt={`Upload ${index + 1}`} />
                                                            {index === 0 && (
                                                                <span className="event-manager__image-badge">Thumbnail</span>
                                                            )}
                                                            <button
                                                                className="event-manager__image-remove"
                                                                onClick={() => removeImage(index)}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="event-manager__hint">
                                                First image will be used as thumbnail. Drag to reposition.
                                            </p>
                                        </div>

                                        <div className="event-manager__images-preview">
                                            <h4 className="event-manager__preview-title">Card Preview</h4>
                                            <div className="event-manager__preview-card">
                                                {previewUrls.length > 0 ? (
                                                    <div
                                                        ref={previewImageRef}
                                                        className="event-manager__preview-image"
                                                        onMouseDown={handleImageMouseDown}
                                                        onMouseMove={handleImageMouseMove}
                                                        onMouseUp={handleImageMouseUp}
                                                        onMouseLeave={handleImageMouseUp}
                                                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                                                    >
                                                        <img
                                                            src={previewUrls[0]}
                                                            alt="Event preview"
                                                            style={{
                                                                objectPosition: `${imagePosition.x}% ${imagePosition.y}%`
                                                            }}
                                                            draggable={false}
                                                        />
                                                        <div className="event-manager__preview-hint">
                                                            Drag to adjust position
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="event-manager__preview-placeholder">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                            <polyline points="21 15 16 10 5 21"></polyline>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="event-manager__preview-content">
                                                    <span className={`event-manager__badge ${getTypeBadgeClass(newEvent.type)}`}>
                                                        {newEvent.type}
                                                    </span>
                                                    <h5>{newEvent.title || 'Event Title'}</h5>
                                                    <p>{newEvent.date || 'Event Date'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className="event-manager__submit-btn"
                                        onClick={handleSaveEvent}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (editingEvent ? 'Updating...' : 'Creating...') : (editingEvent ? 'Update Event' : 'Create Event')}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
