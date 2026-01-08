/**
 * QR Scanner Admin Component - v2
 * 
 * Features:
 * - Camera selection (front/rear)
 * - Auto-mark attendance on valid scan
 * - Offline support with sync
 * - Volunteer management
 * - Modern UI with animations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../toast/Toast';
import {
    getEventsForScanning,
    downloadAndCacheRegistrations,
    verifyQrCode,
    markAttendance,
    syncPendingAttendance,
    getCachedRegistrationsForEvent,
    isCacheValid,
    getCacheMetadata,
    getAttendanceStats,
    initializeScannerService,
    type EventForScanning,
    type CachedRegistration,
    type ScanResult,
} from '../../services/scanner/scannerService';
import { getPendingSyncCount } from '../../services/scanner/scannerDb';
import {
    assignVolunteer,
    removeVolunteer,
    getVolunteersForEvent,
    type EventVolunteer,
} from '../../services/scanner/volunteerService';
import './QRScanner.css';

interface QRScannerProps {
    adminOrbitId: string;
    onClose?: () => void;
}

interface CameraDevice {
    id: string;
    label: string;
}

type ViewState = 'select-event' | 'event-dashboard' | 'scanning' | 'result';

export default function QRScanner({ adminOrbitId, onClose }: QRScannerProps) {
    const { showToast } = useToast();

    // State
    const [viewState, setViewState] = useState<ViewState>('select-event');
    const [events, setEvents] = useState<EventForScanning[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventForScanning | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Camera state
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    // Scanning state
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScannedName, setLastScannedName] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState({ total: 0, attended: 0 });
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Attendance overlay
    const [showAttendanceList, setShowAttendanceList] = useState(false);
    const [attendanceList, setAttendanceList] = useState<CachedRegistration[]>([]);
    const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'attended' | 'pending'>('all');
    const [attendanceSearch, setAttendanceSearch] = useState('');

    // Volunteer management
    const [volunteers, setVolunteers] = useState<EventVolunteer[]>([]);
    const [volunteerInput, setVolunteerInput] = useState('');
    const [isAssigningVolunteer, setIsAssigningVolunteer] = useState(false);

    // Scanner ref
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize and load events
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await initializeScannerService();
            const eventsList = await getEventsForScanning();
            setEvents(eventsList);
            setIsLoading(false);
        };
        init();
    }, []);

    // Get cameras on mount
    useEffect(() => {
        Html5Qrcode.getCameras().then((devices) => {
            const cams = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 8)}` }));
            setCameras(cams);
            // Prefer rear camera
            const rearCam = cams.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(rearCam?.id || cams[0]?.id || null);
        }).catch(err => {
            console.error('Camera access error:', err);
            showToast('Camera access denied', 'error');
        });
    }, [showToast]);

    // Online/offline listener
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncPendingAttendance().then(({ synced }) => {
                if (synced > 0) {
                    showToast(`Synced ${synced} records`, 'success');
                    updatePendingCount();
                }
            });
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [showToast]);

    // Update pending sync count
    const updatePendingCount = useCallback(async () => {
        const count = await getPendingSyncCount();
        setPendingSyncCount(count);
    }, []);

    // Update stats
    const updateStats = useCallback(async () => {
        if (selectedEvent) {
            const newStats = await getAttendanceStats(selectedEvent.id);
            setStats(newStats);
        }
    }, [selectedEvent]);

    // Handle event selection
    const handleSelectEvent = async (event: EventForScanning) => {
        setSelectedEvent(event);
        setViewState('event-dashboard');

        const vols = await getVolunteersForEvent(event.id);
        setVolunteers(vols);

        const isValid = await isCacheValid(event.id);
        if (isValid) {
            const meta = await getCacheMetadata(event.id);
            if (meta) {
                setStats({ total: meta.totalRegistrations, attended: 0 });
                await updateStats();
            }
        }
    };

    // Assign volunteer
    const handleAssignVolunteer = async () => {
        if (!selectedEvent || !volunteerInput.trim()) return;

        setIsAssigningVolunteer(true);
        const result = await assignVolunteer(
            selectedEvent.id,
            selectedEvent.title,
            selectedEvent.date,
            volunteerInput.trim(),
            adminOrbitId
        );
        setIsAssigningVolunteer(false);

        if (result.success && result.volunteer) {
            setVolunteers(prev => [...prev, result.volunteer!]);
            setVolunteerInput('');
            showToast('Volunteer assigned!', 'success');
        } else {
            showToast(result.error || 'Failed to assign', 'error');
        }
    };

    // Remove volunteer
    const handleRemoveVolunteer = async (volunteerId: string) => {
        const success = await removeVolunteer(volunteerId);
        if (success) {
            setVolunteers(prev => prev.filter(v => v.id !== volunteerId));
            showToast('Volunteer removed', 'info');
        }
    };

    // Start scanning
    const handleStartScanning = async () => {
        if (!selectedEvent) return;

        // Ensure cache exists
        const isValid = await isCacheValid(selectedEvent.id);
        if (!isValid) {
            setIsDownloading(true);
            const result = await downloadAndCacheRegistrations(selectedEvent.id, selectedEvent.title);
            setIsDownloading(false);

            if (!result.success) {
                showToast('Failed to download registrations', 'error');
                return;
            }
            showToast(`Downloaded ${result.count} registrations`, 'success');
        }

        await updateStats();
        await updatePendingCount();
        setViewState('scanning');
    };

    // Initialize camera scanner
    useEffect(() => {
        if (viewState === 'scanning' && selectedCameraId && !scannerRef.current) {
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            scanner.start(
                selectedCameraId,
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1.0,
                },
                async (decodedText) => {
                    if (isProcessing) return;
                    await handleScan(decodedText);
                },
                () => { } // Ignore scan errors
            ).then(() => {
                setIsCameraReady(true);
            }).catch(err => {
                console.error('Scanner start error:', err);
                showToast('Failed to start camera', 'error');
            });
        }

        return () => {
            if (autoResumeTimerRef.current) {
                clearTimeout(autoResumeTimerRef.current);
            }
        };
    }, [viewState, selectedCameraId, isProcessing]);

    // Cleanup scanner on unmount or view change
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
                scannerRef.current = null;
            }
        };
    }, [viewState]);

    // Handle QR scan - AUTO MARK ATTENDANCE
    const handleScan = async (qrData: string) => {
        if (!selectedEvent || isProcessing) return;

        setIsProcessing(true);

        // Pause scanner
        if (scannerRef.current) {
            await scannerRef.current.pause(true);
        }

        // Verify QR
        const result = await verifyQrCode(qrData, selectedEvent.id);
        setScanResult(result);
        setViewState('result');

        // AUTO-MARK if valid
        if (result.status === 'valid' && result.registration) {
            const markResult = await markAttendance(result.registration.qrSignature, adminOrbitId);

            if (markResult.success) {
                // Vibrate for feedback
                if (navigator.vibrate) navigator.vibrate(100);

                setLastScannedName(`${result.registration.firstName} ${result.registration.lastName}`);
                await updateStats();
                await updatePendingCount();

                // Update result to show marked
                setScanResult({
                    ...result,
                    message: '✓ Attendance marked successfully!',
                });
            } else {
                setScanResult({
                    success: false,
                    status: 'error',
                    registration: result.registration,
                    message: 'Failed to mark attendance. Try again.',
                });
            }
        } else if (result.status === 'already-scanned') {
            // Vibrate warning
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }

        setIsProcessing(false);

        // Auto-resume after 2 seconds
        autoResumeTimerRef.current = setTimeout(() => {
            handleScanNext();
        }, 2500);
    };

    // Continue scanning
    const handleScanNext = () => {
        if (autoResumeTimerRef.current) {
            clearTimeout(autoResumeTimerRef.current);
        }
        setScanResult(null);
        setViewState('scanning');

        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    // Switch camera
    const handleSwitchCamera = async () => {
        if (cameras.length < 2) return;

        const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const newCameraId = cameras[nextIndex].id;

        if (scannerRef.current) {
            await scannerRef.current.stop();
            scannerRef.current = null;
        }

        setSelectedCameraId(newCameraId);
        setIsCameraReady(false);

        // Scanner will restart via useEffect
    };

    // Load attendance list
    const handleOpenAttendanceList = async () => {
        if (!selectedEvent) return;
        const list = await getCachedRegistrationsForEvent(selectedEvent.id);
        setAttendanceList(list);
        setShowAttendanceList(true);
    };

    // Filter attendance list
    const filteredAttendanceList = attendanceList.filter(reg => {
        if (attendanceFilter === 'attended' && !reg.attendanceMarked) return false;
        if (attendanceFilter === 'pending' && reg.attendanceMarked) return false;

        if (attendanceSearch) {
            const search = attendanceSearch.toLowerCase();
            return (
                reg.firstName.toLowerCase().includes(search) ||
                reg.lastName.toLowerCase().includes(search) ||
                reg.orbitId.toLowerCase().includes(search)
            );
        }
        return true;
    });

    // Back to event selection
    const handleBackToEvents = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => { });
            scannerRef.current = null;
        }
        setSelectedEvent(null);
        setScanResult(null);
        setViewState('select-event');
    };

    // Back to dashboard
    const handleBackToDashboard = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => { });
            scannerRef.current = null;
        }
        setScanResult(null);
        setViewState('event-dashboard');
    };

    return (
        <div className="qr-scanner">
            {/* Header */}
            <div className="qr-scanner__header">
                {viewState === 'event-dashboard' && (
                    <button className="qr-scanner__back-btn" onClick={handleBackToEvents}>←</button>
                )}
                {(viewState === 'scanning' || viewState === 'result') && (
                    <button className="qr-scanner__back-btn" onClick={handleBackToDashboard}>←</button>
                )}
                <h1 className="qr-scanner__title">
                    {viewState === 'select-event' ? 'Event Scanner' : selectedEvent?.title}
                </h1>
                <div className="qr-scanner__header-actions">
                    {(viewState === 'scanning' || viewState === 'result') && (
                        <button className="qr-scanner__icon-btn" onClick={handleOpenAttendanceList}>📋</button>
                    )}
                    {onClose && (
                        <button className="qr-scanner__icon-btn qr-scanner__close-btn" onClick={onClose}>×</button>
                    )}
                </div>
            </div>

            {/* Event Selection */}
            {viewState === 'select-event' && (
                <div className="qr-scanner__content">
                    <h2 className="qr-scanner__section-title">Select Event</h2>

                    {isLoading ? (
                        <div className="qr-scanner__loading">
                            <div className="qr-scanner__spinner"></div>
                            <p>Loading events...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="qr-scanner__empty">
                            <span className="qr-scanner__empty-icon">📅</span>
                            <p>No events with registrations found</p>
                        </div>
                    ) : (
                        <div className="qr-scanner__events-grid">
                            {events.map(event => (
                                <button
                                    key={event.id}
                                    className="qr-scanner__event-card"
                                    onClick={() => handleSelectEvent(event)}
                                >
                                    <span className="qr-scanner__event-title">{event.title}</span>
                                    <span className="qr-scanner__event-date">{event.date}</span>
                                    <span className="qr-scanner__event-count">{event.registrationCount} registered</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Event Dashboard */}
            {viewState === 'event-dashboard' && selectedEvent && (
                <div className="qr-scanner__content">
                    <div className="qr-scanner__event-hero">
                        <h2>{selectedEvent.title}</h2>
                        <p>{selectedEvent.date} • {selectedEvent.registrationCount} registered</p>
                    </div>

                    {/* Volunteer Section */}
                    <div className="qr-scanner__volunteers-card">
                        <h3>👥 Assign Volunteers</h3>
                        <div className="qr-scanner__volunteer-form">
                            <input
                                type="text"
                                placeholder="OrbitX ID (e.g., ORB-123-4567)"
                                value={volunteerInput}
                                onChange={(e) => setVolunteerInput(e.target.value)}
                                disabled={isAssigningVolunteer}
                            />
                            <button onClick={handleAssignVolunteer} disabled={isAssigningVolunteer || !volunteerInput.trim()}>
                                {isAssigningVolunteer ? '...' : 'Add'}
                            </button>
                        </div>

                        {volunteers.length > 0 && (
                            <div className="qr-scanner__volunteers-list">
                                {volunteers.map(v => (
                                    <div key={v.id} className="qr-scanner__volunteer-chip">
                                        <span>{v.volunteerName}</span>
                                        <button onClick={() => handleRemoveVolunteer(v.id)}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Start Scanning */}
                    <button
                        className="qr-scanner__start-btn"
                        onClick={handleStartScanning}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <>
                                <div className="qr-scanner__spinner qr-scanner__spinner--small"></div>
                                Loading...
                            </>
                        ) : (
                            <>📷 Start Scanning</>
                        )}
                    </button>

                    <button className="qr-scanner__secondary-btn" onClick={handleOpenAttendanceList}>
                        📋 View Attendance List
                    </button>
                </div>
            )}

            {/* Scanning View */}
            {viewState === 'scanning' && (
                <div className="qr-scanner__scanning-view">
                    {/* Camera viewport */}
                    <div className="qr-scanner__camera-container">
                        <div id="qr-reader" className="qr-scanner__camera"></div>

                        {!isCameraReady && (
                            <div className="qr-scanner__camera-loading">
                                <div className="qr-scanner__spinner"></div>
                                <p>Starting camera...</p>
                            </div>
                        )}

                        {/* Camera switch button */}
                        {cameras.length > 1 && (
                            <button className="qr-scanner__camera-switch" onClick={handleSwitchCamera}>
                                🔄
                            </button>
                        )}

                        {/* Scan frame overlay */}
                        <div className="qr-scanner__scan-frame"></div>
                    </div>

                    {/* Stats bar */}
                    <div className="qr-scanner__scan-stats">
                        <div className="qr-scanner__stat-item">
                            <span className="qr-scanner__stat-value">{stats.attended}</span>
                            <span className="qr-scanner__stat-label">/ {stats.total} Scanned</span>
                        </div>
                        <div className="qr-scanner__stat-item">
                            <span className={`qr-scanner__status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                            <span>{isOnline ? 'Online' : 'Offline'}</span>
                            {pendingSyncCount > 0 && (
                                <span className="qr-scanner__pending-badge">{pendingSyncCount}</span>
                            )}
                        </div>
                    </div>

                    {/* Last scanned */}
                    {lastScannedName && (
                        <div className="qr-scanner__last-scan">
                            ✓ Last: {lastScannedName}
                        </div>
                    )}
                </div>
            )}

            {/* Result View */}
            {viewState === 'result' && scanResult && (
                <div className={`qr-scanner__result-view qr-scanner__result--${scanResult.status}`}>
                    <div className="qr-scanner__result-card">
                        <div className="qr-scanner__result-icon">
                            {scanResult.status === 'valid' && '✓'}
                            {scanResult.status === 'already-scanned' && '⚠'}
                            {scanResult.status === 'invalid' && '✗'}
                            {scanResult.status === 'error' && '!'}
                        </div>

                        {scanResult.registration ? (
                            <div className="qr-scanner__result-info">
                                <h2>{scanResult.registration.firstName} {scanResult.registration.lastName}</h2>
                                <p className="qr-scanner__result-orbitid">{scanResult.registration.orbitId}</p>
                                <p className="qr-scanner__result-college">{scanResult.registration.collegeName}</p>
                            </div>
                        ) : (
                            <div className="qr-scanner__result-info">
                                <h2>{scanResult.status === 'invalid' ? 'Invalid QR Code' : 'Error'}</h2>
                            </div>
                        )}

                        <p className="qr-scanner__result-message">{scanResult.message}</p>

                        <button className="qr-scanner__scan-next-btn" onClick={handleScanNext}>
                            📷 Scan Next
                        </button>

                        <p className="qr-scanner__auto-continue">Auto-continuing in 2s...</p>
                    </div>
                </div>
            )}

            {/* Attendance List Overlay */}
            {showAttendanceList && (
                <div className="qr-scanner__overlay" onClick={() => setShowAttendanceList(false)}>
                    <div className="qr-scanner__attendance-panel" onClick={e => e.stopPropagation()}>
                        <div className="qr-scanner__panel-header">
                            <h2>Attendance</h2>
                            <button onClick={() => setShowAttendanceList(false)}>×</button>
                        </div>

                        <div className="qr-scanner__panel-filters">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={attendanceSearch}
                                onChange={(e) => setAttendanceSearch(e.target.value)}
                            />
                            <div className="qr-scanner__filter-tabs">
                                {(['all', 'attended', 'pending'] as const).map(filter => (
                                    <button
                                        key={filter}
                                        className={attendanceFilter === filter ? 'active' : ''}
                                        onClick={() => setAttendanceFilter(filter)}
                                    >
                                        {filter === 'all' ? 'All' : filter === 'attended' ? '✓' : '○'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="qr-scanner__panel-list">
                            {filteredAttendanceList.map(reg => (
                                <div
                                    key={reg.qrSignature}
                                    className={`qr-scanner__list-item ${reg.attendanceMarked ? 'checked' : ''}`}
                                >
                                    <span className="qr-scanner__list-status">
                                        {reg.attendanceMarked ? '✓' : '○'}
                                    </span>
                                    <div className="qr-scanner__list-info">
                                        <span className="qr-scanner__list-name">
                                            {reg.firstName} {reg.lastName}
                                        </span>
                                        <span className="qr-scanner__list-id">{reg.orbitId}</span>
                                    </div>
                                    <span className="qr-scanner__list-time">
                                        {reg.attendanceMarked && reg.markedAt
                                            ? new Date(reg.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                            : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="qr-scanner__panel-footer">
                            <span>{attendanceList.filter(r => r.attendanceMarked).length} / {attendanceList.length} checked in</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
