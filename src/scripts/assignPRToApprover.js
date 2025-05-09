/**
 * Assign PRs to Test Approver Script
 * 
 * This script finds existing PRs created by test@example.com and assigns them to
 * the approver@example.com account, as well as setting the status to PENDING_APPROVAL.
 */

import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

// Initialize dotenv
config();

// Test user and approver emails
const TEST_USER_EMAIL = 'test@example.com';
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
const db = getFirestore(app);

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

async function assignPRsToApprover() {
  try {
    console.log('Finding PRs created by test user...');
    
    // Get the approver user first
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
      
      console.log(`Updating PR ${pr.prNumber || pr.id}...`);
      
      const updates = {
        // Set the approver field (single source of truth)
        approver: approver.id,
        
        // Update the approvalWorkflow if it exists, otherwise create it
        approvalWorkflow: {
          currentApprover: approver.id,
          lastUpdated: new Date().toISOString(),
          approvalHistory: pr.approvalWorkflow?.approvalHistory || []
        },
        
        // Set the status to PENDING_APPROVAL
        status: 'PENDING_APPROVAL',
        
        // Update the statusHistory
        statusHistory: [
          ...(pr.statusHistory || []),
          {
            status: 'PENDING_APPROVAL',
            timestamp: new Date().toISOString(),
            user: {
              id: 'system',
              email: 'system@example.com',
              firstName: 'System',
              lastName: 'Script'
            },
            notes: 'PR assigned to approver via script'
          }
        ],
        
        // Set updated timestamp
        updatedAt: new Date().toISOString()
      };
      
      // Update the PR
      await updateDoc(doc(db, 'prs', pr.id), updates);
      console.log(`✅ PR ${pr.prNumber || pr.id} updated successfully!`);
    }
    
    console.log('\nAll PRs have been updated. The approver should now see these PRs in their approval queue.');
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
