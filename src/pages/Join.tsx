import { useState, useEffect, type FormEvent } from 'react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import './Join.css';
import Footer from '../components/layout/Footer';
import { useToast } from '../components/toast/Toast';
import { SelectDropdown } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

// Team-based interest options (excluding Leadership)
const INTEREST_OPTIONS = [
    'Technical Team',
    'Design & Innovation Team',
    'Public Outreach Team',
    'Documentation Team',
    'Social Media & Editing Team',
    'Management & Operations Team',
    'Not sure yet'
];

const DEPARTMENT_OPTIONS = [
    'Computer Engineering',
    'Mechanical Engineering',
    'Electronics Engineering',
    'Civil Engineering',
    'Information Technology',
    'Other'
];

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

interface Application {
    id: string;
    applicationId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp?: string;
    college: string;
    course: string;
    year: string;
    interests: string[];
    whyJoin: string;
    experience: string;
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
    remark?: string;
    submittedAt: string;
}

// Generate unique application ID: 3 random alphanumeric + last 2 digits of phone
function generateApplicationId(phone: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 3; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const phoneSuffix = phone.slice(-2).padStart(2, '0');
    return randomPart + phoneSuffix;
}

export default function Join() {
    const { showToast } = useToast();
    const { user, profile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [applications, setApplications] = useState<Application[]>([]);
    const [isReapplying, setIsReapplying] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        college: '',
        department: '',
        year: '',
        interests: [] as string[],
        whyJoin: '',
        experience: ''
    });

    // Get the latest (active) application
    const latestApplication = applications[0];
    const hasActiveApplication = latestApplication &&
        (latestApplication.status === 'pending' || latestApplication.status === 'reviewed' || latestApplication.status === 'accepted');
    const canReapply = latestApplication?.status === 'rejected';
    const isReadOnly = hasActiveApplication && !isReapplying;

    // Fetch user's applications on mount
    useEffect(() => {
        if (!user?.email) {
            setIsLoading(false);
            return;
        }

        // Simple query by email only (no composite index needed)
        const q = query(
            collection(db, 'applications'),
            where('email', '==', user.email.toLowerCase())
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const apps = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as Application[];

            // Auto-delete rejected applications older than 20 days
            const DAYS_TO_EXPIRE = 20;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() - DAYS_TO_EXPIRE);

            const appsToKeep: Application[] = [];
            for (const app of apps) {
                if (app.status === 'rejected' && new Date(app.submittedAt) < expiryDate) {
                    // Delete expired rejected application
                    try {
                        await deleteDoc(doc(db, 'applications', app.id));
                        console.log(`Deleted expired rejected application: ${app.applicationId}`);
                    } catch (error) {
                        console.error('Error deleting expired application:', error);
                        appsToKeep.push(app); // Keep if delete fails
                    }
                } else {
                    appsToKeep.push(app);
                }
            }

            // Sort client-side by submittedAt descending
            appsToKeep.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

            setApplications(appsToKeep);

            // Pre-fill form with latest application data if exists
            if (appsToKeep.length > 0) {
                const latest = appsToKeep[0];
                setFormData({
                    firstName: latest.firstName || '',
                    lastName: latest.lastName || '',
                    email: latest.email || '',
                    phone: latest.phone || '',
                    whatsapp: latest.whatsapp || '',
                    college: latest.college || '',
                    department: latest.course || '',
                    year: latest.year || '',
                    interests: latest.interests || [],
                    whyJoin: latest.whyJoin || '',
                    experience: latest.experience || ''
                });
            } else if (profile) {
                // Pre-fill from user profile
                setFormData(prev => ({
                    ...prev,
                    firstName: profile.firstName || '',
                    lastName: profile.lastName || '',
                    email: user.email || ''
                }));
            }
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching applications:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, profile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (isReadOnly) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInterestToggle = (interest: string) => {
        if (isReadOnly && !isReapplying) return;
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleReapply = () => {
        setIsReapplying(true);
        // Keep personal info but clear editable fields for fresh input
        setFormData(prev => ({
            ...prev,
            interests: [],
            whyJoin: '',
            experience: ''
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Validation
        if (formData.interests.length === 0) {
            showToast('Please select at least one area of interest', 'error');
            return;
        }

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const applicationId = generateApplicationId(formData.phone);

            // Submit to Firestore
            await addDoc(collection(db, 'applications'), {
                applicationId,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),
                whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
                college: formData.college.trim(),
                course: formData.department,
                year: formData.year,
                interests: formData.interests,
                whyJoin: formData.whyJoin.trim(),
                experience: formData.experience.trim(),
                status: 'pending',
                remark: '',
                submittedAt: new Date().toISOString(),
                createdAt: serverTimestamp()
            });

            showToast('Application submitted successfully!', 'success');
            setIsReapplying(false);
        } catch (error) {
            console.error('Error submitting application:', error);
            showToast('Failed to submit application. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
            case 'reviewed':
                return 'Approval Pending';
            case 'accepted':
                return 'Approved';
            case 'rejected':
                return 'Application Rejected';
            default:
                return status;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'pending':
            case 'reviewed':
                return 'status--pending';
            case 'accepted':
                return 'status--approved';
            case 'rejected':
                return 'status--rejected';
            default:
                return '';
        }
    };

    if (isLoading) {
        return (
            <>
                <main className="join-page">
                    <div className="join-loading">Loading...</div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <main className="join-page">
                <section className="join-hero">
                    <h1 className="join-hero__title">Join OrbitX</h1>
                    <p className="join-hero__subtitle">
                        {latestApplication?.status === 'accepted'
                            ? 'Your application has been approved! You will be contacted for an interview soon.'
                            : latestApplication?.status === 'rejected'
                                ? 'Your previous application was not selected. You may re-apply below.'
                                : hasActiveApplication
                                    ? 'Your application is being reviewed. Thank you for your interest!'
                                    : 'Be part of our journey to explore the cosmos. Fill out the form below and take your first step towards the stars.'
                        }
                    </p>
                </section>

                {latestApplication?.status !== 'accepted' && (
                    <section className="join-form-container">
                        <form className={`join-form ${isReadOnly ? 'join-form--readonly' : ''}`} onSubmit={handleSubmit}>
                            <div className="join-form__row">
                                <div className="join-form__group">
                                    <label className="join-form__label">
                                        First Name <span className="join-form__required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        className="join-form__input join-form__input--locked"
                                        placeholder="Enter your first name"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                        readOnly
                                    />
                                </div>

                                <div className="join-form__group">
                                    <label className="join-form__label">
                                        Last Name <span className="join-form__required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        className="join-form__input join-form__input--locked"
                                        placeholder="Enter your last name"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="join-form__group">
                                <label className="join-form__label">
                                    Email <span className="join-form__required">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    className="join-form__input join-form__input--locked"
                                    placeholder="Enter your email address"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    readOnly
                                />
                            </div>

                            <div className="join-form__row">
                                <div className="join-form__group">
                                    <label className="join-form__label">
                                        Phone Number <span className="join-form__required">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="join-form__input"
                                        placeholder="Enter your phone number"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        readOnly={isReadOnly || isReapplying}
                                    />
                                </div>
                                <div className="join-form__group">
                                    <label className="join-form__label">
                                        WhatsApp Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="whatsapp"
                                        className="join-form__input"
                                        placeholder="WhatsApp number (if different)"
                                        value={formData.whatsapp}
                                        onChange={handleInputChange}
                                        readOnly={isReadOnly || isReapplying}
                                    />
                                </div>
                            </div>

                            <div className="join-form__group">
                                <label className="join-form__label">
                                    College/University <span className="join-form__required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="college"
                                    className="join-form__input"
                                    placeholder="Enter your college or university name"
                                    value={formData.college}
                                    onChange={handleInputChange}
                                    required
                                    readOnly={isReadOnly || isReapplying}
                                />
                            </div>

                            <div className="join-form__row">
                                <div className="join-form__group">
                                    <label className="join-form__label">
                                        Department <span className="join-form__required">*</span>
                                    </label>
                                    {isReadOnly || isReapplying ? (
                                        <input
                                            type="text"
                                            className="join-form__input"
                                            value={formData.department}
                                            readOnly
                                        />
                                    ) : (
                                        <SelectDropdown
                                            options={DEPARTMENT_OPTIONS.map(dept => ({ value: dept, label: dept }))}
                                            value={formData.department}
                                            onChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                                            placeholder="Select department"
                                            required
                                        />
                                    )}
                                </div>

                                <div className="join-form__group">
                                    <label className="join-form__label">
                                        Year <span className="join-form__required">*</span>
                                    </label>
                                    {isReadOnly || isReapplying ? (
                                        <input
                                            type="text"
                                            className="join-form__input"
                                            value={formData.year}
                                            readOnly
                                        />
                                    ) : (
                                        <SelectDropdown
                                            options={YEAR_OPTIONS.map(year => ({ value: year, label: year }))}
                                            value={formData.year}
                                            onChange={(value) => setFormData(prev => ({ ...prev, year: value }))}
                                            placeholder="Select year"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="join-form__group">
                                <label className="join-form__label">
                                    Areas of Interest <span className="join-form__required">*</span>
                                    <span className="join-form__hint">Select all teams you'd like to be part of</span>
                                </label>
                                <div className="join-form__interests">
                                    {INTEREST_OPTIONS.map(interest => (
                                        <button
                                            key={interest}
                                            type="button"
                                            className={`join-form__interest-btn ${formData.interests.includes(interest) ? 'join-form__interest-btn--active' : ''} ${isReadOnly && !isReapplying ? 'join-form__interest-btn--disabled' : ''}`}
                                            onClick={() => handleInterestToggle(interest)}
                                            disabled={isReadOnly && !isReapplying}
                                        >
                                            {interest}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="join-form__group">
                                <label className="join-form__label">
                                    Why do you want to join OrbitX? <span className="join-form__required">*</span>
                                </label>
                                <textarea
                                    name="whyJoin"
                                    className="join-form__textarea"
                                    placeholder="Tell us about your motivation and what excites you about space..."
                                    value={formData.whyJoin}
                                    onChange={handleInputChange}
                                    rows={4}
                                    required
                                    readOnly={isReadOnly && !isReapplying}
                                />
                            </div>

                            <div className="join-form__group">
                                <label className="join-form__label">Prior Experience</label>
                                <textarea
                                    name="experience"
                                    className="join-form__textarea"
                                    placeholder="Any relevant experience, projects, or skills? (Optional)"
                                    value={formData.experience}
                                    onChange={handleInputChange}
                                    rows={3}
                                    readOnly={isReadOnly && !isReapplying}
                                />
                            </div>

                            {(!hasActiveApplication || isReapplying) && (
                                <button
                                    type="submit"
                                    className="join-form__submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : isReapplying ? 'Submit Re-Application' : 'Submit Application'}
                                </button>
                            )}
                        </form>
                    </section>
                )}

                {/* Applications History */}
                {applications.length > 0 && (
                    <section className="join-history">
                        <h2 className="join-history__title">Application History</h2>
                        <div className="join-history__table-wrapper">
                            <table className="join-history__table">
                                <thead>
                                    <tr>
                                        <th>Sr. No.</th>
                                        <th>Application ID</th>
                                        <th>Remark</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applications.map((app, index) => (
                                        <tr
                                            key={app.id}
                                            className={`join-history__row ${index > 0 ? 'join-history__row--past' : ''}`}
                                        >
                                            <td>{applications.length - index}</td>
                                            <td className="join-history__app-id">{app.applicationId || 'N/A'}</td>
                                            <td className="join-history__remark">{app.remark || '-'}</td>
                                            <td>
                                                <span className={`join-history__status ${getStatusClass(app.status)}`}>
                                                    {getStatusLabel(app.status)}
                                                </span>
                                            </td>
                                            <td>
                                                {index === 0 && canReapply && !isReapplying ? (
                                                    <button
                                                        className="join-history__action-btn"
                                                        onClick={handleReapply}
                                                    >
                                                        Re-Apply
                                                    </button>
                                                ) : (
                                                    <span className="join-history__no-action">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>
            <Footer />
        </>
    );
}
