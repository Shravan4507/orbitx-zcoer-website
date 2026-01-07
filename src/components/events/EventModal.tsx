import { useState } from 'react';
import type { EventData, EventModalProps } from './types';
import './EventModal.css';

// Default date formatter
const defaultFormatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

// Get badge class based on event type
const getTypeBadgeClass = (type: string): string => {
    switch (type) {
        case 'Workshop': return 'event-modal__badge--workshop';
        case 'Talk': return 'event-modal__badge--talk';
        case 'Competition': return 'event-modal__badge--competition';
        case 'Outreach': return 'event-modal__badge--outreach';
        default: return '';
    }
};

// Get display tag based on event status
const getTag = (event: EventData): string => {
    if (event.isPast) return 'Past';
    return event.type || 'Event';
};

// Get price tier class based on amount
const getPriceTierClass = (amount?: number): string => {
    if (!amount || amount === 0) return 'event-modal__price--free';
    if (amount <= 100) return 'event-modal__price--low';
    if (amount <= 300) return 'event-modal__price--medium';
    if (amount <= 500) return 'event-modal__price--high';
    return 'event-modal__price--premium';
};

export default function EventModal({ event, isClosing, onClose, formatDate, onRegisterClick, isRegistered, onDownloadPass }: EventModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showCalendarMenu, setShowCalendarMenu] = useState(false);
    const format = formatDate || defaultFormatDate;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Parse time string to get hours/minutes
    const parseEventTime = (timeStr: string): { startHour: number; startMin: number; endHour: number; endMin: number } => {
        const parseTime = (t: string): { hour: number; min: number } => {
            const match = t.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return { hour: 0, min: 0 };
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const period = match[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return { hour: hours, min: minutes };
        };

        const parts = timeStr.split(' - ');
        const start = parseTime(parts[0] || '');
        const end = parts[1] ? parseTime(parts[1]) : { hour: start.hour + 2, min: start.min };
        return { startHour: start.hour, startMin: start.min, endHour: end.hour, endMin: end.min };
    };

    // Generate Google Calendar URL
    const openGoogleCalendar = () => {
        const dateStr = event.date.replace(/-/g, '');
        let startTime = '000000';
        let endTime = '235959';

        if (event.time) {
            const times = parseEventTime(event.time);
            startTime = `${String(times.startHour).padStart(2, '0')}${String(times.startMin).padStart(2, '0')}00`;
            endTime = `${String(times.endHour).padStart(2, '0')}${String(times.endMin).padStart(2, '0')}00`;
        }

        const calendarUrl = new URL('https://calendar.google.com/calendar/render');
        calendarUrl.searchParams.set('action', 'TEMPLATE');
        calendarUrl.searchParams.set('text', event.title);
        calendarUrl.searchParams.set('dates', `${dateStr}T${startTime}/${dateStr}T${endTime}`);
        calendarUrl.searchParams.set('details', event.description);
        if (event.venue) calendarUrl.searchParams.set('location', event.venue);

        window.open(calendarUrl.toString(), '_blank');
        setShowCalendarMenu(false);
    };

    // Generate and download .ics file (works with Samsung, Apple, Outlook, etc.)
    const downloadIcsFile = () => {
        const [year, month, day] = event.date.split('-').map(Number);
        let startHour = 0, startMin = 0, endHour = 23, endMin = 59;

        if (event.time) {
            const times = parseEventTime(event.time);
            startHour = times.startHour;
            startMin = times.startMin;
            endHour = times.endHour;
            endMin = times.endMin;
        }

        const formatIcsDate = (y: number, m: number, d: number, h: number, min: number): string => {
            return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;
        };

        const startDate = formatIcsDate(year, month, day, startHour, startMin);
        const endDate = formatIcsDate(year, month, day, endHour, endMin);

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//OrbitX//Event//EN',
            'BEGIN:VEVENT',
            `DTSTART:${startDate}`,
            `DTEND:${endDate}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
            `LOCATION:${event.venue || ''}`,
            `UID:${event.id}@orbitx`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShowCalendarMenu(false);
    };

    const hasImages = event.images && event.images.length > 0;
    const hasMultipleImages = event.images && event.images.length > 1;

    const nextImage = () => {
        if (event.images) {
            setCurrentImageIndex((prev) =>
                prev === event.images!.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (event.images) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? event.images!.length - 1 : prev - 1
            );
        }
    };

    return (
        <div
            className={`event-modal-overlay ${isClosing ? 'event-modal-overlay--closing' : ''}`}
            onClick={handleOverlayClick}
        >
            <div className={`event-modal ${isClosing ? 'event-modal--closing' : ''}`}>
                <button className="event-modal__close" onClick={onClose}>×</button>

                <div className="event-modal__image">
                    {hasImages ? (
                        <>
                            {hasMultipleImages && (
                                <button className="event-modal__nav event-modal__nav--prev" onClick={prevImage}>‹</button>
                            )}
                            <img src={event.images![currentImageIndex]} alt={event.title} />
                            {hasMultipleImages && (
                                <button className="event-modal__nav event-modal__nav--next" onClick={nextImage}>›</button>
                            )}
                            {hasMultipleImages && (
                                <div className="event-modal__dots">
                                    {event.images!.map((_, idx) => (
                                        <span
                                            key={idx}
                                            className={`event-modal__dot ${idx === currentImageIndex ? 'event-modal__dot--active' : ''}`}
                                            onClick={() => setCurrentImageIndex(idx)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                <div className="event-modal__content">
                    <div className="event-modal__header-row">
                        <span className={`event-modal__tag ${event.isPast ? 'event-modal__tag--past' : getTypeBadgeClass(event.type)}`}>
                            {getTag(event)}
                        </span>
                        <span className={`event-modal__price ${getPriceTierClass(event.amount)}`}>
                            {event.amount && event.amount > 0 ? `₹${event.amount}` : 'Free'}
                        </span>
                    </div>
                    <h3 className="event-modal__title">{event.title}</h3>
                    <p className="event-modal__desc">{event.description}</p>

                    <div className="event-modal__details">
                        <div className="event-modal__detail">
                            <span className="event-modal__label">Date</span>
                            <span className="event-modal__value">{format(event.date)}</span>
                        </div>
                        {event.time && (
                            <div className="event-modal__detail">
                                <span className="event-modal__label">Time</span>
                                <span className="event-modal__value">{event.time}</span>
                            </div>
                        )}
                        <div className="event-modal__detail">
                            <span className="event-modal__label">Location</span>
                            {event.venueUrl ? (
                                <a
                                    href={event.venueUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="event-modal__value event-modal__value--link"
                                >
                                    {event.venue || 'TBA'}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            ) : (
                                <span className="event-modal__value">{event.venue || 'TBA'}</span>
                            )}
                        </div>
                    </div>

                    {event.isPast ? (
                        <span className="event-modal__past-label">This event has ended</span>
                    ) : (
                        <div className="event-modal__actions">
                            {isRegistered ? (
                                <button
                                    className="event-modal__register-btn event-modal__register-btn--download"
                                    onClick={() => onDownloadPass?.(event)}
                                >
                                    Download Pass
                                </button>
                            ) : (
                                <button
                                    className={`event-modal__register-btn ${!event.registrationOpen ? 'event-modal__register-btn--disabled' : ''}`}
                                    disabled={!event.registrationOpen}
                                    onClick={() => event.registrationOpen && onRegisterClick?.(event)}
                                >
                                    {event.registrationOpen ? 'Register Now →' : 'Registration Closed'}
                                </button>
                            )}
                            <div className="event-modal__calendar-wrapper">
                                <button
                                    className="event-modal__calendar-btn"
                                    onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    Add to Calendar
                                    <svg className="event-modal__calendar-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                                {showCalendarMenu && (
                                    <div className="event-modal__calendar-menu">
                                        <button onClick={openGoogleCalendar} className="event-modal__calendar-option">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                            </svg>
                                            Google Calendar
                                        </button>
                                        <button onClick={downloadIcsFile} className="event-modal__calendar-option">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="7 10 12 15 17 10"></polyline>
                                                <line x1="12" y1="15" x2="12" y2="3"></line>
                                            </svg>
                                            Download (.ics)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
