/**
 * Volunteer QR Scanner Component
 * 
 * Simplified scanner for volunteers:
 * - Auto-verify and mark attendance
 * - Manual verification fallback for issues
 * - Offline support with local cache
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
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

type ViewState = 'loading' | 'no-access' | 'ready' | 'scanning' | 'result';

export default function VolunteerScanner({ userOrbitId, onClose }: VolunteerScannerProps) {
    const { showToast } = useToast();

    // State
    const [viewState, setViewState] = useState<ViewState>('loading');
    const [assignment, setAssignment] = useState<VolunteerAssignment | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCacheLoaded, setIsCacheLoaded] = useState(false);

    // Scanning state
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [lastScannedReg, setLastScannedReg] = useState<CachedRegistration | null>(null);
    const [isAutoMarking, setIsAutoMarking] = useState(false);
    const [isManualVerifying, setIsManualVerifying] = useState(false);

    // Stats
    const [stats, setStats] = useState({ total: 0, attended: 0 });
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Scanner ref
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);

    // Check volunteer access on mount
    useEffect(() => {
        const checkAccess = async () => {
            await initializeScannerService();
            const assignments = await getVolunteerAssignments(userOrbitId);

            if (assignments.length === 0) {
                setViewState('no-access');
                return;
            }

            // Use first assignment (could enhance to show picker if multiple)
            setAssignment(assignments[0]);

            // Check if cache exists
            const isValid = await isCacheValid(assignments[0].eventId);
            setIsCacheLoaded(isValid);

            setViewState('ready');
        };
        checkAccess();
    }, [userOrbitId]);

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

    // Update stats
    const updateStats = useCallback(async () => {
        if (assignment) {
            const newStats = await getAttendanceStats(assignment.eventId);
            setStats(newStats);
        }
    }, [assignment]);

    // Update pending count
    const updatePendingCount = useCallback(async () => {
        const count = await getPendingSyncCount();
        setPendingSyncCount(count);
    }, []);

    // Load registrations for offline use
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
            showToast('Failed to load registrations', 'error');
        }
    };

    // Start scanning
    const handleStartScanning = () => {
        if (!isCacheLoaded) {
            showToast('Please load registrations first', 'info');
            return;
        }
        setViewState('scanning');
    };

    // Initialize QR scanner
    useEffect(() => {
        if (viewState === 'scanning' && scannerContainerRef.current && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                'volunteer-qr-reader',
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
                    scanner.pause();
                    await handleScan(decodedText);
                },
                (error) => {
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

    // Handle QR scan with auto-verification
    const handleScan = async (qrData: string) => {
        if (!assignment) return;

        const result = await verifyQrCode(qrData, assignment.eventId);
        setScanResult(result);
        setViewState('result');

        if (result.registration) {
            setLastScannedReg(result.registration);
        }

        // Auto-mark attendance if valid
        if (result.status === 'valid' && result.registration) {
            setIsAutoMarking(true);
            const markResult = await markAttendance(result.registration.qrSignature, userOrbitId);
            setIsAutoMarking(false);

            if (markResult.success) {
                setScanResult(prev => prev ? {
                    ...prev,
                    status: 'valid',
                    message: 'Attendance marked automatically ✓',
                } : null);
                setLastScannedReg(markResult.registration || null);
                await updateStats();
                await updatePendingCount();
            }
        }
    };

    // Manual verification for issues
    const handleManualVerify = async () => {
        if (!scanResult?.registration) return;

        setIsManualVerifying(true);
        const result = await markAttendance(scanResult.registration.qrSignature, userOrbitId);
        setIsManualVerifying(false);

        if (result.success) {
            showToast('Manually verified and marked!', 'success');
            setLastScannedReg(result.registration || null);
            await updateStats();
            await updatePendingCount();
            handleScanNext();
        } else {
            showToast('Failed to mark attendance', 'error');
        }
    };

    // Continue to next scan
    const handleScanNext = () => {
        setScanResult(null);
        setViewState('scanning');
        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    // Back to ready state
    const handleBack = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        setViewState('ready');
    };

    // Render loading state
    if (viewState === 'loading') {
        return (
            <div className="volunteer-scanner volunteer-scanner--loading">
                <div className="volunteer-scanner__spinner"></div>
                <p>Checking access...</p>
            </div>
        );
    }

    // Render no access state
    if (viewState === 'no-access') {
        return (
            <div className="volunteer-scanner volunteer-scanner--no-access">
                <div className="volunteer-scanner__no-access-icon">🚫</div>
                <h2>No Access</h2>
                <p>You haven't been assigned as a volunteer for any event.</p>
                {onClose && (
                    <button className="volunteer-scanner__back-btn" onClick={onClose}>
                        Go Back
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="volunteer-scanner">
            {/* Header */}
            <div className="volunteer-scanner__header">
                {viewState !== 'ready' && (
                    <button className="volunteer-scanner__back-btn" onClick={handleBack}>
                        ←
                    </button>
                )}
                <h1 className="volunteer-scanner__title">🎫 Volunteer Scanner</h1>
                {onClose && (
                    <button className="volunteer-scanner__close-btn" onClick={onClose}>×</button>
                )}
            </div>

            {/* Ready View */}
            {viewState === 'ready' && assignment && (
                <div className="volunteer-scanner__ready">
                    <div className="volunteer-scanner__event-info">
                        <h2>{assignment.eventName}</h2>
                        <p className="volunteer-scanner__event-date">{assignment.eventDate}</p>
                        <p className="volunteer-scanner__assigned-by">
                            Assigned by: {assignment.assignedBy}
                        </p>
                    </div>

                    <div className="volunteer-scanner__cache-status">
                        <span className={`volunteer-scanner__cache-indicator ${isCacheLoaded ? 'loaded' : ''}`}>
                            {isCacheLoaded ? '✓ Registrations loaded' : '○ Not loaded yet'}
                        </span>
                        <span className={`volunteer-scanner__online-indicator ${isOnline ? 'online' : 'offline'}`}>
                            {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </span>
                    </div>

                    <div className="volunteer-scanner__actions">
                        <button
                            className="volunteer-scanner__load-btn"
                            onClick={handleLoadRegistrations}
                            disabled={isDownloading}
                        >
                            {isDownloading ? 'Loading...' : isCacheLoaded ? '↻ Refresh Data' : '📥 Load Registrations'}
                        </button>
                        <button
                            className="volunteer-scanner__scan-btn"
                            onClick={handleStartScanning}
                            disabled={!isCacheLoaded}
                        >
                            📷 Start Scanning
                        </button>
                    </div>

                    {stats.total > 0 && (
                        <div className="volunteer-scanner__stats">
                            <span>Registered: {stats.total}</span>
                            <span>Checked In: {stats.attended}</span>
                        </div>
                    )}

                    {pendingSyncCount > 0 && (
                        <div className="volunteer-scanner__pending-sync">
                            ⚠️ {pendingSyncCount} records waiting to sync
                        </div>
                    )}
                </div>
            )}

            {/* Scanning View */}
            {viewState === 'scanning' && (
                <div className="volunteer-scanner__scanning">
                    <div
                        id="volunteer-qr-reader"
                        ref={scannerContainerRef}
                        className="volunteer-scanner__reader"
                    ></div>

                    <div className="volunteer-scanner__scan-info">
                        <span className={isOnline ? 'online' : 'offline'}>
                            {isOnline ? '🟢' : '🔴'} {stats.attended}/{stats.total}
                        </span>
                        {pendingSyncCount > 0 && (
                            <span className="pending">{pendingSyncCount} pending</span>
                        )}
                    </div>

                    {lastScannedReg && (
                        <div className="volunteer-scanner__last-scan">
                            Last: {lastScannedReg.firstName} {lastScannedReg.lastName} ✓
                        </div>
                    )}
                </div>
            )}

            {/* Result View */}
            {viewState === 'result' && scanResult && (
                <div className={`volunteer-scanner__result volunteer-scanner__result--${scanResult.status}`}>
                    <div className="volunteer-scanner__result-icon">
                        {scanResult.status === 'valid' && (isAutoMarking ? '...' : '✓')}
                        {scanResult.status === 'already-scanned' && '⚠️'}
                        {scanResult.status === 'invalid' && '✗'}
                        {scanResult.status === 'error' && '!'}
                    </div>

                    {scanResult.registration ? (
                        <div className="volunteer-scanner__result-info">
                            <h2>{scanResult.registration.firstName} {scanResult.registration.lastName}</h2>
                            <p className="volunteer-scanner__result-orbitid">{scanResult.registration.orbitId}</p>
                            <p className="volunteer-scanner__result-college">{scanResult.registration.collegeName}</p>
                        </div>
                    ) : (
                        <div className="volunteer-scanner__result-info">
                            <h2>{scanResult.status === 'invalid' ? 'Invalid QR' : 'Error'}</h2>
                        </div>
                    )}

                    <p className="volunteer-scanner__result-message">
                        {isAutoMarking ? 'Marking attendance...' : scanResult.message}
                    </p>

                    <div className="volunteer-scanner__result-actions">
                        {scanResult.status === 'already-scanned' && scanResult.registration && (
                            <button
                                className="volunteer-scanner__manual-btn"
                                onClick={handleManualVerify}
                                disabled={isManualVerifying}
                            >
                                {isManualVerifying ? 'Verifying...' : 'Manual Verify & Mark'}
                            </button>
                        )}
                        <button className="volunteer-scanner__next-btn" onClick={handleScanNext}>
                            Scan Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
