import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../toast/Toast';
import { ADMIN_PERMISSIONS } from '../../types/user';
import { SelectDropdown } from '../ui';
import Footer from '../layout/Footer';
import * as XLSX from 'xlsx';
import './ApplicationsManager.css';

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
    remark?: string;
    submittedAt: string;
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
}

export default function ApplicationsManager() {
    const navigate = useNavigate();
    const { isAdmin, hasPermission } = useAuth();
    const { showToast } = useToast();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [remark, setRemark] = useState<string>('');
    const remarkRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea based on content
    const handleRemarkChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRemark(e.target.value);
        // Reset height to auto to get the correct scrollHeight
        e.target.style.height = 'auto';
        // Set height to scrollHeight to expand with content
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    // Check permission
    const canManageApplications = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_APPLICATIONS);

    useEffect(() => {
        if (!canManageApplications) {
            navigate('/user-dashboard');
            return;
        }

        // Listen to applications collection
        const q = query(
            collection(db, 'applications'),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Application[];
            setApplications(apps);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching applications:', error);
            showToast('Failed to load applications', 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [canManageApplications, navigate, showToast]);

    const updateStatus = async (appId: string, status: Application['status']) => {
        try {
            const updateData: { status: string; remark?: string } = { status };
            // Include remark when rejecting
            if (status === 'rejected' && remark.trim()) {
                updateData.remark = remark.trim();
            }
            await updateDoc(doc(db, 'applications', appId), updateData);
            showToast(`Application ${status}`, 'success');
            setRemark(''); // Clear remark after action
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Failed to update status', 'error');
        }
    };

    const deleteApplication = async (appId: string) => {
        if (!confirm('Are you sure you want to delete this application?')) return;
        try {
            await deleteDoc(doc(db, 'applications', appId));
            showToast('Application deleted', 'success');
            setSelectedApplication(null);
        } catch (error) {
            console.error('Error deleting application:', error);
            showToast('Failed to delete application', 'error');
        }
    };

    const filteredApplications = applications.filter(app =>
        filterStatus === 'all' || app.status === filterStatus
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToExcel = () => {
        const dataToExport = filteredApplications.map((app, index) => ({
            'Sr. No.': index + 1,
            'Application ID': app.applicationId || 'N/A',
            'First Name': app.firstName,
            'Last Name': app.lastName,
            'Email': app.email,
            'Phone': app.phone,
            'WhatsApp': app.whatsapp || app.phone,
            'College': app.college,
            'Course': app.course,
            'Year': app.year,
            'Interests': app.interests?.join(', ') || '',
            'Why Join': app.whyJoin,
            'Experience': app.experience || '',
            'Status': app.status.charAt(0).toUpperCase() + app.status.slice(1),
            'Remark': app.remark || '',
            'Submitted At': formatDate(app.submittedAt)
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');

        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        const filename = `OrbitX_Applications_${filterStatus === 'all' ? 'All' : filterStatus}_${date}.xlsx`;

        XLSX.writeFile(workbook, filename);
        showToast(`Exported ${filteredApplications.length} applications`, 'success');
    };

    const getStatusColor = (status: Application['status']) => {
        switch (status) {
            case 'pending': return 'status--pending';
            case 'reviewed': return 'status--reviewed';
            case 'accepted': return 'status--accepted';
            case 'rejected': return 'status--rejected';
            default: return '';
        }
    };

    if (!canManageApplications) {
        return null;
    }

    return (
        <>
            <main className="applications-page">
                <section className="applications-header">
                    <h1 className="applications-title">Join Applications</h1>
                    <p className="applications-subtitle">
                        Review and manage membership applications
                    </p>
                </section>

                <section className="applications-toolbar">
                    <div className="applications-stats">
                        <span className="stat">
                            <strong>{applications.length}</strong> Total
                        </span>
                        <span className="stat stat--pending">
                            <strong>{applications.filter(a => a.status === 'pending').length}</strong> Pending
                        </span>
                        <span className="stat stat--accepted">
                            <strong>{applications.filter(a => a.status === 'accepted').length}</strong> Accepted
                        </span>
                    </div>
                    <div className="applications-actions">
                        <SelectDropdown
                            className="applications-filter"
                            value={filterStatus}
                            onChange={(value) => setFilterStatus(value)}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'reviewed', label: 'Reviewed' },
                                { value: 'accepted', label: 'Accepted' },
                                { value: 'rejected', label: 'Rejected' }
                            ]}
                        />
                        <button
                            className="applications-export"
                            onClick={exportToExcel}
                            disabled={filteredApplications.length === 0}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Export Excel
                        </button>
                    </div>
                </section>

                <section className="applications-content">
                    {isLoading ? (
                        <div className="applications-loading">Loading applications...</div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="applications-empty">
                            <p>No applications found</p>
                        </div>
                    ) : (
                        <div className="applications-list">
                            {filteredApplications.map(app => (
                                <div
                                    key={app.id}
                                    className={`application-card ${selectedApplication?.id === app.id ? 'application-card--selected' : ''}`}
                                    onClick={() => setSelectedApplication(app)}
                                >
                                    <div className="application-card__header">
                                        <h3 className="application-card__name">
                                            {app.firstName} {app.lastName}
                                        </h3>
                                        <span className={`application-card__status ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </span>
                                    </div>
                                    <p className="application-card__email">{app.email}</p>
                                    <p className="application-card__college">{app.college}</p>
                                    <p className="application-card__date">{formatDate(app.submittedAt)}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedApplication && (
                        <div className="application-detail">
                            <div className="application-detail__header">
                                <h2>{selectedApplication.firstName} {selectedApplication.lastName}</h2>
                                <button
                                    className="application-detail__close"
                                    onClick={() => setSelectedApplication(null)}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="application-detail__content">
                                <div className="detail-group">
                                    <label>Email</label>
                                    <p>{selectedApplication.email}</p>
                                </div>
                                <div className="detail-group">
                                    <label>Phone</label>
                                    <p>{selectedApplication.phone}</p>
                                </div>
                                <div className="detail-group">
                                    <label>College</label>
                                    <p>{selectedApplication.college}</p>
                                </div>
                                <div className="detail-group">
                                    <label>Course & Year</label>
                                    <p>{selectedApplication.course} - {selectedApplication.year}</p>
                                </div>
                                <div className="detail-group">
                                    <label>Interests</label>
                                    <div className="detail-tags">
                                        {selectedApplication.interests?.map((interest, i) => (
                                            <span key={i} className="detail-tag">{interest}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="detail-group">
                                    <label>Why do you want to join?</label>
                                    <p>{selectedApplication.whyJoin}</p>
                                </div>
                                <div className="detail-group">
                                    <label>Previous Experience</label>
                                    <p>{selectedApplication.experience || 'Not provided'}</p>
                                </div>
                                <div className="detail-group">
                                    <label>Submitted</label>
                                    <p>{formatDate(selectedApplication.submittedAt)}</p>
                                </div>
                            </div>

                            <div className="application-detail__actions">
                                <button
                                    className="action-btn action-btn--accept"
                                    onClick={() => updateStatus(selectedApplication.id, 'accepted')}
                                >
                                    Accept
                                </button>
                                <button
                                    className="action-btn action-btn--reject"
                                    onClick={() => updateStatus(selectedApplication.id, 'rejected')}
                                >
                                    Reject
                                </button>
                                <button
                                    className="action-btn action-btn--delete"
                                    onClick={() => deleteApplication(selectedApplication.id)}
                                >
                                    Delete
                                </button>
                            </div>
                            <textarea
                                ref={remarkRef}
                                className="action-remark"
                                placeholder="Remark for rejection (optional)"
                                value={remark}
                                onChange={handleRemarkChange}
                                rows={1}
                            />
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    );
}
