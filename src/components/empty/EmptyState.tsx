import './EmptyState.css';

type EmptyStateProps = {
    type: 'events' | 'merch' | 'members' | 'notifications' | 'search';
    title?: string;
    description?: string;
};

const EMPTY_CONTENT = {
    events: {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
        ),
        title: 'No Events Yet',
        description: 'Your registered events will appear here. Start exploring and register for exciting events!'
    },
    merch: {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
        ),
        title: 'No Merch Orders',
        description: 'Your merchandise orders will show up here. Check out the store for some cool stuff!'
    },
    members: {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        ),
        title: 'No Members Found',
        description: 'There are no members to display at the moment.'
    },
    notifications: {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        ),
        title: 'All Caught Up',
        description: 'You have no new notifications. We\'ll let you know when something happens!'
    },
    search: {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        ),
        title: 'No Results Found',
        description: 'We couldn\'t find what you\'re looking for. Try a different search term.'
    }
};

export default function EmptyState({ type, title, description }: EmptyStateProps) {
    const content = EMPTY_CONTENT[type];

    return (
        <div className="empty-state">
            <div className="empty-state__icon">
                {content.icon}
            </div>
            <h3 className="empty-state__title">{title || content.title}</h3>
            <p className="empty-state__description">{description || content.description}</p>
        </div>
    );
}
