/**
 * Admin Fix PR Approver Script
 * 
 * This script uses Firebase Admin SDK to bypass security rules and:
 * 1. Find PRs created by test@example.com
 * 2. Update their status to PENDING_APPROVAL
 * 3. Explicitly assign them to the approver@example.com account
 * 
 * NOTE: This script requires admin access to your Firebase project.
 * You'll need to download your Firebase service account key and set
 * the path to it in the GOOGLE_APPLICATION_CREDENTIALS environment variable.
 */

// This script needs to be run with Node.js and the Firebase Admin SDK
// Instructions:
// 1. Download your Firebase service account key from the Firebase console
// 2. Save it as serviceAccountKey.json in a secure location
// 3. Run: GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json node adminFixPRApprover.js

const admin = require('firebase-admin');

// Test user and approver emails
const TEST_USER_EMAIL = 'test@example.com';
const TEST_APPROVER_EMAIL = 'approver@example.com';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function getApproverUser() {
  try {
    // Query users to find the approver account
    const usersSnapshot = await db.collection('users')
      .where('email', '==', TEST_APPROVER_EMAIL)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`No user found with email ${TEST_APPROVER_EMAIL}`);
      return null;
    }
    
    const approver = {
      id: usersSnapshot.docs[0].id,
      ...usersSnapshot.docs[0].data()
    };
    
    console.log(`Found approver: ${approver.firstName} ${approver.lastName} (${approver.id})`);
    return approver;
  } catch (error) {
    console.error('Error fetching approver user:', error);
    return null;
  }
}

async function fixPRsForApprover() {
  try {
    console.log('Starting PR fix for approver visibility...');
    
    // Get the approver user
    const approver = await getApproverUser();
    if (!approver) {
      console.error('Could not find approver user. Cannot proceed.');
      return;
    }
    
    // Query PRs to find those created by the test user
    const prsSnapshot = await db.collection('prs')
      .where('requestorEmail', '==', TEST_USER_EMAIL)
      .get();
    
    if (prsSnapshot.empty) {
      console.log(`No PRs found created by ${TEST_USER_EMAIL}`);
      return;
    }
    
    console.log(`Found ${prsSnapshot.size} PRs to update.`);
    
    // Update each PR
    for (const document of prsSnapshot.docs) {
      const pr = {
        id: document.id,
        ...document.data()
      };
      
      console.log(`Updating PR ${pr.prNumber || pr.id}...`);
      
      // Prepare update data
      const now = admin.firestore.Timestamp.now();
      const updateData = {
        // Set the approver field
        approver: approver.id,
        
        // Update approvalWorkflow
        approvalWorkflow: {
          currentApprover: approver.id,
          lastUpdated: now,
          approvalHistory: pr.approvalWorkflow?.approvalHistory || []
        },
        
        // Set status to PENDING_APPROVAL
        status: 'PENDING_APPROVAL',
        
        // Add to status history
        statusHistory: [
          ...(pr.statusHistory || []),
          {
            status: 'PENDING_APPROVAL',
            timestamp: now,
            user: {
              id: 'admin-script',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'Script'
            },
            notes: 'PR status updated via admin script'
          }
        ],
        
        // Update timestamp
        updatedAt: now
      };
      
      // Update the PR document
      await db.collection('prs').doc(pr.id).update(updateData);
      console.log(`✅ PR ${pr.prNumber || pr.id} updated successfully!`);
    }
    
    console.log('\nAll PRs have been updated.');
    console.log('You can now log in as the approver to see and approve/reject the PRs.');
    console.log('\nTest Approver credentials:');
    console.log(`Email: ${TEST_APPROVER_EMAIL}`);
    console.log('Password: Approver123!');
    
  } catch (error) {
    console.error('Error fixing PRs for approver:', error);
  } finally {
    // Ensure the app exits
    process.exit();
  }
}

// Run the function
fixPRsForApprover();
