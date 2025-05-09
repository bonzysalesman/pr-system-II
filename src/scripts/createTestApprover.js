/**
 * Create Test Approver Script
 * 
 * This script creates a test approver account for testing the PR workflow.
 * It adds the user to Firebase Authentication and Firestore with the appropriate permissions.
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, setDoc, doc } = require('firebase/firestore');

// Email and password for the test approver
const TEST_APPROVER_EMAIL = 'approver@example.com';
const TEST_APPROVER_PASSWORD = 'Approver123!';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createTestApprover() {
  try {
    console.log('Creating test approver account...');
    console.log(`Email: ${TEST_APPROVER_EMAIL}`);
    console.log(`Password: ${TEST_APPROVER_PASSWORD}`);

    // Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      TEST_APPROVER_EMAIL, 
      TEST_APPROVER_PASSWORD
    );
    
    const userId = userCredential.user.uid;
    console.log(`User created with ID: ${userId}`);

    // Add user to Firestore with approver permissions
    await setDoc(doc(db, 'users', userId), {
      email: TEST_APPROVER_EMAIL,
      firstName: 'Test',
      lastName: 'Approver',
      isActive: true,
      organization: '1pwr_lesotho', // Using one of the organizations from localReferenceData
      department: 'procurement', // Procurement department
      permissionLevel: 2, // Level 2 is for approvers based on your ApproverService
      role: 'APPROVER',
      createdAt: new Date().toISOString()
    });

    console.log('Test approver added to Firestore with appropriate permissions');
    console.log('==========================================================');
    console.log('TEST APPROVER CREDENTIALS:');
    console.log(`Email: ${TEST_APPROVER_EMAIL}`);
    console.log(`Password: ${TEST_APPROVER_PASSWORD}`);
    console.log('==========================================================');
    console.log('You can now use these credentials to log in as an approver');

  } catch (error) {
    console.error('Error creating test approver:', error);
    if (error.code === 'auth/email-already-in-use') {
      console.log('A user with that email already exists. You can try logging in with:');
      console.log(`Email: ${TEST_APPROVER_EMAIL}`);
      console.log(`Password: ${TEST_APPROVER_PASSWORD}`);
    }
  } finally {
    process.exit();
  }
}

// Run the function
createTestApprover();
