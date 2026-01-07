import { useState, useRef } from 'react';
import './AvatarUpload.css';
import { useToast } from '../toast/Toast';

type AvatarUploadProps = {
    currentImage?: string;
    onImageChange: (imageUrl: string) => void;
    size?: number;
};

export default function AvatarUpload({
    currentImage,
    onImageChange,
    size = 90
}: AvatarUploadProps) {
    const { showToast } = useToast();
    const [preview, setPreview] = useState<string | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            setPreview(imageUrl);
            onImageChange(imageUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const displayImage = preview || currentImage;

    return (
        <div
            className="avatar-upload"
            style={{ width: size, height: size }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="avatar-upload__input"
            />

            {displayImage ? (
                <img
                    src={displayImage}
                    alt="Avatar"
                    className="avatar-upload__image"
                />
            ) : (
                <div className="avatar-upload__placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
            )}

            <div className={`avatar-upload__overlay ${isHovering ? 'avatar-upload__overlay--visible' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Change</span>
            </div>
        </div>
    );
}
