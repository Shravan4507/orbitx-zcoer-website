import { useState, type FormEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useToast } from '../components/toast/Toast';
import Footer from '../components/layout/Footer';
import './Contact.css';

// FAQ Data
const FAQ_DATA = [
    {
        question: "How can I join OrbitX?",
        answer: "You can apply to join OrbitX by visiting our Join page and filling out the application form. We review applications regularly and will contact you if your application is approved."
    },
    {
        question: "What activities does OrbitX organize?",
        answer: "OrbitX organizes various activities including stargazing sessions, astronomy workshops, guest lectures, telescope building workshops, and participation in national/international astronomy events."
    },
    {
        question: "Do I need prior astronomy knowledge to join?",
        answer: "No prior knowledge is required! We welcome anyone with a passion for space and astronomy. We provide learning resources and mentorship to help you grow."
    },
    {
        question: "How often do you conduct events?",
        answer: "We conduct regular weekly meetings and monthly stargazing sessions. Special events and workshops are organized throughout the academic year."
    },
    {
        question: "Can I volunteer for OrbitX events?",
        answer: "Yes! We're always looking for enthusiastic volunteers. Members can volunteer for event organization, content creation, and outreach activities."
    }
];

export default function Contact() {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.name || !formData.email || !formData.subject) {
            showToast('Please fill in all mandatory fields (*)', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate stacking identifiers
            const nameKey = formData.name.trim().toLowerCase();
            const emailKey = formData.email.trim().toLowerCase();
            const userHash = btoa(`${nameKey}:${emailKey}`).substring(0, 12);

            // Get or generate device ID
            let deviceId = localStorage.getItem('orbitx_device_id');
            if (!deviceId) {
                deviceId = Math.random().toString(36).substring(2, 15);
                localStorage.setItem('orbitx_device_id', deviceId);
            }

            const queryId = Math.floor(100000 + Math.random() * 900000); // 6-digit random number

            await addDoc(collection(db, 'contactMessages'), {
                ...formData,
                userHash,
                deviceId,
                queryId,
                createdAt: serverTimestamp(),
                status: 'unread'
            });

            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleFaq = (index: number) => {
        setExpandedFaq(expandedFaq === index ? null : index);
    };

    return (
        <>
            <main className="contact-page">
                {/* Hero Section */}
                <section className="contact-hero">
                    <h1 className="contact-hero__title">Get in Touch</h1>
                    <p className="contact-hero__subtitle">
                        Have questions or want to collaborate? We'd love to hear from you.
                    </p>
                </section>

                {/* Contact Grid */}
                <section className="contact-grid">
                    {/* Contact Form */}
                    <div className="contact-form-wrapper">
                        <h2 className="contact-section-title">Send us a Message</h2>
                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="contact-form__group">
                                <label className="contact-form__label">Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="contact-form__input"
                                    placeholder="Your name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="contact-form__group">
                                <label className="contact-form__label">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="contact-form__input"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="contact-form__group">
                                <label className="contact-form__label">Subject *</label>
                                <select
                                    name="subject"
                                    className="contact-form__select"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select a subject</option>
                                    <option value="General Inquiry">General Inquiry</option>
                                    <option value="Membership">Membership</option>
                                    <option value="Events">Events & Workshops</option>
                                    <option value="Collaboration">Collaboration</option>
                                    <option value="Sponsorship">Sponsorship</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="contact-form__group">
                                <label className="contact-form__label">Message</label>
                                <textarea
                                    name="message"
                                    className="contact-form__textarea"
                                    placeholder="Write your message here..."
                                    rows={5}
                                    value={formData.message}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <button
                                type="submit"
                                className="contact-form__submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>

                    {/* Contact Info */}
                    <div className="contact-info-wrapper">
                        <h2 className="contact-section-title">Contact Information</h2>
                        <div className="contact-cards">
                            <a href="mailto:contact@orbitxzcoer.club" className="contact-card">
                                <div className="contact-card__icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                                <div className="contact-card__content">
                                    <h3>Email</h3>
                                    <p>contact@orbitxzcoer.club</p>
                                </div>
                            </a>

                            <a href="https://maps.app.goo.gl/zr4Yg3uhrYabnjH49" target="_blank" rel="noopener noreferrer" className="contact-card">
                                <div className="contact-card__icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                </div>
                                <div className="contact-card__content">
                                    <h3>Location</h3>
                                    <p>Dept. of Computer Engineering, Zeal College of Engineering and Research, Pune 411041</p>
                                </div>
                            </a>
                        </div>

                        {/* Social Links */}
                        <div className="contact-socials">
                            <h3 className="contact-socials__title">Follow Us</h3>
                            <div className="contact-socials__links">
                                <a href="https://www.instagram.com/orbitx_zcoer/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                    </svg>
                                </a>
                                <a href="https://www.linkedin.com/company/orbitx-zcoer/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                                        <rect x="2" y="9" width="4" height="12"></rect>
                                        <circle cx="4" cy="4" r="2"></circle>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Map Section */}
                <section className="contact-map-section">
                    <h2 className="contact-section-title">Find Us</h2>
                    <div className="contact-map">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2909.1004240421184!2d73.82559228870227!3d18.44842178988876!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2be933201c149%3A0x1c055d83993ff72b!2sZeal%20College%20of%20Engineering%20and%20Research!5e1!3m2!1sen!2sus!4v1766668761486!5m2!1sen!2sus"
                            width="100%"
                            height="400"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="OrbitX Location"
                        />
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="contact-faq-section">
                    <h2 className="contact-section-title">Frequently Asked Questions</h2>
                    <div className="contact-faq">
                        {FAQ_DATA.map((faq, index) => (
                            <div
                                key={index}
                                className={`faq-item ${expandedFaq === index ? 'faq-item--expanded' : ''}`}
                            >
                                <button
                                    className="faq-item__question"
                                    onClick={() => toggleFaq(index)}
                                >
                                    <span>{faq.question}</span>
                                    <svg
                                        className="faq-item__icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                                <div className="faq-item__answer">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
