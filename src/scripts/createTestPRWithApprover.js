/**
 * Create Test PR With Approver Script
 * 
 * This script creates a test PR and assigns it to the approver account
 * with PENDING_APPROVAL status to demonstrate the full PR approval workflow.
 */

import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

// Initialize dotenv
config();

// Test user and approver emails
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'Test123!';
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

async function getUser(email) {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(query(usersRef, where('email', '==', email)));
    
    if (snapshot.empty) {
      console.log(`No user found with email ${email}`);
      return null;
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error(`Error fetching user with email ${email}:`, error);
    return null;
  }
}

async function getCurrentUser() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user currently signed in');
      return null;
    }
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      console.log(`User document not found for ${user.uid}`);
      return {
        id: user.uid,
        email: user.email
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

async function getApproverUser() {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('email', '==', TEST_APPROVER_EMAIL));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`No user found with email ${TEST_APPROVER_EMAIL}`);
      return null;
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error fetching approver user:', error);
    return null;
  }
}

async function createPendingApprovalPR() {
  try {
    // Sign in first
    const signedInUser = await signInAsTestUser();
    if (!signedInUser) {
      console.error('Failed to sign in. Cannot proceed.');
      return;
    }
    
    // Get current user details
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error('Failed to get current user details. Cannot proceed.');
      return;
    }
    
    console.log(`Creating PR as: ${currentUser.firstName || ''} ${currentUser.lastName || ''} <${currentUser.email}>`);
    
    // Get approver user
    const approver = await getApproverUser();
    if (!approver) {
      console.error('Could not find approver user. Make sure the approver account exists.');
      return;
    }
    
    console.log(`Found approver: ${approver.firstName} ${approver.lastName} (${approver.id})`);
    
    // Generate a PR number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prNumber = `1PWR-${year}${month}-${randomNum}`;
    
    // Create the PR with PENDING_APPROVAL status
    const prData = {
      prNumber,
      organization: approver.organization || '1pwr_lesotho',
      department: approver.department || 'procurement',
      projectCategory: '5:general',
      description: 'Test PR for approver workflow',
      site: '1pwr_headquarters',
      expenseType: '16 - General',
      estimatedAmount: 1000,
      currency: 'USD',
      requiredDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      requestorId: currentUser.id,
      requestorEmail: currentUser.email,
      requestor: {
        id: currentUser.id,
        email: currentUser.email,
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
      },
      approver: approver.id,
      approvalWorkflow: {
        currentApprover: approver.id,
        lastUpdated: new Date().toISOString(),
        approvalHistory: []
      },
      status: 'PENDING_APPROVAL', // Set status to PENDING_APPROVAL
      lineItems: [
        {
          id: '1',
          description: 'Test Item',
          quantity: 1,
          uom: 'EA',
          unitPrice: 1000,
          totalPrice: 1000,
          notes: 'Test item for approver workflow',
          attachments: []
        }
      ],
      quotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isUrgent: false,
      statusHistory: [
        {
          status: 'SUBMITTED',
          timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          user: {
            id: currentUser.id,
            email: currentUser.email,
            firstName: currentUser.firstName || '',
            lastName: currentUser.lastName || ''
          }
        },
        {
          status: 'PENDING_APPROVAL',
          timestamp: new Date().toISOString(),
          user: {
            id: currentUser.id,
            email: currentUser.email,
            firstName: currentUser.firstName || '',
            lastName: currentUser.lastName || ''
          },
          notes: 'Sent for approval via script'
        }
      ],
      totalAmount: 1000
    };
    
    // Add to Firestore
    const prRef = await addDoc(collection(db, 'prs'), prData);
    console.log(`✅ Created test PR: ${prNumber} (ID: ${prRef.id})`);
    console.log(`This PR has been assigned to approver: ${approver.firstName} ${approver.lastName}`);
    console.log(`Status: PENDING_APPROVAL`);
    
    console.log('\nYou can now log in as the approver to see and approve/reject this PR.');
    console.log('\nTest Approver credentials:');
    console.log(`Email: ${TEST_APPROVER_EMAIL}`);
    console.log('Password: Approver123!');
    
  } catch (error) {
    console.error('Error creating test PR:', error);
  }
}

// Run the function
createPendingApprovalPR();
