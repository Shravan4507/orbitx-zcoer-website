import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../toast/Toast';
import { ADMIN_PERMISSIONS } from '../../types/user';
import CustomSelect from '../ui/CustomSelect';
import Footer from '../layout/Footer';
import './MerchManager.css';

export interface Product {
    id: string;
    productId?: string;
    name: string;
    price: number;
    category: string;
    description: string;
    images: string[];
    inStock: boolean;
    sizes?: string[];
    createdAt: string;
    updatedAt: string;
}

const CATEGORIES = [
    { value: 'T-Shirts', label: 'T-Shirts' },
    { value: 'Hoodies', label: 'Hoodies' },
    { value: 'Stickers', label: 'Stickers' },
    { value: 'Accessories', label: 'Accessories' }
];

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];

// Associate File objects with their object URLs for preview reordering
const filePreviewMap = new WeakMap<File, string>();

/**
 * Generates a unique Product ID
 * Format: PRD-YYYY-XXXX
 */
const generateProductId = async (): Promise<string> => {
    try {
        const currentYear = new Date().getFullYear();
        const registryRef = doc(db, 'system', 'productIdRegistry');
        const registryDoc = await getDoc(registryRef);

        let currentCounter = 0;

        if (registryDoc.exists()) {
            const data = registryDoc.data();
            if (data.year === currentYear) {
                currentCounter = data.counter || 0;
            }
        }

        const newCounter = currentCounter + 1;

        await setDoc(registryRef, {
            year: currentYear,
            counter: newCounter,
            lastUpdated: new Date().toISOString()
        });

        return `PRD-${currentYear}-${String(newCounter).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating productId, using fallback:', error);
        return `PRD-${Date.now().toString().slice(-8)}`;
    }
};

export default function MerchManager() {
    const navigate = useNavigate();
    const { isAdmin, hasPermission } = useAuth();
    const { showToast } = useToast();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'T-Shirts',
        description: '',
        inStock: true,
        sizes: [] as string[],
        images: [] as string[]
    });

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Check permission
    const canManageMerch = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_MERCH);

    useEffect(() => {
        if (!canManageMerch) {
            navigate('/user-dashboard');
            return;
        }

        const q = query(collection(db, 'merch'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
            setProducts(fetchedProducts);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching products:', error);
            showToast('Failed to load products', 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [canManageMerch, navigate, showToast]);

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            category: 'T-Shirts',
            description: '',
            inStock: true,
            sizes: [],
            images: []
        });
        setEditingProduct(null);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: String(product.price),
            category: product.category,
            description: product.description,
            inStock: product.inStock,
            sizes: product.sizes || [],
            images: product.images || []
        });
        setPreviewUrls(product.images || []);
        setSelectedFiles([]);
        setShowForm(true);
    };

    const uploadImages = async (productId: string, filesToUpload: File[]): Promise<Map<string, string>> => {
        const urlMap = new Map<string, string>();
        const uploadPromises = filesToUpload.map(async (file) => {
            const storageRef = ref(storage, `merch/${productId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            const previewUrl = filePreviewMap.get(file);
            if (previewUrl) urlMap.set(previewUrl, downloadUrl);
            return downloadUrl;
        });
        await Promise.all(uploadPromises);
        return urlMap;
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price) {
            showToast('Please fill in required fields', 'error');
            return;
        }

        if (previewUrls.length === 0) {
            showToast('Please add at least one image', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const tempId = editingProduct ? editingProduct.id : (await generateProductId());

            // Upload new images
            const newUrlMap = await uploadImages(tempId, selectedFiles);

            // Construct final images array based on previewUrls order
            const finalImageUrls = previewUrls.map(url => {
                // If it's in the map, it was a new file
                if (newUrlMap.has(url)) return newUrlMap.get(url)!;
                // Otherwise it's an existing URL
                return url;
            });

            const productData = {
                name: formData.name.trim(),
                price: parseFloat(formData.price),
                category: formData.category,
                description: formData.description.trim(),
                inStock: formData.inStock,
                sizes: formData.sizes,
                images: finalImageUrls,
                updatedAt: new Date().toISOString()
            };

            if (editingProduct) {
                await updateDoc(doc(db, 'merch', editingProduct.id), productData);
                showToast('Product updated successfully', 'success');
            } else {
                const newProduct = {
                    ...productData,
                    productId: tempId,
                    createdAt: new Date().toISOString()
                };
                await addDoc(collection(db, 'merch'), newProduct);
                showToast('Product created successfully', 'success');
            }

            setShowForm(false);
            resetForm();
            setPreviewUrls([]);
            setSelectedFiles([]);
        } catch (error: any) {
            console.error('Error saving product:', error);
            showToast('Failed to save product', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

        try {
            await deleteDoc(doc(db, 'merch', product.id));
            showToast('Product deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Failed to delete product', 'error');
        }
    };

    const toggleSize = (size: string) => {
        setFormData(prev => ({
            ...prev,
            sizes: prev.sizes.includes(size)
                ? prev.sizes.filter(s => s !== size)
                : [...prev.sizes, size]
        }));
    };

    // Image Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        addFiles(files);
    };

    const addFiles = (files: File[]) => {
        const newPreviews = files.map(file => {
            const url = URL.createObjectURL(file);
            filePreviewMap.set(file, url);
            return url;
        });
        setSelectedFiles(prev => [...prev, ...files]);
        setPreviewUrls(prev => [...prev, ...newPreviews]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            addFiles(imageFiles);
        } else {
            showToast('Please drop image files only', 'error');
        }
    };

    const removeImage = (index: number) => {
        // Find if it's an existing URL or a new file preview
        const urlToRemove = previewUrls[index];
        const isExistingUrl = formData.images.includes(urlToRemove);

        if (isExistingUrl) {
            setFormData(prev => ({
                ...prev,
                images: prev.images.filter(url => url !== urlToRemove)
            }));
        } else {
            // It's a new file, find it in selectedFiles by its previewUrl
            setSelectedFiles(prev => prev.filter(file => filePreviewMap.get(file) !== urlToRemove));
            URL.revokeObjectURL(urlToRemove);
        }

        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const setAsThumbnail = (index: number) => {
        if (index === 0) return;

        setPreviewUrls(prev => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.unshift(moved);
            return next;
        });
    };

    if (!canManageMerch) return null;

    return (
        <>
            <main className="merch-manager-page">
                <header className="manager-header">
                    <h1>Merchandise Management</h1>
                    <p>Add and update products in the OrbitX store</p>
                </header>

                <div className="merch-manager-container">
                    {!showForm ? (
                        <>
                            <div className="merch-manager__toolbar">
                                <span className="merch-manager__items-count">{products.length} Products Found</span>
                                <button
                                    className="merch-manager__create-btn"
                                    onClick={() => setShowForm(true)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18 }}>
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Add New Product
                                </button>
                            </div>

                            <div className="merch-manager__list">
                                {isLoading ? (
                                    <div className="merch-manager__loading-state">Loading store items...</div>
                                ) : products.length === 0 ? (
                                    <div className="merch-manager__empty-state">No products yet. Click "Add New Product" to start.</div>
                                ) : (
                                    products.map(product => (
                                        <div key={product.id} className="merch-manager__item">
                                            <div className="merch-manager__item-preview">
                                                {product.images[0] ? (
                                                    <img src={product.images[0]} alt={product.name} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ width: 24, opacity: 0.3 }}>
                                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                            <polyline points="21 15 16 10 5 21"></polyline>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="merch-manager__item-info">
                                                <div className="merch-manager__item-header">
                                                    <h3 className="merch-manager__item-name">{product.name}</h3>
                                                    <span className="merch-manager__category-badge">{product.category}</span>
                                                </div>
                                                <div className="merch-manager__item-meta">
                                                    <span>₹{product.price}</span>
                                                    <span>•</span>
                                                    <span className={product.inStock ? 'merch-status--in-stock' : 'merch-status--out-of-stock'}>
                                                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>ID: {product.productId}</span>
                                                </div>
                                            </div>
                                            <div className="merch-manager__item-actions">
                                                <button
                                                    className="merch-manager__action-btn"
                                                    onClick={() => handleEditProduct(product)}
                                                    title="Edit Product"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    className="merch-manager__action-btn merch-manager__action-btn--delete"
                                                    onClick={() => handleDeleteProduct(product)}
                                                    title="Delete Product"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="merch-manager__modal">
                            <form className="merch-manager__form" onSubmit={handleSaveProduct}>
                                <div className="merch-manager__form-header-row">
                                    <h2>{editingProduct ? 'Edit Product' : 'Create New Product'}</h2>
                                    <button
                                        type="button"
                                        className="merch-manager__close"
                                        onClick={() => { setShowForm(false); resetForm(); }}
                                    >✕</button>
                                </div>

                                <div className="merch-manager__form-grid">
                                    <div className="merch-manager__form-group--full">
                                        <label className="merch-manager__label">Product Name *</label>
                                        <input
                                            type="text"
                                            className="merch-manager__input"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. OrbitX Official T-Shirt"
                                            required
                                        />
                                    </div>

                                    <div className="merch-manager__form-group">
                                        <label className="merch-manager__label">Price (₹) *</label>
                                        <input
                                            type="number"
                                            className="merch-manager__input"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="e.g. 599"
                                            required
                                        />
                                    </div>

                                    <div className="merch-manager__form-group">
                                        <label className="merch-manager__label">Category</label>
                                        <CustomSelect
                                            options={CATEGORIES}
                                            value={formData.category}
                                            onChange={val => setFormData({ ...formData, category: val })}
                                        />
                                    </div>

                                    <div className="merch-manager__form-group--full">
                                        <label className="merch-manager__label">Description</label>
                                        <textarea
                                            className="merch-manager__textarea"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Product details, material, etc."
                                        />
                                    </div>

                                    {(formData.category === 'T-Shirts' || formData.category === 'Hoodies') && (
                                        <div className="merch-manager__form-group--full">
                                            <label className="merch-manager__label">Available Sizes</label>
                                            <div className="merch-manager__size-grid">
                                                {SIZE_OPTIONS.map(size => (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={() => toggleSize(size)}
                                                        className={`merch-manager__size-btn ${formData.sizes.includes(size) ? 'merch-manager__size-btn--active' : ''}`}
                                                    >{size}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="merch-manager__form-group--full">
                                        <label className="merch-manager__label">Inventory Status</label>
                                        <label className="merch-manager__checkbox-group">
                                            <input
                                                type="checkbox"
                                                className="merch-manager__checkbox"
                                                checked={formData.inStock}
                                                onChange={e => setFormData({ ...formData, inStock: e.target.checked })}
                                            />
                                            <span>In Stock / Available for purchase</span>
                                        </label>
                                    </div>

                                    <div className="merch-manager__form-group--full">
                                        <label className="merch-manager__label">Product Images *</label>
                                        <div
                                            className={`merch-manager__upload-area ${isDragging ? 'merch-manager__upload-area--dragging' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => document.getElementById('merch-file-input')?.click()}
                                        >
                                            <input
                                                type="file"
                                                id="merch-file-input"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                style={{ display: 'none' }}
                                            />
                                            <div className="merch-manager__upload-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="17 8 12 3 7 8"></polyline>
                                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                                </svg>
                                            </div>
                                            <div className="merch-manager__upload-text">
                                                <span>Click to upload or drag and drop</span>
                                                <p>Multiple images allowed (First will be thumbnail)</p>
                                            </div>
                                        </div>

                                        <div className="merch-manager__images-grid">
                                            {previewUrls.map((url, i) => (
                                                <div key={i} className={`merch-manager__image-card ${i === 0 ? 'merch-manager__image-card--thumbnail' : ''}`}>
                                                    <img src={url} alt="" />
                                                    <div className="merch-manager__image-overlay">
                                                        <button
                                                            type="button"
                                                            className="merch-manager__image-action"
                                                            onClick={(e) => { e.stopPropagation(); setAsThumbnail(i); }}
                                                            title="Set as Thumbnail"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="merch-manager__image-action merch-manager__image-action--delete"
                                                            onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                                            title="Remove Image"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    {i === 0 && <span className="merch-manager__thumbnail-badge">Thumbnail</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="merch-manager__submit-btn"
                                    disabled={isSaving}
                                    style={{ marginTop: '1rem' }}
                                >
                                    {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
