// Shared Event interface for all event-related components
// Named EventData to avoid collision with browser's built-in Event type
export interface EventData {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    venue: string;
    time: string;
    registrationOpen: boolean;
    isPast: boolean;
    // Optional fields for full events page
    mode?: 'Online' | 'Offline';
    registrationDeadline?: string;
    eligibility?: string;
    speakers?: string[];
    images?: string[];
    amount?: number; // Event fee in rupees (0 or undefined = free)
    venueUrl?: string; // URL to the venue location (e.g., Google Maps link)
}

// Props for EventModal component
export interface EventModalProps {
    event: EventData;
    isClosing: boolean;
    onClose: () => void;
    formatDate?: (dateStr: string) => string;
    onRegisterClick?: (event: EventData) => void;
    isRegistered?: boolean;
    onDownloadPass?: (event: EventData) => void;
}

// Props for EventCard component
export interface EventCardProps {
    event: EventData;
    onClick: (event: EventData) => void;
    variant?: 'teaser' | 'full';
    getTypeBadgeClass?: (type: string) => string;
    onRegisterClick?: (event: EventData) => void;
    isRegistered?: boolean;
    onDownloadPass?: (event: EventData) => void;
}
