/**
 * Event Pass Generation Service
 * 
 * Handles secure QR code generation and PDF pass creation
 */

import { db } from './config';
import { collection, doc, setDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

// ===== TYPES =====

export interface PassGenerationInput {
    orbitId: string;
    firstName: string;
    lastName: string;
    email: string;
    collegeName: string;
    gender: string;
    govIdLast4: string;
    govIdType: 'aadhar' | 'pan';
    eventId: string;
    eventName: string;
    eventDate: string;
    eventVenue?: string;
}

export interface RegistrationRecord {
    registrationId: string;
    orbitId: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    qrSignature: string;
    firstName: string;
    lastName: string;
    email: string;
    collegeName: string;
    gender: string;
    govIdType: 'aadhar' | 'pan';
    attendanceStatus: boolean;
    checkInTime: string | null;
    createdAt: string;
}

// ===== STEP 1: RANDOM TOKEN GENERATION =====

/**
 * Generates a cryptographically secure random string
 * Uses Web Crypto API for security
 */
const generateSecureRandomToken = (length: number = 16): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    // Convert to base64 and remove special characters
    return btoa(String.fromCharCode(...array))
        .replace(/[+/=]/g, '')
        .slice(0, length);
};

// ===== STEP 2 & 3: PAYLOAD CREATION AND HASHING =====

/**
 * Creates canonical payload and generates SHA-256 hash
 * Payload format: orbitId|govIdLast4|firstName|eventId|randomToken
 */
const generateQrSignature = async (
    orbitId: string,
    govIdLast4: string,
    firstName: string,
    eventId: string,
    randomToken: string
): Promise<string> => {
    // Create canonical payload (order MUST never change)
    const rawPayload = `${orbitId}|${govIdLast4}|${firstName}|${eventId}|${randomToken}`;

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(rawPayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
};

// ===== STEP 4 & 5: REGISTRATION AND QR GENERATION =====

/**
 * Generates a unique registration ID
 * Format: REG-YYYYMMDD-XXXXXX
 */
const generateRegistrationId = (): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = generateSecureRandomToken(6).toUpperCase();
    return `REG-${dateStr}-${randomPart}`;
};

/**
 * Generates QR code as data URL
 */
const generateQrCodeDataUrl = async (qrSignature: string): Promise<string> => {
    try {
        const qrDataUrl = await QRCode.toDataURL(qrSignature, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 200,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrDataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
};

// ===== PDF PASS GENERATION =====

/**
 * Formats date for display on pass
 */
const formatDisplayDate = (dateStr: string): string => {
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

/**
 * Generates PDF pass with user info and QR code
 */
const generatePassPdf = async (
    registration: RegistrationRecord,
    qrDataUrl: string,
    eventVenue?: string
): Promise<Blob> => {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150] // Pass size: 100mm x 150mm
    });

    const pageWidth = 100;
    const pageHeight = 150;
    const margin = 8;

    // Background
    pdf.setFillColor(15, 15, 20);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header stripe
    pdf.setFillColor(78, 255, 159);
    pdf.rect(0, 0, pageWidth, 20, 'F');

    // Event name in header
    pdf.setTextColor(10, 10, 15);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const eventTitle = registration.eventName.length > 30
        ? registration.eventName.slice(0, 27) + '...'
        : registration.eventName;
    pdf.text(eventTitle, pageWidth / 2, 10, { align: 'center' });

    // Event date in header
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDisplayDate(registration.eventDate), pageWidth / 2, 16, { align: 'center' });

    // "EVENT PASS" title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EVENT PASS', pageWidth / 2, 32, { align: 'center' });

    // QR Code
    const qrSize = 45;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 38;

    // White background for QR
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 3, 3, 'F');

    // Add QR code image
    pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Attendee details
    let yPos = qrY + qrSize + 12;
    const labelColor = [150, 150, 160];
    const valueColor = [255, 255, 255];

    const addField = (label: string, value: string, y: number): number => {
        pdf.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text(label, margin, y);

        pdf.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        const displayValue = value.length > 35 ? value.slice(0, 32) + '...' : value;
        pdf.text(displayValue, margin, y + 4);

        return y + 11;
    };

    yPos = addField('FULL NAME', `${registration.firstName} ${registration.lastName}`, yPos);
    yPos = addField('ORBIT ID', registration.orbitId, yPos);
    yPos = addField('EMAIL', registration.email, yPos);
    yPos = addField('COLLEGE', registration.collegeName, yPos);

    // Venue if available
    if (eventVenue) {
        pdf.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        pdf.setFontSize(6);
        pdf.text('VENUE', margin, yPos);

        pdf.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        const venueDisplay = eventVenue.length > 40 ? eventVenue.slice(0, 37) + '...' : eventVenue;
        pdf.text(venueDisplay, margin, yPos + 4);
    }

    // Footer with registration ID
    pdf.setTextColor(80, 80, 90);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID: ${registration.registrationId}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Return as blob
    return pdf.output('blob');
};

/**
 * Complete event registration process
 * 1. Generates secure random token
 * 2. Creates QR signature hash
 * 3. Stores registration record in Firestore
 * 
 * Returns registration data (PDF can be generated separately via generatePassPdfForRegistration)
 */
export const generateEventPass = async (input: PassGenerationInput): Promise<{
    registrationId: string;
    registration: RegistrationRecord;
    qrSignature: string;
}> => {
    try {
        // Step 1: Generate random token
        const randomToken = generateSecureRandomToken(16);

        // Step 2 & 3: Generate QR signature
        const qrSignature = await generateQrSignature(
            input.orbitId,
            input.govIdLast4,
            input.firstName,
            input.eventId,
            randomToken
        );

        // Generate registration ID
        const registrationId = generateRegistrationId();

        // Step 4: Create registration record
        const registration: RegistrationRecord = {
            registrationId,
            orbitId: input.orbitId,
            eventId: input.eventId,
            eventName: input.eventName,
            eventDate: input.eventDate,
            qrSignature,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            collegeName: input.collegeName,
            gender: input.gender,
            govIdType: input.govIdType,
            attendanceStatus: false,
            checkInTime: null,
            createdAt: new Date().toISOString()
        };

        // Store in Firestore: event_reg/{eventId}_{registrationId}
        // Direct document in collection for easy access
        const docId = `${input.eventId}_${registrationId}`;
        const eventRegRef = doc(db, 'event_reg', docId);
        await setDoc(eventRegRef, registration);

        // Also store a quick lookup by qrSignature
        const qrLookupRef = doc(db, 'qr_lookup', qrSignature);
        await setDoc(qrLookupRef, {
            registrationId,
            eventId: input.eventId,
            docId,
            createdAt: registration.createdAt
        });

        return {
            registrationId,
            registration,
            qrSignature
        };

    } catch (error) {
        console.error('Error registering for event:', error);
        throw error;
    }
};

/**
 * Generate PDF pass for a registration
 * Can be called separately after registration
 */
export const generatePassPdfForRegistration = async (
    registration: RegistrationRecord,
    eventVenue?: string
): Promise<Blob> => {
    try {
        const qrDataUrl = await generateQrCodeDataUrl(registration.qrSignature);
        const pdfBlob = await generatePassPdf(registration, qrDataUrl, eventVenue);
        return pdfBlob;
    } catch (error) {
        console.error('Error generating pass PDF:', error);
        throw error;
    }
};

/**
 * Downloads the PDF pass
 */
export const downloadPass = (pdfBlob: Blob, eventName: string, orbitId: string): void => {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EventPass_${eventName.replace(/[^a-z0-9]/gi, '_')}_${orbitId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Check if user is already registered for an event
 */
export const checkExistingRegistration = async (
    eventId: string,
    orbitId: string
): Promise<RegistrationRecord | null> => {
    try {
        // Query event_reg collection for this user and event
        const registrationsRef = collection(db, 'event_reg');
        const { getDocs, query, where } = await import('firebase/firestore');
        const q = query(
            registrationsRef,
            where('orbitId', '==', orbitId),
            where('eventId', '==', eventId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            return snapshot.docs[0].data() as RegistrationRecord;
        }

        return null;
    } catch (error) {
        console.error('Error checking existing registration:', error);
        return null;
    }
};

/**
 * Get all registrations for a user (for My Events in dashboard)
 */
export const getUserRegistrations = async (
    orbitId: string
): Promise<RegistrationRecord[]> => {
    try {
        console.log('Fetching registrations for orbitId:', orbitId);
        const registrationsRef = collection(db, 'event_reg');
        const { getDocs, query, where } = await import('firebase/firestore');

        // Simple query - only filter by orbitId, sort client-side to avoid composite index
        const q = query(
            registrationsRef,
            where('orbitId', '==', orbitId)
        );
        const snapshot = await getDocs(q);

        console.log('Found registrations:', snapshot.size);

        const registrations = snapshot.docs.map(doc => {
            console.log('Registration doc:', doc.id, doc.data());
            return doc.data() as RegistrationRecord;
        });

        // Sort by createdAt descending (client-side)
        registrations.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return registrations;
    } catch (error) {
        console.error('Error fetching user registrations:', error);
        return [];
    }
};

/**
 * Get a specific registration by registrationId
 */
export const getRegistrationById = async (
    eventId: string,
    registrationId: string
): Promise<RegistrationRecord | null> => {
    try {
        const docId = `${eventId}_${registrationId}`;
        const { getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'event_reg', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as RegistrationRecord;
        }

        return null;
    } catch (error) {
        console.error('Error fetching registration:', error);
        return null;
    }
};
