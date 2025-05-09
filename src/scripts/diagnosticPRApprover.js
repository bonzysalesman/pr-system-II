/**
 * PR Approver Diagnostic Script
 * 
 * This script diagnoses why an approver might not be seeing purchase requests.
 * It checks:
 * 1. The approver's permissions, organization, and department
 * 2. The PR's status, organization, department, and assigned approver
 * 3. Any permission or visibility issues
 */

import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function getApproverDetails() {
  try {
    // Query users to find the approver account
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', TEST_APPROVER_EMAIL));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ No user found with email ${TEST_APPROVER_EMAIL}`);
      return null;
    }
    
    const approver = {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    };
    
    console.log('✅ APPROVER ACCOUNT DETAILS:');
    console.log('----------------------------');
    console.log(`ID: ${approver.id}`);
    console.log(`Name: ${approver.firstName} ${approver.lastName}`);
    console.log(`Email: ${approver.email}`);
    console.log(`Permission Level: ${approver.permissionLevel}`);
    console.log(`Organization: ${approver.organization || 'None'}`);
    console.log(`Department: ${approver.department || 'None'}`);
    console.log(`Role: ${approver.role || 'None'}`);
    console.log(`Active: ${approver.isActive ? 'Yes' : 'No'}`);
    console.log('----------------------------');
    
    return approver;
  } catch (error) {
    console.error('Error fetching approver details:', error);
    return null;
  }
}

async function getPRDetails() {
  try {
    // Query PRs to find those created by the test user
    const prsRef = collection(db, 'prs');
    const q = query(prsRef, where('requestorEmail', '==', TEST_USER_EMAIL));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ No PRs found created by ${TEST_USER_EMAIL}`);
      return [];
    }
    
    console.log(`✅ FOUND ${querySnapshot.size} PRs CREATED BY ${TEST_USER_EMAIL}:`);
    console.log('----------------------------');
    
    const prs = [];
    
    for (const document of querySnapshot.docs) {
      const pr = {
        id: document.id,
        ...document.data()
      };
      
      console.log(`PR ID: ${pr.id}`);
      console.log(`PR Number: ${pr.prNumber || 'No PR Number'}`);
      console.log(`Status: ${pr.status || 'No Status'}`);
      console.log(`Organization: ${pr.organization || 'No Organization'}`);
      console.log(`Department: ${pr.department || 'No Department'}`);
      console.log(`Approver: ${pr.approver || 'No Approver'}`);
      console.log(`ApprovalWorkflow: ${pr.approvalWorkflow ? JSON.stringify(pr.approvalWorkflow, null, 2) : 'No Approval Workflow'}`);
      console.log('----------------------------');
      
      prs.push(pr);
    }
    
    return prs;
  } catch (error) {
    console.error('Error fetching PR details:', error);
    return [];
  }
}

async function checkOrganizationMatch(approver, prs) {
  if (!approver || !prs || prs.length === 0) {
    return;
  }
  
  console.log('✅ ORGANIZATION MATCHING ANALYSIS:');
  console.log('----------------------------');
  console.log(`Approver Organization: ${approver.organization || 'None'}`);
  
  for (const pr of prs) {
    const orgMatch = approver.organization === pr.organization;
    console.log(`PR ${pr.prNumber || pr.id}: Organization = ${pr.organization || 'None'}, Matches Approver: ${orgMatch ? 'Yes ✅' : 'No ❌'}`);
  }
  
  console.log('----------------------------');
}

async function checkApprovalFlow(approver, prs) {
  if (!approver || !prs || prs.length === 0) {
    return;
  }
  
  console.log('✅ APPROVAL FLOW ANALYSIS:');
  console.log('----------------------------');
  
  for (const pr of prs) {
    console.log(`PR ${pr.prNumber || pr.id}:`);
    console.log(`Status: ${pr.status || 'No Status'}`);
    console.log(`Assigned Approver: ${pr.approver || 'None'}`);
    
    if (pr.approver === approver.id) {
      console.log(`✅ Approver is correctly assigned`);
    } else {
      console.log(`❌ Approver is NOT assigned correctly`);
    }
    
    if (pr.status === 'PENDING_APPROVAL') {
      console.log(`✅ Status is correctly set to PENDING_APPROVAL`);
    } else {
      console.log(`❌ Status is NOT set to PENDING_APPROVAL (current: ${pr.status})`);
      console.log(`   PRs must be in PENDING_APPROVAL status to appear in the approver's queue`);
    }
    
    console.log('----------------------------');
  }
}

async function suggestFixes(approver, prs) {
  if (!approver || !prs || prs.length === 0) {
    return;
  }
  
  console.log('🔧 SUGGESTED FIXES:');
  console.log('----------------------------');
  
  let hasOrganizationMismatch = false;
  let hasStatusIssue = false;
  let hasApproverAssignmentIssue = false;
  
  for (const pr of prs) {
    if (pr.organization !== approver.organization) {
      hasOrganizationMismatch = true;
    }
    
    if (pr.status !== 'PENDING_APPROVAL') {
      hasStatusIssue = true;
    }
    
    if (pr.approver !== approver.id) {
      hasApproverAssignmentIssue = true;
    }
  }
  
  if (hasOrganizationMismatch) {
    console.log(`1. Organization Mismatch: The PR and approver organizations don't match.`);
    console.log(`   - Update the approver's organization to match the PR's organization`);
    console.log(`   - OR Create a new PR with the correct organization (${approver.organization})`);
  }
  
  if (hasStatusIssue) {
    console.log(`2. Status Issue: One or more PRs are not in PENDING_APPROVAL status.`);
    console.log(`   - The PR needs to be submitted and move to PENDING_APPROVAL status`);
    console.log(`   - You need to use the "Submit for Approval" action as the requestor`);
  }
  
  if (hasApproverAssignmentIssue) {
    console.log(`3. Approver Assignment Issue: One or more PRs don't have the correct approver assigned.`);
    console.log(`   - When creating or editing the PR, make sure to select ${TEST_APPROVER_EMAIL} as the approver`);
    console.log(`   - You may need to resubmit the PR after changing the approver`);
  }
  
  console.log('----------------------------');
}

async function runDiagnostics() {
  try {
    console.log('🔍 RUNNING PR APPROVER VISIBILITY DIAGNOSTICS');
    console.log('============================================');
    
    // Get approver details
    const approver = await getApproverDetails();
    if (!approver) {
      console.log('❌ Cannot proceed without approver details');
      return;
    }
    
    // Get PR details
    const prs = await getPRDetails();
    if (prs.length === 0) {
      console.log('❌ Cannot proceed without any PRs');
      return;
    }
    
    // Check organization match
    await checkOrganizationMatch(approver, prs);
    
    // Check approval flow
    await checkApprovalFlow(approver, prs);
    
    // Suggest fixes
    await suggestFixes(approver, prs);
    
    console.log('============================================');
    console.log('🔍 DIAGNOSTICS COMPLETE');
    
  } catch (error) {
    console.error('Error running diagnostics:', error);
  }
}

// Run the diagnostics
runDiagnostics();
