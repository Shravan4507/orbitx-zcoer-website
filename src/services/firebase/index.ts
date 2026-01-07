// Firebase Services - Central Export
// This file re-exports all Firebase services for easy imports throughout the app

export { auth, db, storage, googleProvider } from './config';
export { default as app } from './config';

// Auth services
export * from './auth';

// Firestore services will be added here
// export * from './firestore';
