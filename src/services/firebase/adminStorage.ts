/**
 * Firebase Storage helpers for admin profile images
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

// Storage paths
const ADMIN_PROFILE_IMAGES_PATH = 'members-profiles';

/**
 * Upload admin profile display image
 * @param adminUid - The admin's UID
 * @param file - The image file to upload
 * @returns Promise with the download URL
 */
export async function uploadAdminDisplayImage(adminUid: string, file: File): Promise<string> {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB.');
    }

    // Create unique filename with timestamp
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${adminUid}_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `${ADMIN_PROFILE_IMAGES_PATH}/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
            uploadedBy: adminUid,
            uploadedAt: new Date().toISOString()
        }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

/**
 * Delete admin profile display image
 * @param imageUrl - The full URL of the image to delete
 */
export async function deleteAdminDisplayImage(imageUrl: string): Promise<void> {
    try {
        // Extract the path from the URL
        // URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?...
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);

        if (pathMatch && pathMatch[1]) {
            const path = decodeURIComponent(pathMatch[1]);
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
        }
    } catch (error: any) {
        // Ignore if file doesn't exist
        if (error.code !== 'storage/object-not-found') {
            throw error;
        }
    }
}

/**
 * Get a placeholder image URL for admin profiles
 */
export function getDefaultAdminAvatar(firstName?: string, lastName?: string): string {
    const initials = `${firstName?.charAt(0) || 'A'}${lastName?.charAt(0) || ''}`.toUpperCase();
    // Use UI Avatars service for placeholder
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=fff&size=256`;
}
