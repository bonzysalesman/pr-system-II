/**
 * PR Debug Helper
 * Utility functions to help debug PR creation and retrieval issues
 */

import { logger } from '@/utils/logger';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PRRequest } from '@/types/pr';

const PR_COLLECTION = 'purchaseRequests';

/**
 * Lists all PRs in the system, regardless of requestor or organization
 * For debugging purposes only - not for production use
 */
export async function listAllPRs(): Promise<{count: number, data: Array<Record<string, any>>}> {
  try {
    logger.info('DEBUG: Listing all PRs in the system');
    
    const prCollectionRef = collection(db, PR_COLLECTION);
    const querySnapshot = await getDocs(prCollectionRef);
    
    const prs: Array<Record<string, any>> = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      prs.push({
        id: doc.id,
        prNumber: data.prNumber,
        status: data.status,
        organization: data.organization,
        requestorId: data.requestorId,
        createdAt: data.createdAt,
        description: data.description
      });
    });
    
    logger.info(`DEBUG: Found ${prs.length} total PRs in the system`);
    return { count: prs.length, data: prs };
  } catch (error) {
    logger.error('DEBUG: Error listing all PRs:', error);
    throw error;
  }
}

/**
 * Verifies if a specific PR exists in Firestore
 * @param prId The PR ID to check
 */
export async function verifyPRExists(prId: string): Promise<boolean> {
  try {
    logger.info(`DEBUG: Checking if PR ${prId} exists`);
    
    const prCollectionRef = collection(db, PR_COLLECTION);
    const q = query(prCollectionRef, where('__name__', '==', prId));
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    logger.info(`DEBUG: PR ${prId} exists: ${exists}`);
    return exists;
  } catch (error) {
    logger.error(`DEBUG: Error checking if PR ${prId} exists:`, error);
    throw error;
  }
}

/**
 * Checks PRs for a specific requestor across all organizations
 * @param requestorId The requestor ID to check
 */
export async function checkRequestorPRs(requestorId: string): Promise<{count: number, data: Array<Record<string, any>>}> {
  try {
    logger.info(`DEBUG: Checking PRs for requestor ${requestorId}`);
    
    const prCollectionRef = collection(db, PR_COLLECTION);
    const q = query(prCollectionRef, where('requestorId', '==', requestorId));
    const querySnapshot = await getDocs(q);
    
    const prs: Array<Record<string, any>> = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      prs.push({
        id: doc.id,
        prNumber: data.prNumber,
        status: data.status,
        organization: data.organization,
        requestorId: data.requestorId,
        createdAt: data.createdAt,
        description: data.description
      });
    });
    
    logger.info(`DEBUG: Found ${prs.length} PRs for requestor ${requestorId}`);
    return { count: prs.length, data: prs };
  } catch (error) {
    logger.error(`DEBUG: Error checking requestor PRs:`, error);
    throw error;
  }
}
