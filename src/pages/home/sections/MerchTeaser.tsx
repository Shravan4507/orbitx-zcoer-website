import { useState, useRef, useEffect } from 'react';
import './MerchTeaser.css';

interface Product {
    id: number;
    name: string;
    price: string;
    description: string;
    images: string[];
}

const PRODUCTS: Product[] = [
    {
        id: 1,
        name: 'OrbitX Classic Tee',
        price: '₹599',
        description: 'Premium cotton t-shirt featuring the iconic OrbitX logo. Perfect for stargazing sessions and everyday wear.',
        images: [
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop'
        ]
    },
    {
        id: 2,
        name: 'Cosmic Hoodie',
        price: '₹1,299',
        description: 'Stay warm under the night sky with our cozy space-themed hoodie. Features constellation embroidery.',
        images: [
            'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=400&h=400&fit=crop'
        ]
    },
    {
        id: 3,
        name: 'Stellar Cap',
        price: '₹399',
        description: 'Embroidered cap with OrbitX branding. Adjustable strap for the perfect fit.',
        images: [
            'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=400&h=400&fit=crop'
        ]
    },
    {
        id: 4,
        name: 'Galaxy Mug',
        price: '₹349',
        description: 'Ceramic mug with a stunning galaxy print. Perfect for your morning coffee before a launch.',
        images: [
            'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=400&h=400&fit=crop'
        ]
    },
    {
        id: 5,
        name: 'Astronaut Stickers',
        price: '₹149',
        description: 'Pack of 10 vinyl stickers featuring space-themed designs. Waterproof and durable.',
        images: [
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553729784-e91953dec042?w=400&h=400&fit=crop'
        ]
    },
    {
        id: 6,
        name: 'Nebula Poster',
        price: '₹499',
        description: 'High-quality print of the Orion Nebula. Perfect for decorating your room or study.',
        images: [
            'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=400&fit=crop'
        ]
    }
];

export default function MerchTeaser() {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    const loopedProducts = [...PRODUCTS, ...PRODUCTS, ...PRODUCTS];

    useEffect(() => {
        if (selectedProduct) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedProduct]);

    useEffect(() => {
        const carousel = carouselRef.current;
        if (!carousel) return;

        const savedPosition = sessionStorage.getItem('merchCarouselPosition');
        const scrollWidth = carousel.scrollWidth / 3;

        if (savedPosition) {
            carousel.scrollLeft = parseFloat(savedPosition);
        } else {
            carousel.scrollLeft = scrollWidth;
        }

        const handleScroll = () => {
            const currentScrollWidth = carousel.scrollWidth / 3;
            if (carousel.scrollLeft < 10) {
                carousel.scrollLeft = currentScrollWidth + carousel.scrollLeft;
            } else if (carousel.scrollLeft >= currentScrollWidth * 2 - 10) {
                carousel.scrollLeft = carousel.scrollLeft - currentScrollWidth;
            }
            sessionStorage.setItem('merchCarouselPosition', String(carousel.scrollLeft));
        };

        carousel.addEventListener('scroll', handleScroll);
        return () => carousel.removeEventListener('scroll', handleScroll);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!carouselRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - carouselRef.current.offsetLeft);
        setScrollLeft(carouselRef.current.scrollLeft);
        carouselRef.current.style.cursor = 'grabbing';
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (carouselRef.current) {
            carouselRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !carouselRef.current) return;
        e.preventDefault();
        const x = e.pageX - carouselRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        carouselRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            setIsDragging(false);
            if (carouselRef.current) {
                carouselRef.current.style.cursor = 'grab';
            }
        }
    };

    const handleProductClick = (product: Product) => {
        if (isDragging) return;
        setSelectedProduct(product);
        setCurrentImageIndex(0);
        setIsClosing(false);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setSelectedProduct(null);
            setIsClosing(false);
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handlePrevImage = () => {
        if (selectedProduct) {
            setCurrentImageIndex((prev) =>
                prev === 0 ? selectedProduct.images.length - 1 : prev - 1
            );
        }
    };

    const handleNextImage = () => {
        if (selectedProduct) {
            setCurrentImageIndex((prev) =>
                prev === selectedProduct.images.length - 1 ? 0 : prev + 1
            );
        }
    };

    const scrollCarousel = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const scrollAmount = 320;
            carouselRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="merch-teaser">
            <div className="merch-teaser__header">
                <h2 className="merch-teaser__heading">OrbitX Merchandise</h2>
                <p className="merch-teaser__subheading">
                    Wear your passion. Support the mission.
                </p>
            </div>

            <div className="merch-teaser__carousel-wrapper">
                <button
                    className="merch-teaser__nav merch-teaser__nav--left"
                    onClick={() => scrollCarousel('left')}
                    aria-label="Scroll left"
                >
                    ←
                </button>

                <div
                    className={`merch-teaser__carousel ${isDragging ? 'merch-teaser__carousel--dragging' : ''}`}
                    ref={carouselRef}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {loopedProducts.map((product, index) => (
                        <div
                            key={`${product.id}-${index}`}
                            className="merch-teaser__card"
                            onClick={() => handleProductClick(product)}
                        >
                            <div className="merch-teaser__card-image">
                                <img src={product.images[0]} alt={product.name} draggable={false} />
                            </div>
                            <div className="merch-teaser__card-info">
                                <h3 className="merch-teaser__card-name">{product.name}</h3>
                                <span className="merch-teaser__card-price">{product.price}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    className="merch-teaser__nav merch-teaser__nav--right"
                    onClick={() => scrollCarousel('right')}
                    aria-label="Scroll right"
                >
                    →
                </button>
            </div>

            {selectedProduct && (
                <div
                    className={`merch-teaser__overlay ${isClosing ? 'merch-teaser__overlay--closing' : ''}`}
                    onClick={handleBackdropClick}
                >
                    <div className={`merch-teaser__modal ${isClosing ? 'merch-teaser__modal--closing' : ''}`}>
                        <button className="merch-teaser__modal-close" onClick={handleClose}>
                            ×
                        </button>

                        <div className="merch-teaser__modal-content">
                            <div className="merch-teaser__modal-gallery">
                                <button
                                    className="merch-teaser__gallery-nav merch-teaser__gallery-nav--prev"
                                    onClick={handlePrevImage}
                                >
                                    ‹
                                </button>
                                <div className="merch-teaser__gallery-image">
                                    <img
                                        src={selectedProduct.images[currentImageIndex]}
                                        alt={selectedProduct.name}
                                    />
                                </div>
                                <button
                                    className="merch-teaser__gallery-nav merch-teaser__gallery-nav--next"
                                    onClick={handleNextImage}
                                >
                                    ›
                                </button>
                                <div className="merch-teaser__gallery-dots">
                                    {selectedProduct.images.map((_, idx) => (
                                        <span
                                            key={idx}
                                            className={`merch-teaser__gallery-dot ${idx === currentImageIndex ? 'merch-teaser__gallery-dot--active' : ''}`}
                                            onClick={() => setCurrentImageIndex(idx)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="merch-teaser__modal-details">
                                <h3 className="merch-teaser__modal-name">{selectedProduct.name}</h3>
                                <span className="merch-teaser__modal-price">{selectedProduct.price}</span>
                                <p className="merch-teaser__modal-description">{selectedProduct.description}</p>

                                <div className="merch-teaser__modal-actions">
                                    <button className="merch-teaser__btn merch-teaser__btn--primary">
                                        Buy Now
                                    </button>
                                    <a href="#merch" className="merch-teaser__btn merch-teaser__btn--secondary">
                                        View All Products
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
