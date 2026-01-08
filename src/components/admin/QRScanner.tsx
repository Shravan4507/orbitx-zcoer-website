/**
 * QR Scanner Admin Component
 * 
 * Full-featured QR scanner for event check-in:
 * - Event selection with offline download
 * - Camera QR scanning
 * - Attendance marking
 * - Offline support with sync
 * - Attendance list overlay
 * - Volunteer management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
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

type ViewState = 'select-event' | 'event-dashboard' | 'scanning' | 'result';

export default function QRScanner({ adminOrbitId, onClose }: QRScannerProps) {
    const { showToast } = useToast();

    // State
    const [viewState, setViewState] = useState<ViewState>('select-event');
    const [events, setEvents] = useState<EventForScanning[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventForScanning | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Scanning state
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [lastScannedReg, setLastScannedReg] = useState<CachedRegistration | null>(null);
    const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);

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
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);

    // Initialize and load events
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await initializeScannerService();
                const eventsList = await getEventsForScanning();
                setEvents(eventsList);
            } catch (error) {
                console.error('Error loading events:', error);
                showToast('Failed to load events', 'error');
            }
            setIsLoading(false);
        };
        init();
    }, [showToast]);

    // Online/offline listener
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncPendingAttendance().then(({ synced }) => {
                if (synced > 0) {
                    showToast(`Synced ${synced} attendance records`, 'success');
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

    // Handle event selection - go to dashboard first
    const handleSelectEvent = async (event: EventForScanning) => {
        setSelectedEvent(event);
        setViewState('event-dashboard');

        // Load volunteers
        const vols = await getVolunteersForEvent(event.id);
        setVolunteers(vols);

        // Check cache status
        const isValid = await isCacheValid(event.id);
        if (isValid) {
            const meta = await getCacheMetadata(event.id);
            if (meta) {
                setStats({ total: meta.totalRegistrations, attended: 0 });
                await updateStats();
            }
        }
    };

    // Handle assign volunteer
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
            showToast('Volunteer assigned successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to assign volunteer', 'error');
        }
    };

    // Handle remove volunteer
    const handleRemoveVolunteer = async (volunteerId: string) => {
        const success = await removeVolunteer(volunteerId);
        if (success) {
            setVolunteers(prev => prev.filter(v => v.id !== volunteerId));
            showToast('Volunteer removed', 'info');
        } else {
            showToast('Failed to remove volunteer', 'error');
        }
    };

    // Start scanning (from dashboard)
    const handleStartScanning = async () => {
        if (!selectedEvent) return;

        // Check if we have valid cache
        const isValid = await isCacheValid(selectedEvent.id);
        if (!isValid) {
            // Download registrations
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

    // Initialize QR scanner
    useEffect(() => {
        if (viewState === 'scanning' && scannerContainerRef.current && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                'qr-reader',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                    rememberLastUsedCamera: true,
                },
                false
            );

            scanner.render(
                async (decodedText) => {
                    // Pause scanner while processing
                    scanner.pause();
                    await handleScan(decodedText);
                },
                (error) => {
                    // Ignore scan errors (no QR found)
                    console.debug('Scan error:', error);
                }
            );

            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [viewState]);

    // Handle QR scan
    const handleScan = async (qrData: string) => {
        if (!selectedEvent) return;

        const result = await verifyQrCode(qrData, selectedEvent.id);
        setScanResult(result);
        setViewState('result');

        if (result.registration) {
            setLastScannedReg(result.registration);
        }
    };

    // Mark attendance
    const handleMarkAttendance = async () => {
        if (!scanResult?.registration) return;

        setIsMarkingAttendance(true);
        const result = await markAttendance(scanResult.registration.qrSignature, adminOrbitId);
        setIsMarkingAttendance(false);

        if (result.success) {
            showToast('Attendance marked successfully!', 'success');
            setLastScannedReg(result.registration || null);
            await updateStats();
            await updatePendingCount();
        } else {
            showToast('Failed to mark attendance', 'error');
        }

        // Return to scanning
        handleScanNext();
    };

    // Continue to next scan
    const handleScanNext = () => {
        setScanResult(null);
        setViewState('scanning');
        if (scannerRef.current) {
            scannerRef.current.resume();
        }
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
        // Filter by status
        if (attendanceFilter === 'attended' && !reg.attendanceMarked) return false;
        if (attendanceFilter === 'pending' && reg.attendanceMarked) return false;

        // Filter by search
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
    const handleBackToEvents = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        setSelectedEvent(null);
        setScanResult(null);
        setViewState('select-event');
    };

    return (
        <div className="qr-scanner">
            {/* Header */}
            <div className="qr-scanner__header">
                {viewState !== 'select-event' && (
                    <button className="qr-scanner__back-btn" onClick={handleBackToEvents}>
                        ← Back
                    </button>
                )}
                <h1 className="qr-scanner__title">
                    {viewState === 'select-event' ? 'QR Scanner' : selectedEvent?.title}
                </h1>
                {viewState !== 'select-event' && (
                    <button className="qr-scanner__attendance-btn" onClick={handleOpenAttendanceList}>
                        📋
                    </button>
                )}
                {onClose && (
                    <button className="qr-scanner__close-btn" onClick={onClose}>×</button>
                )}
            </div>

            {/* Event Selection View */}
            {viewState === 'select-event' && (
                <div className="qr-scanner__select-event">
                    <h2>Select Event to Scan</h2>

                    {isLoading ? (
                        <div className="qr-scanner__loading">Loading events...</div>
                    ) : events.length === 0 ? (
                        <div className="qr-scanner__empty">
                            No events with registrations found.
                        </div>
                    ) : (
                        <div className="qr-scanner__events-list">
                            {events.map(event => (
                                <button
                                    key={event.id}
                                    className="qr-scanner__event-card"
                                    onClick={() => handleSelectEvent(event)}
                                    disabled={isDownloading}
                                >
                                    <div className="qr-scanner__event-info">
                                        <span className="qr-scanner__event-title">{event.title}</span>
                                        <span className="qr-scanner__event-date">{event.date}</span>
                                    </div>
                                    <div className="qr-scanner__event-count">
                                        {event.registrationCount} registered
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {isDownloading && (
                        <div className="qr-scanner__downloading">
                            <div className="qr-scanner__spinner"></div>
                            <span>Downloading registrations...</span>
                        </div>
                    )}
                </div>
            )}

            {/* Event Dashboard View */}
            {viewState === 'event-dashboard' && selectedEvent && (
                <div className="qr-scanner__dashboard">
                    <div className="qr-scanner__event-header">
                        <h2>{selectedEvent.title}</h2>
                        <p>{selectedEvent.date} • {selectedEvent.registrationCount} registered</p>
                    </div>

                    {/* Volunteer Management Section */}
                    <div className="qr-scanner__volunteers-section">
                        <h3>Assign Volunteers</h3>
                        <p className="qr-scanner__volunteers-hint">
                            Volunteers can scan QRs from their dashboard
                        </p>

                        <div className="qr-scanner__volunteer-input-row">
                            <input
                                type="text"
                                placeholder="Enter OrbitX ID (e.g., ORB-123-4567)"
                                value={volunteerInput}
                                onChange={(e) => setVolunteerInput(e.target.value)}
                                className="qr-scanner__volunteer-input"
                                disabled={isAssigningVolunteer}
                            />
                            <button
                                className="qr-scanner__volunteer-add-btn"
                                onClick={handleAssignVolunteer}
                                disabled={isAssigningVolunteer || !volunteerInput.trim()}
                            >
                                {isAssigningVolunteer ? '...' : 'Assign'}
                            </button>
                        </div>

                        {volunteers.length > 0 && (
                            <div className="qr-scanner__volunteers-list">
                                <h4>Active Volunteers ({volunteers.length})</h4>
                                {volunteers.map(vol => (
                                    <div key={vol.id} className="qr-scanner__volunteer-item">
                                        <div className="qr-scanner__volunteer-info">
                                            <span className="qr-scanner__volunteer-name">{vol.volunteerName}</span>
                                            <span className="qr-scanner__volunteer-orbitid">{vol.volunteerOrbitId}</span>
                                        </div>
                                        <button
                                            className="qr-scanner__volunteer-remove"
                                            onClick={() => handleRemoveVolunteer(vol.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="qr-scanner__dashboard-actions">
                        <button
                            className="qr-scanner__start-scan-btn"
                            onClick={handleStartScanning}
                            disabled={isDownloading}
                        >
                            {isDownloading ? 'Loading...' : '📷 Start Scanning'}
                        </button>
                        <button
                            className="qr-scanner__view-attendance-btn"
                            onClick={handleOpenAttendanceList}
                        >
                            📋 View Attendance
                        </button>
                    </div>

                    {isDownloading && (
                        <div className="qr-scanner__downloading">
                            <div className="qr-scanner__spinner"></div>
                            <span>Downloading registrations...</span>
                        </div>
                    )}
                </div>
            )}

            {/* Scanning View */}
            {viewState === 'scanning' && (
                <div className="qr-scanner__scanning">
                    <div
                        id="qr-reader"
                        ref={scannerContainerRef}
                        className="qr-scanner__reader"
                    ></div>

                    <div className="qr-scanner__stats-bar">
                        <div className="qr-scanner__stat">
                            <span className="qr-scanner__stat-label">Scanned:</span>
                            <span className="qr-scanner__stat-value">{stats.attended}/{stats.total}</span>
                        </div>
                        <div className="qr-scanner__stat">
                            <span className={`qr-scanner__sync-indicator ${isOnline ? 'online' : 'offline'}`}>
                                {isOnline ? '🟢' : '🔴'}
                            </span>
                            {pendingSyncCount > 0 && (
                                <span className="qr-scanner__pending-badge">
                                    {pendingSyncCount} pending
                                </span>
                            )}
                        </div>
                    </div>

                    {lastScannedReg && (
                        <div className="qr-scanner__last-scan">
                            Last: {lastScannedReg.firstName} {lastScannedReg.lastName} - {lastScannedReg.orbitId} ✓
                        </div>
                    )}
                </div>
            )}

            {/* Result View */}
            {viewState === 'result' && scanResult && (
                <div className={`qr-scanner__result qr-scanner__result--${scanResult.status}`}>
                    <div className="qr-scanner__result-icon">
                        {scanResult.status === 'valid' && '✓'}
                        {scanResult.status === 'already-scanned' && '⚠️'}
                        {scanResult.status === 'invalid' && '✗'}
                        {scanResult.status === 'error' && '!'}
                    </div>

                    {scanResult.registration ? (
                        <div className="qr-scanner__result-info">
                            <h2 className="qr-scanner__result-name">
                                {scanResult.registration.firstName} {scanResult.registration.lastName}
                            </h2>
                            <p className="qr-scanner__result-orbitid">{scanResult.registration.orbitId}</p>
                            <p className="qr-scanner__result-college">{scanResult.registration.collegeName}</p>
                        </div>
                    ) : (
                        <div className="qr-scanner__result-info">
                            <h2 className="qr-scanner__result-status">
                                {scanResult.status === 'invalid' ? 'Invalid QR' : 'Error'}
                            </h2>
                        </div>
                    )}

                    <p className="qr-scanner__result-message">{scanResult.message}</p>

                    <div className="qr-scanner__result-actions">
                        {scanResult.status === 'valid' && (
                            <button
                                className="qr-scanner__mark-btn"
                                onClick={handleMarkAttendance}
                                disabled={isMarkingAttendance}
                            >
                                {isMarkingAttendance ? 'Marking...' : 'Mark Attendance'}
                            </button>
                        )}
                        <button className="qr-scanner__next-btn" onClick={handleScanNext}>
                            Scan Next
                        </button>
                    </div>
                </div>
            )}

            {/* Attendance List Overlay */}
            {showAttendanceList && (
                <div className="qr-scanner__overlay" onClick={() => setShowAttendanceList(false)}>
                    <div className="qr-scanner__attendance-panel" onClick={e => e.stopPropagation()}>
                        <div className="qr-scanner__attendance-header">
                            <h2>Attendance - {selectedEvent?.title}</h2>
                            <button onClick={() => setShowAttendanceList(false)}>×</button>
                        </div>

                        <div className="qr-scanner__attendance-filters">
                            <input
                                type="text"
                                placeholder="Search by name or Orbit ID..."
                                value={attendanceSearch}
                                onChange={(e) => setAttendanceSearch(e.target.value)}
                                className="qr-scanner__search-input"
                            />
                            <div className="qr-scanner__filter-btns">
                                <button
                                    className={attendanceFilter === 'all' ? 'active' : ''}
                                    onClick={() => setAttendanceFilter('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={attendanceFilter === 'attended' ? 'active' : ''}
                                    onClick={() => setAttendanceFilter('attended')}
                                >
                                    Checked In
                                </button>
                                <button
                                    className={attendanceFilter === 'pending' ? 'active' : ''}
                                    onClick={() => setAttendanceFilter('pending')}
                                >
                                    Not Yet
                                </button>
                            </div>
                        </div>

                        <div className="qr-scanner__attendance-list">
                            {filteredAttendanceList.map(reg => (
                                <div
                                    key={reg.qrSignature}
                                    className={`qr-scanner__attendance-item ${reg.attendanceMarked ? 'checked-in' : ''}`}
                                >
                                    <span className="qr-scanner__attendance-status">
                                        {reg.attendanceMarked ? '✓' : '○'}
                                    </span>
                                    <span className="qr-scanner__attendance-name">
                                        {reg.firstName} {reg.lastName}
                                    </span>
                                    <span className="qr-scanner__attendance-orbitid">
                                        {reg.orbitId}
                                    </span>
                                    <span className="qr-scanner__attendance-time">
                                        {reg.attendanceMarked && reg.markedAt
                                            ? new Date(reg.markedAt).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                            })
                                            : 'Not checked in'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="qr-scanner__attendance-summary">
                            <span>Total: {attendanceList.length}</span>
                            <span>Checked In: {attendanceList.filter(r => r.attendanceMarked).length}</span>
                            <span>Remaining: {attendanceList.filter(r => !r.attendanceMarked).length}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
