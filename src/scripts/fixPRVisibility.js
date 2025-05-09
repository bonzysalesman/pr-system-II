/**
 * Fix PR Visibility Script
 * 
 * This script updates existing PRs created by test@example.com to:
 * 1. Set their status to PENDING_APPROVAL
 * 2. Assign them to the approver@example.com account
 * 3. Update all necessary fields for proper visibility
 * 
 * It uses the Cloud Functions to perform the updates to bypass client-side permission issues.
 */

import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize dotenv
config();

// Test user and approver emails
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'Test123!'; // We'll sign in as the test user to get proper permissions
const TEST_APPROVER_EMAIL = 'approver@example.com';

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
const functions = getFunctions(app);

// Get the update PR status cloud function
const updatePRStatusFn = httpsCallable(functions, 'updatePRStatus');

async function getTestApproverUser() {
  try {
    // Query users to find the approver account
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', TEST_APPROVER_EMAIL));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No user found with email ${TEST_APPROVER_EMAIL}`);
      return null;
    }
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error fetching approver user:', error);
    return null;
  }
}

async function getCurrentUser() {
  try {
    // Get the current logged in user
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user currently signed in');
      return null;
    }
    
    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.log(`User document not found for ${user.uid}`);
      return {
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email
      };
    }
    
    return {
      id: user.uid,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

async function signInAsTestUser() {
  try {
    console.log(`Signing in as test user ${TEST_USER_EMAIL}...`);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    console.log(`Successfully signed in as ${userCredential.user.email}`);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in as test user:', error);
    return null;
  }
}

async function assignPRsToApprover() {
  try {
    // Sign in first to get proper permissions
    const signedInUser = await signInAsTestUser();
    if (!signedInUser) {
      console.error('Failed to sign in as test user. Cannot proceed.');
      return;
    }
    
    // Get current user details for updating PRs
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('Failed to get current user details. Cannot proceed.');
      return;
    }
    
    console.log(`Signed in as: ${currentUser.firstName || ''} ${currentUser.lastName || ''} <${currentUser.email}>`);
    
    // Get the approver user
    const approver = await getTestApproverUser();
    if (!approver) {
      console.error('Could not find approver user. Make sure to create the approver account first.');
      return;
    }
    
    console.log(`Found approver: ${approver.firstName} ${approver.lastName} (${approver.id})`);

    // Query PRs to find those created by the test user
    const prsRef = collection(db, 'prs');
    const q = query(prsRef, where('requestorEmail', '==', TEST_USER_EMAIL));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No PRs found created by ${TEST_USER_EMAIL}`);
      return;
    }
    
    console.log(`Found ${querySnapshot.size} PRs to update.`);
    
    // Update each PR to assign the approver and set status to PENDING_APPROVAL
    for (const document of querySnapshot.docs) {
      const pr = {
        id: document.id,
        ...document.data()
      };
      
      console.log(`Processing PR ${pr.prNumber || pr.id}...`);
      
      // Skip if already in PENDING_APPROVAL status
      if (pr.status === 'PENDING_APPROVAL') {
        console.log(`PR ${pr.prNumber || pr.id} is already in PENDING_APPROVAL status. Checking approver...`);
        
        // Check if approver is already set correctly
        if (pr.approver === approver.id) {
          console.log(`PR ${pr.prNumber || pr.id} is already assigned to the correct approver.`);
          continue;
        }
      }
      
      console.log(`Updating PR ${pr.prNumber || pr.id} to PENDING_APPROVAL status and assigning to approver...`);
      
      try {
        // First, assign the approver
        const assignApproverFn = httpsCallable(functions, 'assignPRApprover');
        await assignApproverFn({
          prId: pr.id,
          approverId: approver.id,
          notes: 'Assigned via fix script'
        });
        console.log(`Assigned approver ${approver.id} to PR ${pr.prNumber || pr.id}`);
        
        // Then, update the status to PENDING_APPROVAL if not already
        if (pr.status !== 'PENDING_APPROVAL') {
          await updatePRStatusFn({
            prId: pr.id,
            status: 'PENDING_APPROVAL',
            notes: 'Updated via fix script',
            userId: currentUser.id
          });
          console.log(`Updated PR ${pr.prNumber || pr.id} status to PENDING_APPROVAL`);
        }
        
        console.log(`✅ PR ${pr.prNumber || pr.id} successfully updated!`);
      } catch (error) {
        console.error(`Error updating PR ${pr.prNumber || pr.id}:`, error);
      }
    }
    
    console.log('\nAll PRs have been processed.');
    console.log('You can now log in as the approver to see and approve/reject the PRs.');
    console.log('\nTest Approver credentials:');
    console.log(`Email: ${TEST_APPROVER_EMAIL}`);
    console.log('Password: Approver123!');

  } catch (error) {
    console.error('Error assigning PRs to approver:', error);
  }
}

// Run the function
assignPRsToApprover();
