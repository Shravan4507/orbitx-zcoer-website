/**
 * ImageCropper - Simple WordPress-style cropper
 * Clean and minimal UI
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import './ImageCropper.css';

interface ImageCropperProps {
    imageSrc: string;
    onCrop: (croppedBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number;
}

export default function ImageCropper({
    imageSrc,
    onCrop,
    onCancel,
    aspectRatio = 1
}: ImageCropperProps) {
    const cropperRef = useRef<ReactCropperElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset crop
    const handleReset = useCallback(() => {
        cropperRef.current?.cropper?.reset();
    }, []);

    // Process crop
    const handleCrop = useCallback(() => {
        const cropper = cropperRef.current?.cropper;
        if (!cropper) return;

        setIsProcessing(true);
        const canvas = cropper.getCroppedCanvas({
            width: 800,
            height: 800,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    onCrop(blob);
                }
                setIsProcessing(false);
            },
            'image/jpeg',
            0.9
        );
    }, [onCrop]);

    // Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div className="image-cropper-overlay">
            <div className="image-cropper-modal">
                {/* Header */}
                <div className="image-cropper-header">
                    <span>Crop image</span>
                    <button className="image-cropper-close" onClick={onCancel}>×</button>
                </div>

                {/* Cropper */}
                <div className="image-cropper-body">
                    <Cropper
                        ref={cropperRef}
                        src={imageSrc}
                        style={{ height: '100%', width: '100%' }}
                        aspectRatio={aspectRatio}
                        viewMode={1}
                        guides={true}
                        center={true}
                        background={true}
                        responsive={true}
                        autoCropArea={0.9}
                        checkOrientation={true}
                        dragMode="crop"
                        cropBoxMovable={true}
                        cropBoxResizable={true}
                    />
                </div>

                {/* Footer */}
                <div className="image-cropper-footer">
                    <button className="image-cropper-btn image-cropper-btn--reset" onClick={handleReset}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        Reset crop
                    </button>
                    <div className="image-cropper-actions">
                        <button
                            className="image-cropper-btn image-cropper-btn--cancel"
                            onClick={onCancel}
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            className="image-cropper-btn image-cropper-btn--crop"
                            onClick={handleCrop}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Cropping...' : 'Crop'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
