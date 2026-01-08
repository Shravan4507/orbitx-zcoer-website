/**
 * Volunteer QR Scanner - v2
 * 
 * Simplified scanner for volunteers:
 * - Auto-verify and mark attendance on scan
 * - Camera selection (front/rear)
 * - Offline support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../toast/Toast';
import {
    downloadAndCacheRegistrations,
    verifyQrCode,
    markAttendance,
    syncPendingAttendance,
    isCacheValid,
    getAttendanceStats,
    initializeScannerService,
    type CachedRegistration,
    type ScanResult,
} from '../../services/scanner/scannerService';
import { getPendingSyncCount } from '../../services/scanner/scannerDb';
import { getVolunteerAssignments, type VolunteerAssignment } from '../../services/scanner/volunteerService';
import './VolunteerScanner.css';

interface VolunteerScannerProps {
    userOrbitId: string;
    onClose?: () => void;
}

interface CameraDevice {
    id: string;
    label: string;
}

type ViewState = 'loading' | 'no-access' | 'ready' | 'scanning' | 'result';

export default function VolunteerScanner({ userOrbitId, onClose }: VolunteerScannerProps) {
    const { showToast } = useToast();

    // State
    const [viewState, setViewState] = useState<ViewState>('loading');
    const [assignment, setAssignment] = useState<VolunteerAssignment | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCacheLoaded, setIsCacheLoaded] = useState(false);

    // Camera state
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    // Scanning state
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScannedReg, setLastScannedReg] = useState<CachedRegistration | null>(null);

    // Stats
    const [stats, setStats] = useState({ total: 0, attended: 0 });
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Scanner ref
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Check volunteer access on mount
    useEffect(() => {
        const checkAccess = async () => {
            await initializeScannerService();
            const assignments = await getVolunteerAssignments(userOrbitId);

            if (assignments.length === 0) {
                setViewState('no-access');
                return;
            }

            setAssignment(assignments[0]);

            const isValid = await isCacheValid(assignments[0].eventId);
            setIsCacheLoaded(isValid);
            if (isValid) {
                const newStats = await getAttendanceStats(assignments[0].eventId);
                setStats(newStats);
            }

            setViewState('ready');
        };
        checkAccess();
    }, [userOrbitId]);

    // Get cameras
    useEffect(() => {
        Html5Qrcode.getCameras().then((devices) => {
            const cams = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 8)}` }));
            setCameras(cams);
            const rearCam = cams.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(rearCam?.id || cams[0]?.id || null);
        }).catch(console.error);
    }, []);

    // Online/offline
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

    const updateStats = useCallback(async () => {
        if (assignment) {
            const newStats = await getAttendanceStats(assignment.eventId);
            setStats(newStats);
        }
    }, [assignment]);

    const updatePendingCount = useCallback(async () => {
        const count = await getPendingSyncCount();
        setPendingSyncCount(count);
    }, []);

    // Load registrations
    const handleLoadRegistrations = async () => {
        if (!assignment) return;

        setIsDownloading(true);
        const result = await downloadAndCacheRegistrations(assignment.eventId, assignment.eventName);
        setIsDownloading(false);

        if (result.success) {
            showToast(`Loaded ${result.count} registrations`, 'success');
            setIsCacheLoaded(true);
            await updateStats();
        } else {
            showToast('Failed to load', 'error');
        }
    };

    // Start scanning
    const handleStartScanning = async () => {
        if (!isCacheLoaded) {
            showToast('Load registrations first', 'info');
            return;
        }
        await updatePendingCount();
        setViewState('scanning');
    };

    // Initialize camera
    useEffect(() => {
        if (viewState === 'scanning' && selectedCameraId && !scannerRef.current) {
            const scanner = new Html5Qrcode('volunteer-qr-reader');
            scannerRef.current = scanner;

            scanner.start(
                selectedCameraId,
                { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
                async (decodedText) => {
                    if (isProcessing) return;
                    await handleScan(decodedText);
                },
                () => { }
            ).then(() => {
                setIsCameraReady(true);
            }).catch(err => {
                console.error('Scanner error:', err);
                showToast('Camera failed', 'error');
            });
        }

        return () => {
            if (autoResumeTimerRef.current) {
                clearTimeout(autoResumeTimerRef.current);
            }
        };
    }, [viewState, selectedCameraId, isProcessing]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
                scannerRef.current = null;
            }
        };
    }, [viewState]);

    // Handle scan - AUTO MARK
    const handleScan = async (qrData: string) => {
        if (!assignment || isProcessing) return;

        setIsProcessing(true);

        if (scannerRef.current) {
            await scannerRef.current.pause(true);
        }

        const result = await verifyQrCode(qrData, assignment.eventId);
        setScanResult(result);
        setViewState('result');

        // AUTO-MARK if valid
        if (result.status === 'valid' && result.registration) {
            const markResult = await markAttendance(result.registration.qrSignature, userOrbitId);

            if (markResult.success) {
                if (navigator.vibrate) navigator.vibrate(100);
                setLastScannedReg(markResult.registration || null);
                await updateStats();
                await updatePendingCount();
                setScanResult({
                    ...result,
                    message: '✓ Attendance marked!',
                });
            } else {
                setScanResult({
                    success: false,
                    status: 'error',
                    registration: result.registration,
                    message: 'Failed to mark. Try again.',
                });
            }
        } else if (result.status === 'already-scanned') {
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }

        setIsProcessing(false);

        autoResumeTimerRef.current = setTimeout(() => {
            handleScanNext();
        }, 2500);
    };

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

    const handleSwitchCamera = async () => {
        if (cameras.length < 2) return;

        const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;

        if (scannerRef.current) {
            await scannerRef.current.stop();
            scannerRef.current = null;
        }

        setSelectedCameraId(cameras[nextIndex].id);
        setIsCameraReady(false);
    };

    const handleBack = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => { });
            scannerRef.current = null;
        }
        setScanResult(null);
        setViewState('ready');
    };

    // Loading
    if (viewState === 'loading') {
        return (
            <div className="vol-scanner vol-scanner--loading">
                <div className="vol-scanner__spinner"></div>
                <p>Checking access...</p>
            </div>
        );
    }

    // No access
    if (viewState === 'no-access') {
        return (
            <div className="vol-scanner vol-scanner--no-access">
                <span className="vol-scanner__no-access-icon">🚫</span>
                <h2>No Access</h2>
                <p>You're not assigned as a volunteer for any event.</p>
                {onClose && (
                    <button className="vol-scanner__back-btn-full" onClick={onClose}>Go Back</button>
                )}
            </div>
        );
    }

    return (
        <div className="vol-scanner">
            {/* Header */}
            <div className="vol-scanner__header">
                {(viewState === 'scanning' || viewState === 'result') && (
                    <button className="vol-scanner__back-btn" onClick={handleBack}>←</button>
                )}
                <h1 className="vol-scanner__title">🎫 Volunteer Scanner</h1>
                {onClose && (
                    <button className="vol-scanner__close-btn" onClick={onClose}>×</button>
                )}
            </div>

            {/* Ready View */}
            {viewState === 'ready' && assignment && (
                <div className="vol-scanner__ready">
                    <div className="vol-scanner__event-card">
                        <h2>{assignment.eventName}</h2>
                        <p className="vol-scanner__event-date">{assignment.eventDate}</p>
                        <p className="vol-scanner__assigned-by">Assigned by: {assignment.assignedBy}</p>
                    </div>

                    <div className="vol-scanner__status-row">
                        <span className={`vol-scanner__cache-badge ${isCacheLoaded ? 'loaded' : ''}`}>
                            {isCacheLoaded ? '✓ Ready' : '○ Not loaded'}
                        </span>
                        <span className={`vol-scanner__online-badge ${isOnline ? 'online' : ''}`}>
                            {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                    </div>

                    {stats.total > 0 && (
                        <div className="vol-scanner__stats">
                            <span className="vol-scanner__stat-big">{stats.attended}</span>
                            <span className="vol-scanner__stat-label">/ {stats.total} checked in</span>
                        </div>
                    )}

                    <div className="vol-scanner__actions">
                        <button
                            className="vol-scanner__load-btn"
                            onClick={handleLoadRegistrations}
                            disabled={isDownloading}
                        >
                            {isDownloading ? 'Loading...' : isCacheLoaded ? '↻ Refresh' : '📥 Load Registrations'}
                        </button>
                        <button
                            className="vol-scanner__scan-btn"
                            onClick={handleStartScanning}
                            disabled={!isCacheLoaded}
                        >
                            📷 Start Scanning
                        </button>
                    </div>

                    {pendingSyncCount > 0 && (
                        <div className="vol-scanner__pending">⚠️ {pendingSyncCount} pending sync</div>
                    )}
                </div>
            )}

            {/* Scanning View */}
            {viewState === 'scanning' && (
                <div className="vol-scanner__scanning">
                    <div className="vol-scanner__camera-container">
                        <div id="volunteer-qr-reader" className="vol-scanner__camera"></div>

                        {!isCameraReady && (
                            <div className="vol-scanner__camera-loading">
                                <div className="vol-scanner__spinner"></div>
                                <p>Starting camera...</p>
                            </div>
                        )}

                        {cameras.length > 1 && (
                            <button className="vol-scanner__camera-switch" onClick={handleSwitchCamera}>🔄</button>
                        )}

                        <div className="vol-scanner__scan-frame"></div>
                    </div>

                    <div className="vol-scanner__scan-stats">
                        <span className="vol-scanner__stat-big">{stats.attended}</span>
                        <span className="vol-scanner__stat-label">/ {stats.total}</span>
                        <span className={`vol-scanner__status-dot ${isOnline ? 'online' : ''}`}></span>
                        {pendingSyncCount > 0 && (
                            <span className="vol-scanner__pending-badge">{pendingSyncCount}</span>
                        )}
                    </div>

                    {lastScannedReg && (
                        <div className="vol-scanner__last-scan">
                            ✓ {lastScannedReg.firstName} {lastScannedReg.lastName}
                        </div>
                    )}
                </div>
            )}

            {/* Result View */}
            {viewState === 'result' && scanResult && (
                <div className={`vol-scanner__result vol-scanner__result--${scanResult.status}`}>
                    <div className="vol-scanner__result-icon">
                        {scanResult.status === 'valid' && '✓'}
                        {scanResult.status === 'already-scanned' && '⚠'}
                        {scanResult.status === 'invalid' && '✗'}
                        {scanResult.status === 'error' && '!'}
                    </div>

                    {scanResult.registration ? (
                        <div className="vol-scanner__result-info">
                            <h2>{scanResult.registration.firstName} {scanResult.registration.lastName}</h2>
                            <p className="vol-scanner__result-orbitid">{scanResult.registration.orbitId}</p>
                            <p className="vol-scanner__result-college">{scanResult.registration.collegeName}</p>
                        </div>
                    ) : (
                        <h2>{scanResult.status === 'invalid' ? 'Invalid QR' : 'Error'}</h2>
                    )}

                    <p className="vol-scanner__result-message">{scanResult.message}</p>

                    <button className="vol-scanner__next-btn" onClick={handleScanNext}>
                        📷 Scan Next
                    </button>
                    <p className="vol-scanner__auto-text">Auto-continuing in 2s...</p>
                </div>
            )}
        </div>
    );
}
