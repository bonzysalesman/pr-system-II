/**
 * @fileoverview Firebase Configuration and Service Initialization
 * @version 1.3.0
 * 
 * Change History:
 * 1.0.0 - Initial Firebase setup with basic services
 * 1.1.0 - Added emulator support and enhanced error handling
 * 1.2.0 - Improved logging and removed emulator config for production stability
 * 1.3.0 - Complete rewrite to fix initialization issues with Firebase 11.x
 * 
 * Description:
 * This module initializes and exports Firebase services for the PR System application.
 * It serves as the central configuration point for all Firebase-related services
 * including Authentication, Firestore, Storage, Functions, and Analytics.
 */

// Import the Firebase app module first
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Log initialization start
console.log('=== Firebase Initialization Starting ===');

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(
  varName => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}`
  );
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log('Firebase config loaded:', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket
});

// Initialize Firebase app and all services synchronously
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
export const analytics = import.meta.env.PROD ? getAnalytics(app) : undefined;

console.log('Firebase app and services initialized successfully');

