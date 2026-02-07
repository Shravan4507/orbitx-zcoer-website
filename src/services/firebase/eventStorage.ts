/**
 * Firebase Storage helpers for event images
 */
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './config';

// Storage path for event images
const EVENT_IMAGES_PATH = 'event-images';

/**
 * Upload a single event image
 * @param eventId - The event's document ID or eventId
 * @param file - The image file to upload
 * @param index - Image index (for ordering)
 * @returns Promise with the download URL
 */
export async function uploadEventImage(
    eventId: string,
    file: File,
    index: number
): Promise<string> {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
    }

    // Validate file size (max 10MB for events)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 10MB.');
    }

    // Create unique filename with index and timestamp
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${eventId}_${index}_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `${EVENT_IMAGES_PATH}/${eventId}/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
            eventId,
            index: String(index),
            uploadedAt: new Date().toISOString()
        }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

/**
 * Upload multiple event images
 * @param eventId - The event's document ID
 * @param files - Array of image files to upload
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with array of download URLs
 */
export async function uploadEventImages(
    eventId: string,
    files: File[],
    onProgress?: (current: number, total: number) => void
): Promise<string[]> {
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
        if (onProgress) {
            onProgress(i + 1, files.length);
        }
        const url = await uploadEventImage(eventId, files[i], i);
        urls.push(url);
    }

    return urls;
}

/**
 * Delete a single event image by URL
 * @param imageUrl - The full URL of the image to delete
 */
export async function deleteEventImage(imageUrl: string): Promise<void> {
    try {
        // Extract the path from the URL
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
 * Delete all images for an event
 * @param eventId - The event's document ID
 */
export async function deleteAllEventImages(eventId: string): Promise<void> {
    try {
        const folderRef = ref(storage, `${EVENT_IMAGES_PATH}/${eventId}`);
        const listResult = await listAll(folderRef);

        // Delete all files in the folder
        await Promise.all(
            listResult.items.map(itemRef => deleteObject(itemRef))
        );
    } catch (error: any) {
        // Ignore if folder doesn't exist
        if (error.code !== 'storage/object-not-found') {
            console.error('Error deleting event images:', error);
        }
    }
}
