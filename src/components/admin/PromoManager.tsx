import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../services/firebase/config';
import { useToast } from '../toast/Toast';
import type { Promotion, PromotionMediaType } from '../../types/user';
import './PromoManager.css';

interface PromoManagerProps {
    isOpen: boolean;
    onClose: () => void;
    adminOrbitId: string;
}

export default function PromoManager({ isOpen, onClose, adminOrbitId }: PromoManagerProps) {
    const { showToast } = useToast();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Create form state
    const [newPromo, setNewPromo] = useState({
        title: '',
        file: null as File | null,
        fileName: '',
        mediaType: 'image' as PromotionMediaType,
        previewUrl: '',
        linkUrl: '' // Optional URL for clickable promo
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Fetch promotions
    useEffect(() => {
        if (!isOpen) return;

        const q = query(collection(db, 'promotions'), orderBy('priority', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const promos: Promotion[] = [];
            snapshot.forEach((doc) => {
                promos.push({ id: doc.id, ...doc.data() } as Promotion);
            });
            setPromotions(promos);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching promotions:', error);
            showToast('Failed to load promotions', 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, showToast]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setShowCreateForm(false);
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
        setNewPromo({
            title: '',
            file: null,
            fileName: '',
            mediaType: 'image',
            previewUrl: '',
            linkUrl: ''
        });
    };

    const getMediaType = (file: File): PromotionMediaType => {
        if (file.type.startsWith('video/')) return 'video';
        if (file.type === 'image/gif') return 'gif';
        return 'image';
    };

    const handleFileSelect = (file: File) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
        if (!validTypes.includes(file.type)) {
            showToast('Invalid file type. Please upload an image, GIF, or video.', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File is too large. Maximum size is 10MB.', 'error');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setNewPromo({
            ...newPromo,
            file,
            fileName: file.name,
            mediaType: getMediaType(file),
            previewUrl
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneRef.current?.classList.add('promo-manager__dropzone--active');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneRef.current?.classList.remove('promo-manager__dropzone--active');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dropZoneRef.current?.classList.remove('promo-manager__dropzone--active');

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleCreatePromo = async () => {
        if (!newPromo.title.trim()) {
            showToast('Please enter a title', 'error');
            return;
        }

        if (!newPromo.file) {
            showToast('Please select a file', 'error');
            return;
        }

        setIsSaving(true);

        try {
            // 1. Create a unique path in Firebase Storage
            const timestamp = Date.now();
            const safeFileName = newPromo.fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const storagePath = `promotions/${timestamp}_${safeFileName}`;
            const storageRef = ref(storage, storagePath);

            // 2. Upload the file
            const uploadResult = await uploadBytes(storageRef, newPromo.file);

            // 3. Get the permanent download URL
            const downloadUrl = await getDownloadURL(uploadResult.ref);

            // 4. Save metadata to Firestore
            const promoData: Omit<Promotion, 'id'> = {
                title: newPromo.title.trim(),
                mediaUrl: downloadUrl,
                mediaType: newPromo.mediaType,
                isActive: true,
                priority: promotions.length + 1,
                createdBy: adminOrbitId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                fileName: newPromo.fileName,
                storagePath: storagePath
            };

            if (newPromo.linkUrl.trim()) {
                promoData.linkUrl = newPromo.linkUrl.trim();
            }

            await addDoc(collection(db, 'promotions'), promoData);

            showToast('Promotion created successfully!', 'success');
            setShowCreateForm(false);
            resetForm();
        } catch (error) {
            console.error('Error creating promotion:', error);
            showToast('Failed to create promotion. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (promo: Promotion) => {
        try {
            await updateDoc(doc(db, 'promotions', promo.id), {
                isActive: !promo.isActive,
                updatedAt: new Date().toISOString()
            });
            showToast(`Promotion ${promo.isActive ? 'deactivated' : 'activated'}`, 'success');
        } catch (error) {
            console.error('Error updating promotion:', error);
            showToast('Failed to update promotion', 'error');
        }
    };

    const handleDeletePromo = async (promo: Promotion) => {
        if (!confirm(`Are you sure you want to delete "${promo.title}"? This will permanently remove the media file.`)) {
            return;
        }

        try {
            // 1. Delete actual file from Firebase Storage if path exists
            if (promo.storagePath) {
                try {
                    const storageRef = ref(storage, promo.storagePath);
                    await deleteObject(storageRef);
                } catch (storageError) {
                    console.error('Error deleting file from storage:', storageError);
                    // Continue with Firestore deletion even if storage fails 
                    // (prevents items being stuck if storage reference is lost)
                }
            }

            // 2. Delete document from Firestore
            await deleteDoc(doc(db, 'promotions', promo.id));
            showToast('Promotion deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting promotion:', error);
            showToast('Failed to delete promotion', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`promo-manager ${isClosing ? 'promo-manager--closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className="promo-manager__modal">
                <div className="promo-manager__header">
                    <h2 className="promo-manager__title">Promotional Screen Manager</h2>
                    <button className="promo-manager__close" onClick={handleClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="promo-manager__content">
                    {!showCreateForm ? (
                        <>
                            <div className="promo-manager__toolbar">
                                <button
                                    className="promo-manager__create-btn"
                                    onClick={() => setShowCreateForm(true)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Create Ad
                                </button>
                            </div>

                            <div className="promo-manager__list">
                                {isLoading ? (
                                    <div className="promo-manager__loading">Loading promotions...</div>
                                ) : promotions.length === 0 ? (
                                    <div className="promo-manager__empty">
                                        <p>No promotions yet</p>
                                        <span>Click "Create Ad" to add your first promotion</span>
                                    </div>
                                ) : (
                                    promotions.map((promo) => (
                                        <div key={promo.id} className={`promo-manager__item ${!promo.isActive ? 'promo-manager__item--inactive' : ''}`}>
                                            <div className="promo-manager__item-preview">
                                                <div className="promo-manager__item-placeholder">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="promo-manager__item-info">
                                                <h4 className="promo-manager__item-title">{promo.title}</h4>
                                                <span className="promo-manager__item-type">{promo.mediaType?.toUpperCase() || 'IMAGE'}</span>
                                                <span className={`promo-manager__item-status ${promo.isActive ? 'promo-manager__item-status--active' : ''}`}>
                                                    {promo.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                {promo.linkUrl && (
                                                    <span className="promo-manager__item-link" title={promo.linkUrl}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="promo-manager__item-actions">
                                                <button
                                                    className="promo-manager__item-btn"
                                                    onClick={() => handleToggleActive(promo)}
                                                    title={promo.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        {promo.isActive ? (
                                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                                                        ) : (
                                                            <>
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                                <circle cx="12" cy="12" r="3"></circle>
                                                            </>
                                                        )}
                                                    </svg>
                                                </button>
                                                <button
                                                    className="promo-manager__item-btn promo-manager__item-btn--delete"
                                                    onClick={() => handleDeletePromo(promo)}
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
                        <div className="promo-manager__create-form">
                            <button
                                className="promo-manager__back-btn"
                                onClick={() => { setShowCreateForm(false); resetForm(); }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                Back to list
                            </button>

                            <div className="promo-manager__form-grid">
                                <div className="promo-manager__form-left">
                                    <div className="promo-manager__form-group">
                                        <label className="promo-manager__label">Title *</label>
                                        <input
                                            type="text"
                                            className="promo-manager__input"
                                            value={newPromo.title}
                                            onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                                            placeholder="Enter promotion title"
                                        />
                                    </div>

                                    <div className="promo-manager__form-group">
                                        <label className="promo-manager__label">Media *</label>
                                        <div
                                            ref={dropZoneRef}
                                            className="promo-manager__dropzone"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {newPromo.previewUrl ? (
                                                <div className="promo-manager__dropzone-preview">
                                                    {newPromo.mediaType === 'video' ? (
                                                        <video src={newPromo.previewUrl} muted autoPlay loop />
                                                    ) : (
                                                        <img src={newPromo.previewUrl} alt="Preview" />
                                                    )}
                                                    <div className="promo-manager__dropzone-filename">{newPromo.fileName}</div>
                                                    <button
                                                        className="promo-manager__dropzone-remove"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNewPromo({ ...newPromo, file: null, fileName: '', previewUrl: '' });
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="promo-manager__dropzone-content">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="17 8 12 3 7 8"></polyline>
                                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                                    </svg>
                                                    <p>Drag & drop or click to upload</p>
                                                    <span>Image, GIF, or Video (max 10MB)</span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,video/mp4,video/webm"
                                            onChange={handleFileInputChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>

                                    <div className="promo-manager__form-group">
                                        <label className="promo-manager__label">Link URL (Optional)</label>
                                        <input
                                            type="url"
                                            className="promo-manager__input"
                                            value={newPromo.linkUrl}
                                            onChange={(e) => setNewPromo({ ...newPromo, linkUrl: e.target.value })}
                                            placeholder="https://example.com (leave empty for no link)"
                                        />
                                        <span className="promo-manager__hint">If provided, clicking the promo will open this URL</span>
                                    </div>

                                    <button
                                        className="promo-manager__submit-btn"
                                        onClick={handleCreatePromo}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Create Promotion'}
                                    </button>
                                </div>

                                <div className="promo-manager__form-right">
                                    <label className="promo-manager__label">Live Preview</label>
                                    <div className="promo-manager__live-preview">
                                        {newPromo.previewUrl ? (
                                            <div className="promo-manager__preview-container">
                                                {newPromo.mediaType === 'video' ? (
                                                    <video src={newPromo.previewUrl} muted autoPlay loop />
                                                ) : (
                                                    <img src={newPromo.previewUrl} alt="Live Preview" />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="promo-manager__preview-placeholder">
                                                <span>Preview will appear here</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
