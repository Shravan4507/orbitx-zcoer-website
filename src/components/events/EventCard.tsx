import type { EventData, EventCardProps } from './types';
import './EventCard.css';

// Get badge class based on event type
const getDefaultBadgeClass = (type: string): string => {
    switch (type) {
        case 'Workshop': return 'event-card__badge--workshop';
        case 'Talk': return 'event-card__badge--talk';
        case 'Competition': return 'event-card__badge--competition';
        case 'Outreach': return 'event-card__badge--outreach';
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
    if (!amount || amount === 0) return 'event-card__price--free';
    if (amount <= 100) return 'event-card__price--low';
    if (amount <= 300) return 'event-card__price--medium';
    if (amount <= 500) return 'event-card__price--high';
    return 'event-card__price--premium';
};

export default function EventCard({ event, onClick, variant = 'full', getTypeBadgeClass, onRegisterClick, isRegistered, onDownloadPass }: EventCardProps) {
    const getBadgeClass = getTypeBadgeClass || getDefaultBadgeClass;
    const isTeaser = variant === 'teaser';

    const handleClick = () => {
        onClick(event);
    };

    const handleRegisterClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!event.registrationOpen) return;
        if (onRegisterClick) {
            onRegisterClick(event);
        }
    };

    const handleDownloadPass = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownloadPass) {
            onDownloadPass(event);
        }
    };

    // Render footer action based on registration status
    const renderFooterAction = () => {
        if (event.isPast) {
            return (
                <span className="event-card__status event-card__status--closed">
                    Event Completed
                </span>
            );
        }

        if (isRegistered) {
            return (
                <>
                    <span className="event-card__status event-card__status--registered">
                        Registered ✓
                    </span>
                    <button
                        className="event-card__cta event-card__cta--download"
                        onClick={handleDownloadPass}
                    >
                        Download Pass
                    </button>
                </>
            );
        }

        return (
            <>
                <span className={`event-card__status ${event.registrationOpen ? 'event-card__status--open' : 'event-card__status--closed'}`}>
                    {event.registrationOpen ? 'Registration Open' : 'Closed'}
                </span>
                <button
                    className={`event-card__cta ${!event.registrationOpen ? 'event-card__cta--disabled' : ''}`}
                    onClick={handleRegisterClick}
                    disabled={!event.registrationOpen}
                >
                    {event.registrationOpen ? 'Register →' : 'Closed'}
                </button>
            </>
        );
    };

    return (
        <div
            className={`event-card ${event.isPast ? 'event-card--past' : ''}`}
            onClick={handleClick}
        >
            <div className="event-card__image">
                {event.images && event.images.length > 0 && (
                    <img src={event.images[0]} alt={event.title} />
                )}
            </div>
            <div className="event-card__content">
                <div className="event-card__header">
                    <span className={`event-card__tag ${event.isPast ? 'event-card__tag--past' : getBadgeClass(event.type)}`}>
                        {getTag(event)}
                    </span>
                    <span className={`event-card__price ${getPriceTierClass(event.amount)}`}>
                        {event.amount && event.amount > 0 ? `₹${event.amount}` : 'Free'}
                    </span>
                </div>
                <h3 className="event-card__title">{event.title}</h3>

                {isTeaser ? (
                    <p className="event-card__desc">
                        {event.description.substring(0, 100)}{event.description.length > 100 ? '...' : ''}
                    </p>
                ) : (
                    <>
                        <p className="event-card__desc">{event.date}</p>
                        <div className="event-card__footer">
                            {renderFooterAction()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
