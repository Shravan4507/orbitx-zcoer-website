import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import './Merch.css';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/scroll/ScrollReveal';
import { SearchInput, MultiFilterDropdown, Toolbar } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/toast/Toast';
import { createOrder, generateOrderId, DELIVERY_CHARGE, COLLEGE_NAME } from '../services/firebase/merchOrders';

type ProductVariant = {
    size?: string;
    color?: string;
};

type Product = {
    id: string;
    name: string;
    price: number;
    category: 'T-Shirts' | 'Hoodies' | 'Stickers' | 'Accessories';
    description: string;
    images: string[];
    inStock: boolean;
    sizes?: string[];
    variants?: ProductVariant[];
};

type CartItem = {
    product: Product;
    quantity: number;
    size?: string;
};

// Mock products removed, fetching from Firestore now.

const CATEGORIES = ['All', 'T-Shirts', 'Hoodies', 'Stickers', 'Accessories'] as const;
const AVAILABILITY_OPTIONS = ['All', 'In Stock', 'Out of Stock'] as const;

export default function Merch() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedAvailability, setSelectedAvailability] = useState<string>('All');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Fetch products from Firestore
    useEffect(() => {
        const q = query(collection(db, 'merch'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[];
            setProducts(fetchedProducts);
            setIsLoadingProducts(false);
        }, (error) => {
            console.error('Error fetching products:', error);
            showToast('Failed to load products', 'error');
            setIsLoadingProducts(false);
        });

        return () => unsubscribe();
    }, [showToast]);

    // Checkout state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState(1);
    const [deliveryAddress, setDeliveryAddress] = useState({
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: ''
    });
    const [wantsHomeDelivery, setWantsHomeDelivery] = useState(false);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    useEffect(() => {
        if (selectedProduct) {
            document.body.classList.add('merch-modal-open');
            setSelectedSize(selectedProduct.sizes?.[0] || '');
            setQuantity(1);
            setCurrentImageIndex(0);
        } else {
            document.body.classList.remove('merch-modal-open');
        }
        return () => document.body.classList.remove('merch-modal-open');
    }, [selectedProduct]);

    useEffect(() => {
        if (isCartOpen) {
            document.body.classList.add('merch-cart-open');
        } else {
            document.body.classList.remove('merch-cart-open');
        }
        return () => document.body.classList.remove('merch-cart-open');
    }, [isCartOpen]);

    const filteredProducts = products.filter((product: Product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const matchesAvailability =
            selectedAvailability === 'All' ||
            (selectedAvailability === 'In Stock' && product.inStock) ||
            (selectedAvailability === 'Out of Stock' && !product.inStock);
        return matchesSearch && matchesCategory && matchesAvailability;
    });

    const addToCart = () => {
        if (!selectedProduct) return;
        const existingIndex = cart.findIndex(
            item => item.product.id === selectedProduct.id && item.size === selectedSize
        );
        if (existingIndex >= 0) {
            const newCart = [...cart];
            newCart[existingIndex].quantity += quantity;
            setCart(newCart);
        } else {
            setCart([...cart, { product: selectedProduct, quantity, size: selectedSize }]);
        }
        setIsCartOpen(true);
        setSelectedProduct(null);
    };

    const removeFromCart = (index: number) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
        if (newCart.length === 0 && isCheckoutOpen) {
            setIsCheckoutOpen(false);
            showToast('Cart is empty', 'info');
        }
    };

    const updateCartQuantity = (index: number, newQuantity: number) => {
        if (newQuantity < 1) return;
        const newCart = [...cart];
        newCart[index].quantity = newQuantity;
        setCart(newCart);
    };

    const handleCheckout = () => {
        if (!user) {
            showToast('Please login to continue', 'info');
            navigate('/login', { state: { from: '/merch' } });
            return;
        }
        setIsCartOpen(false);
        setCheckoutStep(1);
        setWantsHomeDelivery(false);
        setIsCheckoutOpen(true);
    };

    const handleBuyNow = () => {
        if (!user) {
            showToast('Please login to continue', 'info');
            navigate('/login', { state: { from: '/merch' } });
            return;
        }
        if (!selectedProduct) return;

        // Add to cart first if it's not there, or just replace cart with this item for "Buy Now"?
        // Usually Buy Now implies a direct checkout of that item.
        // For simplicity, we'll just open the checkout for the current item specifically or the whole cart.
        // Let's make it add to cart and then open checkout.
        // Check for size selection if required
        if (selectedProduct.sizes && selectedProduct.sizes.length > 0 && !selectedSize) {
            showToast('Please select a size', 'info');
            return;
        }

        addToCart();
        setCheckoutStep(1);
        setWantsHomeDelivery(false);
        setIsCheckoutOpen(true);
    };

    const processOrder = async () => {
        if (!user || !profile || cart.length === 0) return;

        setIsProcessingOrder(true);
        try {
            const orderItems = cart.map(item => ({
                productId: item.product.id,
                productName: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                size: item.size || '',
                category: item.product.category
            }));

            const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
            const finalDeliveryMethod = wantsHomeDelivery ? 'delivery' : 'pickup';
            const finalDeliveryCharge = (wantsHomeDelivery && !isZealStudent) ? DELIVERY_CHARGE : 0;

            const orderData: any = {
                orderId: generateOrderId(),
                userId: user.uid,
                orbitId: profile.orbitId || 'N/A',
                customerName: `${profile.firstName} ${profile.lastName}`,
                customerEmail: user.email || '',
                customerPhone: profile.mobile || '',
                collegeName: profile.collegeName || 'N/A',
                items: orderItems,
                subtotal,
                deliveryCharge: finalDeliveryCharge,
                totalAmount: subtotal + finalDeliveryCharge,
                deliveryMethod: finalDeliveryMethod,
                orderStatus: 'pending',
                paymentStatus: 'pending'
            };

            if (finalDeliveryMethod === 'delivery') {
                orderData.deliveryAddress = deliveryAddress;
            }

            await createOrder(orderData);

            showToast('Order placed successfully! Check your dashboard for updates.', 'success');
            setCart([]);
            setIsCheckoutOpen(false);
        } catch (error: any) {
            console.error('Order error:', error);
            showToast(error.message || 'Failed to place order. Please try again.', 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const isZealStudent = profile?.collegeName === COLLEGE_NAME;

    return (
        <>
            <main className="merch-page">
                <ScrollReveal direction="fade">
                    <section className="merch-hero">
                        <h1 className="merch-hero__title">OrbitX Merchandise</h1>
                        <p className="merch-hero__subtitle">
                            Support our community while showcasing your passion for space.
                            Every purchase helps fund our events, workshops, and outreach programs.
                        </p>
                    </section>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.1} className="scroll-reveal--z-high">
                    <div className="merch-toolbar-wrapper">
                        <Toolbar>
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search products..."
                            />
                            <MultiFilterDropdown
                                sections={[
                                    {
                                        title: 'Category',
                                        options: CATEGORIES.map(cat => ({ value: cat, label: cat })),
                                        value: selectedCategory,
                                        onChange: setSelectedCategory
                                    },
                                    {
                                        title: 'Availability',
                                        options: AVAILABILITY_OPTIONS.map(opt => ({ value: opt, label: opt })),
                                        value: selectedAvailability,
                                        onChange: setSelectedAvailability
                                    }
                                ]}
                            />
                            <button className="merch-cart-btn" onClick={() => setIsCartOpen(true)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                {cartItemCount > 0 && (
                                    <span className="merch-cart-btn__count">{cartItemCount}</span>
                                )}
                            </button>
                        </Toolbar>
                    </div>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.15}>
                    <section className="merch-grid">
                        {isLoadingProducts ? (
                            <div className="merch-loading" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                                Loading cosmic gear...
                            </div>
                        ) : filteredProducts.map(product => (
                            <article
                                key={product.id}
                                className="merch-card"
                                onClick={() => setSelectedProduct(product)}
                            >
                                <div className="merch-card__image">
                                    <img src={product.images[0]} alt={product.name} loading="lazy" />
                                    <span className={`merch-card__badge ${product.inStock ? 'merch-card__badge--in-stock' : 'merch-card__badge--out-of-stock'}`}>
                                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                                <div className="merch-card__content">
                                    <span className="merch-card__category">{product.category}</span>
                                    <h3 className="merch-card__name">{product.name}</h3>
                                    <span className="merch-card__price">₹{product.price}</span>
                                </div>
                            </article>
                        ))}
                    </section>
                </ScrollReveal>

                {filteredProducts.length === 0 && (
                    <div className="merch-empty">
                        <p>No products found matching your criteria.</p>
                    </div>
                )}
            </main >

            {selectedProduct && (
                <div className="merch-modal-overlay" onClick={() => setSelectedProduct(null)}>
                    <div className="merch-modal" onClick={e => e.stopPropagation()}>
                        <button className="merch-modal__close" onClick={() => setSelectedProduct(null)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <div className="merch-modal__gallery">
                            <div className="merch-modal__image">
                                <img src={selectedProduct.images[currentImageIndex]} alt={selectedProduct.name} />
                            </div>
                            {selectedProduct.images.length > 1 && (
                                <>
                                    <button
                                        className="merch-modal__nav merch-modal__nav--prev"
                                        onClick={() => setCurrentImageIndex(i => i === 0 ? selectedProduct.images.length - 1 : i - 1)}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                    </button>
                                    <button
                                        className="merch-modal__nav merch-modal__nav--next"
                                        onClick={() => setCurrentImageIndex(i => i === selectedProduct.images.length - 1 ? 0 : i + 1)}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </button>
                                    <div className="merch-modal__dots">
                                        {selectedProduct.images.map((_, i) => (
                                            <button
                                                key={i}
                                                className={`merch-modal__dot ${i === currentImageIndex ? 'merch-modal__dot--active' : ''}`}
                                                onClick={() => setCurrentImageIndex(i)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="merch-modal__content">
                            <span className="merch-modal__category">{selectedProduct.category}</span>
                            <h2 className="merch-modal__name">{selectedProduct.name}</h2>
                            <span className="merch-modal__price">₹{selectedProduct.price}</span>
                            <p className="merch-modal__desc">{selectedProduct.description}</p>

                            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                                <div className="merch-modal__sizes">
                                    <span className="merch-modal__label">Size</span>
                                    <div className="merch-modal__size-options">
                                        {selectedProduct.sizes.map(size => (
                                            <button
                                                key={size}
                                                className={`merch-modal__size-btn ${selectedSize === size ? 'merch-modal__size-btn--active' : ''}`}
                                                onClick={() => setSelectedSize(size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="merch-modal__quantity">
                                <span className="merch-modal__label">Quantity</span>
                                <div className="merch-modal__quantity-controls">
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                    <span>{quantity}</span>
                                    <button onClick={() => setQuantity(q => q + 1)}>+</button>
                                </div>
                            </div>

                            <div className="merch-modal__actions">
                                <button
                                    className="merch-modal__btn merch-modal__btn--primary"
                                    disabled={!selectedProduct.inStock}
                                    onClick={handleBuyNow}
                                >
                                    Buy Now
                                </button>
                                <button
                                    className="merch-modal__btn merch-modal__btn--secondary"
                                    onClick={addToCart}
                                    disabled={!selectedProduct.inStock}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            <div className={`merch-cart-drawer ${isCartOpen ? 'merch-cart-drawer--open' : ''}`}>
                <div className="merch-cart-drawer__header">
                    <h3>Your Cart ({cartItemCount})</h3>
                    <button className="merch-cart-drawer__close" onClick={() => setIsCartOpen(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="merch-cart-drawer__content">
                    {cart.length === 0 ? (
                        <div className="merch-cart-drawer__empty">
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        <div className="merch-cart-drawer__items">
                            {cart.map((item, index) => (
                                <div key={`${item.product.id}-${item.size}`} className="merch-cart-item">
                                    <img src={item.product.images[0]} alt={item.product.name} />
                                    <div className="merch-cart-item__details">
                                        <span className="merch-cart-item__name">{item.product.name}</span>
                                        {item.size && <span className="merch-cart-item__size">Size: {item.size}</span>}
                                        <span className="merch-cart-item__price">₹{item.product.price}</span>
                                    </div>
                                    <div className="merch-cart-item__controls">
                                        <div className="merch-cart-item__quantity">
                                            <button onClick={() => updateCartQuantity(index, item.quantity - 1)}>−</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateCartQuantity(index, item.quantity + 1)}>+</button>
                                        </div>
                                        <button className="merch-cart-item__remove" onClick={() => removeFromCart(index)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="merch-cart-drawer__footer">
                        <div className="merch-cart-drawer__total">
                            <span>Subtotal</span>
                            <span>₹{cartTotal}</span>
                        </div>
                        <button className="merch-cart-drawer__checkout" onClick={handleCheckout}>
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>

            {isCheckoutOpen && (
                <div className="merch-checkout-modal-overlay">
                    <div className="merch-checkout-modal" onClick={e => e.stopPropagation()}>
                        <header className="checkout-header">
                            <div className="checkout-step-info">
                                <h2>Checkout</h2>
                                <div className="step-indicator">Step {checkoutStep} of 3</div>
                            </div>
                            <button className="checkout-close" onClick={() => !isProcessingOrder && setIsCheckoutOpen(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </header>

                        <div className="checkout-sections">
                            {checkoutStep === 1 && (
                                <div className="checkout-section fade-in">
                                    <h3>Confirm Your Details</h3>
                                    <div className="details-confirm-grid">
                                        <div className="detail-item">
                                            <label>First Name</label>
                                            <input type="text" value={profile?.firstName || ''} readOnly />
                                        </div>
                                        <div className="detail-item">
                                            <label>Last Name</label>
                                            <input type="text" value={profile?.lastName || ''} readOnly />
                                        </div>
                                        <div className="detail-item">
                                            <label>Email Address</label>
                                            <input type="email" value={user?.email || ''} readOnly />
                                        </div>
                                        <div className="detail-item">
                                            <label>Phone Number</label>
                                            <input type="text" value={profile?.mobile || ''} readOnly />
                                        </div>
                                        <div className="detail-item">
                                            <label>Orbit ID</label>
                                            <input type="text" value={profile?.orbitId || ''} readOnly />
                                        </div>
                                        <div className="detail-item">
                                            <label>College</label>
                                            <input type="text" value={profile?.collegeName || 'N/A'} title={profile?.collegeName} readOnly />
                                        </div>
                                    </div>
                                    <p className="details-help-text">These details are fetched from your profile. If they are incorrect, please update your profile settings.</p>
                                </div>
                            )}

                            {checkoutStep === 2 && (
                                <div className="checkout-section fade-in">
                                    <h3>Delivery Preference</h3>
                                    <div className="delivery-option-card">
                                        <label className="checkbox-container">
                                            <input
                                                type="checkbox"
                                                checked={wantsHomeDelivery}
                                                onChange={(e) => setWantsHomeDelivery(e.target.checked)}
                                            />
                                            <span className="checkbox-checkmark"></span>
                                            <span className="checkbox-label">Would you like this to be delivered to your home?</span>
                                        </label>
                                    </div>

                                    {wantsHomeDelivery ? (
                                        <div className="address-form fade-in">
                                            <h3>Shipping Address</h3>
                                            <input
                                                type="text"
                                                placeholder="House No., Street Name *"
                                                value={deliveryAddress.line1}
                                                onChange={e => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="Apartment, suite, etc. (optional)"
                                                value={deliveryAddress.line2}
                                                onChange={e => setDeliveryAddress({ ...deliveryAddress, line2: e.target.value })}
                                            />
                                            <div className="form-row">
                                                <input
                                                    type="text"
                                                    placeholder="City *"
                                                    value={deliveryAddress.city}
                                                    onChange={e => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Pincode *"
                                                    value={deliveryAddress.pincode}
                                                    onChange={e => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="State *"
                                                value={deliveryAddress.state}
                                                onChange={e => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div className="pickup-instruction fade-in">
                                            <p>If no shipping address is provided then you have to collect your order from <a href="https://maps.app.goo.gl/zr4Yg3uhrYabnjH49" target="_blank" rel="noopener noreferrer" className="college-map-link">Zeal College of Engineering and Research, Pune</a></p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {checkoutStep === 3 && (
                                <div className="checkout-section fade-in">
                                    <h3>Order Summary</h3>
                                    <div className="checkout-summary">
                                        <div className="summary-row">
                                            <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                                            <span>₹{cartTotal}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>Delivery Charge</span>
                                            <span>₹{(wantsHomeDelivery && !isZealStudent) ? DELIVERY_CHARGE : 0}</span>
                                        </div>
                                        <div className="summary-row total">
                                            <span>Total Amount</span>
                                            <span>₹{cartTotal + ((wantsHomeDelivery && !isZealStudent) ? DELIVERY_CHARGE : 0)}</span>
                                        </div>
                                    </div>
                                    <div className="order-items-preview">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="preview-item">
                                                <img src={item.product.images[0]} alt={item.product.name} />
                                                <div className="preview-details">
                                                    <span className="preview-name">{item.product.name}</span>
                                                    <span className="preview-meta">Size: {item.size} • Qty: {item.quantity}</span>
                                                </div>
                                                <div className="preview-actions">
                                                    <span className="preview-price">₹{item.product.price * item.quantity}</span>
                                                    <button
                                                        className="merch-cart-item__remove"
                                                        onClick={() => removeFromCart(idx)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="checkout-footer">
                            <div className="footer-actions">
                                {checkoutStep > 1 && (
                                    <button
                                        className="checkout-back-btn"
                                        onClick={() => setCheckoutStep(s => s - 1)}
                                        disabled={isProcessingOrder}
                                    >
                                        Back
                                    </button>
                                )}
                                {checkoutStep < 3 ? (
                                    <button
                                        className="checkout-next-btn"
                                        onClick={() => {
                                            if (checkoutStep === 2 && wantsHomeDelivery) {
                                                if (!deliveryAddress.line1 || !deliveryAddress.city || !deliveryAddress.pincode || !deliveryAddress.state) {
                                                    showToast('Please fill all required address fields', 'info');
                                                    return;
                                                }
                                            }
                                            setCheckoutStep(s => s + 1);
                                        }}
                                    >
                                        Continue
                                    </button>
                                ) : (
                                    <button
                                        className="process-order-btn"
                                        onClick={processOrder}
                                        disabled={isProcessingOrder}
                                    >
                                        {isProcessingOrder ? 'Processing...' : `Place Order • ₹${cartTotal + ((wantsHomeDelivery && !isZealStudent) ? DELIVERY_CHARGE : 0)}`}
                                    </button>
                                )}
                            </div>
                        </footer>
                    </div>
                </div>
            )}

            {isCartOpen && <div className="merch-cart-overlay" onClick={() => setIsCartOpen(false)} />}


            <Footer />
        </>
    );
}
