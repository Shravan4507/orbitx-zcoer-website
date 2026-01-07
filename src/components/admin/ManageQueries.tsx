import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../toast/Toast';
import { ADMIN_PERMISSIONS } from '../../types/user';
import Footer from '../layout/Footer';
import './ManageQueries.css';

interface Message {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    userHash: string;
    deviceId: string;
    queryId: number;
    createdAt: any;
    status: 'unread' | 'read' | 'replied';
}

interface UserGroup {
    userHash: string;
    name: string;
    email: string;
    deviceId: string;
    messages: Message[];
    lastMessageAt: any;
}

export default function ManageQueries() {
    const navigate = useNavigate();
    const { isAdmin, hasPermission } = useAuth();
    const { showToast } = useToast();
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    // Check permission
    const canManageQueries = isAdmin && hasPermission(ADMIN_PERMISSIONS.MANAGE_QUERIES || 'manage_queries');

    useEffect(() => {
        if (!canManageQueries) {
            navigate('/user-dashboard');
            return;
        }

        const q = query(
            collection(db, 'contactMessages'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];

            // Group by userHash
            const groups: { [key: string]: UserGroup } = {};
            msgs.forEach(msg => {
                if (!groups[msg.userHash]) {
                    groups[msg.userHash] = {
                        userHash: msg.userHash,
                        name: msg.name,
                        email: msg.email,
                        deviceId: msg.deviceId,
                        messages: [],
                        lastMessageAt: msg.createdAt
                    };
                }
                groups[msg.userHash].messages.push(msg);
            });

            const sortedGroups = Object.values(groups).sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis() || 0;
                const timeB = b.lastMessageAt?.toMillis() || 0;
                return timeB - timeA;
            });

            setUserGroups(sortedGroups);
            setIsLoading(false);
        }, (error) => {
            console.error('Error fetching queries:', error);
            showToast('Failed to load queries', 'error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [canManageQueries, navigate, showToast]);

    const markAsRead = async (msgId: string) => {
        try {
            await updateDoc(doc(db, 'contactMessages', msgId), { status: 'read' });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteMessage = async (msgId: string) => {
        if (!confirm('Are you sure you want to delete this specific message?')) return;
        try {
            await deleteDoc(doc(db, 'contactMessages', msgId));
            showToast('Message deleted', 'success');
        } catch (error) {
            console.error('Error deleting message:', error);
            showToast('Failed to delete message', 'error');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const group = userGroups.find(g => g.userHash === activeGroup);

    return (
        <>
            <main className="manage-queries">
                <header className="queries-header">
                    <h1>User Queries</h1>
                    <p>Manage and respond to contact submissions</p>
                </header>

                <div className="queries-container">
                    {/* User Sidebar */}
                    <aside className="queries-sidebar">
                        <div className="sidebar-title">Conversations ({userGroups.length})</div>
                        {isLoading ? (
                            <div className="queries-loading">Loading...</div>
                        ) : (
                            <div className="user-list">
                                {userGroups.map(group => (
                                    <button
                                        key={group.userHash}
                                        className={`user-item ${activeGroup === group.userHash ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveGroup(group.userHash);
                                            // Interally mark all unread messages as read when opening? 
                                            // For now just open it.
                                        }}
                                    >
                                        <div className="user-info">
                                            <span className="user-name">{group.name}</span>
                                            <span className="user-email">{group.email}</span>
                                        </div>
                                        {group.messages.some(m => m.status === 'unread') && (
                                            <span className="unread-badge"></span>
                                        )}
                                    </button>
                                ))}
                                {userGroups.length === 0 && <div className="empty-state">No queries found</div>}
                            </div>
                        )}
                    </aside>

                    {/* Chat/Message View */}
                    <section className="queries-main">
                        {group ? (
                            <div className="group-detail">
                                <header className="detail-header">
                                    <div className="header-info">
                                        <h2>{group.name}</h2>
                                    </div>
                                    <a href={`mailto:${group.email}`} className="reply-button">
                                        Reply via Email
                                    </a>
                                </header>

                                <div className="messages-list">
                                    {group.messages.map(msg => (
                                        <div key={msg.id} className={`message-card ${msg.status}`}>
                                            <div className="card-header">
                                                <div className="card-actions">
                                                    {msg.status === 'unread' && (
                                                        <button onClick={() => markAsRead(msg.id)} className="action-btn read">
                                                            Mark Read
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteMessage(msg.id)} className="action-btn delete">
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="message-subject">Subject: {msg.subject}</div>
                                            <div className="message-content">
                                                {msg.message || <span className="no-message-text">(No message content)</span>}
                                            </div>
                                            <div className="message-footer">
                                                <span className="message-date">{formatDate(msg.createdAt)}</span>
                                                <span className={`status-tag ${msg.status}`}>{msg.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="select-prompt">
                                <div className="prompt-content">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M7 8h10M7 12h10M7 16h10M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    </svg>
                                    <p>Select a conversation to view queries</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
        </>
    );
}
