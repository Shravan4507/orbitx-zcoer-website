import './Skeleton.css';

type SkeletonProps = {
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
};

export default function Skeleton({
    variant = 'rectangular',
    width,
    height,
    borderRadius
}: SkeletonProps) {
    const style: React.CSSProperties = {
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'text' ? '1rem' : undefined),
        borderRadius: borderRadius || (variant === 'circular' ? '50%' : variant === 'card' ? '24px' : '8px')
    };

    return (
        <div
            className={`skeleton skeleton--${variant}`}
            style={style}
        />
    );
}

type SkeletonCardProps = {
    showImage?: boolean;
};

export function SkeletonCard({ showImage = true }: SkeletonCardProps) {
    return (
        <div className="skeleton-card">
            {showImage && <Skeleton variant="rectangular" height={120} borderRadius={16} />}
            <div className="skeleton-card__content">
                <Skeleton variant="text" width="80%" height={18} />
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="40%" height={12} />
            </div>
        </div>
    );
}

export function SkeletonProfile() {
    return (
        <div className="skeleton-profile">
            <Skeleton variant="circular" width={90} height={90} />
            <Skeleton variant="text" width={150} height={24} />
            <Skeleton variant="text" width={100} height={16} />
            <div className="skeleton-profile__info">
                <Skeleton variant="rectangular" width="100%" height={50} borderRadius={24} />
                <Skeleton variant="rectangular" width="100%" height={50} borderRadius={24} />
            </div>
            <div className="skeleton-profile__stats">
                <Skeleton variant="rectangular" width="100%" height={80} borderRadius={14} />
                <Skeleton variant="rectangular" width="100%" height={80} borderRadius={14} />
            </div>
        </div>
    );
}

export function SkeletonEventList() {
    return (
        <div className="skeleton-event-list">
            {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-event">
                    <Skeleton variant="rectangular" width={90} height={60} borderRadius={10} />
                    <div className="skeleton-event__content">
                        <Skeleton variant="text" width="70%" height={16} />
                        <Skeleton variant="text" width="50%" height={12} />
                        <Skeleton variant="text" width="30%" height={10} />
                    </div>
                    <Skeleton variant="rectangular" width={60} height={32} borderRadius={8} />
                </div>
            ))}
        </div>
    );
}
