/**
 * @fileoverview Approver PRs Service
 * @version 1.0.0
 * 
 * Description:
 * Service to fetch PRs that are pending approval for a specific approver.
 * Addresses a gap in the current PR fetching system where approvers
 * cannot see PRs assigned to them for approval.
 */

import { collection, query, where, getDocs, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PRRequest, PRStatus } from '@/types/pr';
import { logger } from '@/utils/logger';

// Collection name for PRs - must match collection in pr.ts
const PR_COLLECTION = 'purchaseRequests';

/**
 * Helper function to safely convert Firestore Timestamps to ISO strings
 * @param timestamp - The timestamp to convert
 * @returns ISO string representation or undefined
 */
function safeTimestampToISO(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  
  try {
    if (typeof timestamp === 'string') return timestamp;
    
    if (typeof timestamp === 'object') {
      if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
        // Firebase Timestamp
        return timestamp.toDate().toISOString();
      }
      
      if ('seconds' in timestamp) {
        // Timestamp-like object
        return new Date(timestamp.seconds * 1000).toISOString();
      }
    }
    
    return undefined;
  } catch (error) {
    logger.error('Error converting timestamp:', error);
    return undefined;
  }
}

/**
 * Fetch PRs that require approval from a specific approver
 * 
 * @param approverId - ID of the approver
 * @param organization - Optional organization filter
 * @returns Promise resolving to an array of PRs pending approval
 */
export async function getPendingApprovalPRs(
  approverId: string,
  organization?: string
): Promise<PRRequest[]> {
  logger.info(`Fetching PRs pending approval for approver ${approverId}, org: ${organization}`);
  
  if (!approverId) {
    logger.error('getPendingApprovalPRs called without approverId');
    throw new Error('Approver ID is required to fetch pending approval PRs.');
  }
  
  try {
    const prCollectionRef = collection(db, PR_COLLECTION);
    const constraints: QueryConstraint[] = [];
    
    // When working with Firestore security rules, we need to be careful with queries
    // Simple approach: First filter by status, which is likely allowed by security rules
    constraints.push(where('status', '==', PRStatus.PENDING_APPROVAL));
    
    // Then filter by approver (this requires an index in Firestore)
    constraints.push(where('approver', '==', approverId));
    
    // Note: We're not using orderBy since it might require composite indexes
    // and could cause permission issues if security rules aren't configured correctly
    
    const q = query(prCollectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const prs: PRRequest[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      prs.push({
        id: docSnapshot.id,
        ...data,
        createdAt: safeTimestampToISO(data.createdAt),
        updatedAt: safeTimestampToISO(data.updatedAt),
        requiredDate: safeTimestampToISO(data.requiredDate),
        // Ensure nested timestamps are also converted
        statusHistory: (data.statusHistory || []).map((item: any) => ({
          ...item,
          timestamp: safeTimestampToISO(item.timestamp),
        })),
        approvalWorkflow: data.approvalWorkflow ? {
          ...data.approvalWorkflow,
          lastUpdated: safeTimestampToISO(data.approvalWorkflow.lastUpdated),
          approvalHistory: (data.approvalWorkflow.approvalHistory || []).map((item: any) => ({
            ...item,
            timestamp: safeTimestampToISO(item.timestamp),
          })),
        } : undefined,
      } as PRRequest);
    });
    
    logger.info(`Fetched ${prs.length} PRs pending approval for approver ${approverId}`);
    return prs;
    
  } catch (error) {
    logger.error(`Failed to fetch PRs pending approval for approver ${approverId}:`, error);
    throw new Error(`Failed to retrieve PRs pending approval: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Service object for easy import
export const approverPRService = {
  getPendingApprovalPRs,
};
