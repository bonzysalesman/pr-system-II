/**
 * @fileoverview PR Notification Debugger
 * @version 1.0.0
 * 
 * Description:
 * Utility functions for debugging notification functionality directly
 * from the PR system components. This can be injected into the PR creation
 * or viewing components to trace notification events.
 */

import { collection, getDocs, query, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

// The notification system might be using one of these collection names
const NOTIFICATIONS_COLLECTION = 'notifications';
const PR_NOTIFICATIONS_COLLECTION = 'purchaseRequestsNotifications';

// List of collections to check for notifications
const NOTIFICATION_COLLECTIONS = [
  NOTIFICATIONS_COLLECTION,
  PR_NOTIFICATIONS_COLLECTION
];
const PR_COLLECTION = 'prs';

/**
 * Get PR document by PR number
 * 
 * @param prNumber - The PR number to look up
 * @returns The PR document or null if not found
 */
export async function getPRByNumber(prNumber: string): Promise<any> {
  try {
    const prsRef = collection(db, PR_COLLECTION);
    const q = query(prsRef, where('prNumber', '==', prNumber));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No PR found with number ${prNumber}`);
      return null;
    }
    
    const prDoc = querySnapshot.docs[0];
    return {
      id: prDoc.id,
      ...prDoc.data()
    };
  } catch (error) {
    console.error(`Error finding PR with number ${prNumber}:`, error);
    return null;
  }
}

/**
 * Check if notifications exist for a PR by PR number
 * 
 * @param prNumber - The PR number to check notifications for
 */
export async function checkNotificationsForPRNumber(prNumber: string): Promise<void> {
  try {
    console.log(`Looking up PR with number ${prNumber}...`);
    const pr = await getPRByNumber(prNumber);
    
    if (!pr) {
      console.log(`Could not find PR with number ${prNumber}`);
      return;
    }
    
    console.log(`Found PR: ${pr.id} (${pr.prNumber})`);
    await checkNotificationsForPR(pr.id);
  } catch (error) {
    console.error(`Error checking notifications for PR number ${prNumber}:`, error);
  }
}

/**
 * Gets notifications for a specific PR by checking all possible notification collections
 * 
 * @param prId - PR ID to get notifications for
 * @returns Array of notification documents for the PR
 */
export async function getNotificationsForPR(prId: string): Promise<any[]> {
  try {
    let allNotifications: any[] = [];
    
    // Check each possible collection where notifications might be stored
    for (const collectionName of NOTIFICATION_COLLECTIONS) {
      try {
        console.log(`Checking collection '${collectionName}' for PR notifications...`);
        
        // First try with both filter and orderBy
        try {
          const notificationsRef = collection(db, collectionName);
          const q = query(
            notificationsRef, 
            where('prId', '==', prId), 
            orderBy('timestamp', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName, // Add source collection for debugging
            ...doc.data()
          }));
          
          console.log(`Found ${notifications.length} notifications in '${collectionName}' with ordered query`);
          allNotifications.push(...notifications);
        } catch (indexError) {
          // If index error occurs, fall back to a simpler query without ordering
          console.log(`Index error for '${collectionName}', using simpler query for PR ${prId}`);
          
          const notificationsRef = collection(db, collectionName);
          const q = query(
            notificationsRef, 
            where('prId', '==', prId)
          );
          
          const querySnapshot = await getDocs(q);
          const notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName, // Add source collection for debugging
            ...doc.data()
          }));
          
          console.log(`Found ${notifications.length} notifications in '${collectionName}' with basic query`);
          allNotifications.push(...notifications);
        }
      } catch (collectionError) {
        console.log(`Error checking collection '${collectionName}':`, collectionError);
        // Continue to the next collection even if one fails
      }
    }
    
    // Sort all notifications by timestamp if we found any
    if (allNotifications.length > 0) {
      console.log(`Found a total of ${allNotifications.length} notifications across all collections`);
      
      // Sort by timestamp manually across all collections
      return allNotifications.sort((a, b) => {
        // Handle different timestamp formats (server timestamp, ISO string, etc.)
        const getTime = (item: any) => {
          if (!item.timestamp) return 0;
          if (typeof item.timestamp === 'string') {
            return new Date(item.timestamp).getTime();
          }
          // Handle Firebase Timestamp objects
          if (item.timestamp.toDate) {
            return item.timestamp.toDate().getTime();
          }
          return 0;
        };
        
        // Sort descending (most recent first)
        return getTime(b) - getTime(a);
      });
    }
    
    console.log(`No notifications found for PR ${prId} in any collections`);
    return [];
  } catch (error) {
    console.error(`Error retrieving notifications for PR ${prId}:`, error);
    return [];
  }
}

/**
 * Logs the notification activity for a PR to the console with detailed diagnostics
 * 
 * @param prId - PR ID to check notifications for
 */
export async function checkNotificationsForPR(prId: string): Promise<void> {
  try {
    console.log(`\n===== NOTIFICATION CHECK FOR PR ${prId} =====`);
    console.log(`Checking all possible notification collections...`);
    
    // First check if the PR actually exists
    try {
      const prDocRef = doc(db, PR_COLLECTION, prId);
      const prDoc = await getDoc(prDocRef);
      if (!prDoc.exists()) {
        console.log(`⚠️ Warning: PR ${prId} does not exist in Firestore. Notifications may not be found.`);
      } else {
        const pr = prDoc.data();
        console.log(`✅ PR ${prId} found with number ${pr.prNumber || 'unknown'} and status ${pr.status || 'unknown'}`);
      }
    } catch (prCheckError) {
      console.log(`⚠️ Error checking if PR exists:`, prCheckError);
    }
    
    // Get notifications from all possible collections
    const notifications = await getNotificationsForPR(prId);
    
    if (notifications.length === 0) {
      console.log(`\n⚠️ No notifications found for PR ${prId} in any collections.`);
      console.log(`\nPossible reasons for missing notifications:`);
      console.log(`1. The notification was never triggered (check the transition handlers)`);
      console.log(`2. The notification cloud function failed to execute`);
      console.log(`3. The notification was sent but not logged to Firestore`);
      console.log(`4. The PR ID might be incorrect or the PR is too new`);
      console.log(`\nRecommended actions:`);
      console.log(`1. Check the browser console for cloud function errors`);
      console.log(`2. Verify that Firebase Cloud Functions are properly deployed`);
      console.log(`3. Check that debug email configuration is properly set up`);
      return;
    }
    
    console.log(`\n✅ Found ${notifications.length} notifications for PR ${prId}.`);
    
    // Group notifications by collection for better readability
    const notificationsByCollection: Record<string, any[]> = {};
    notifications.forEach(notification => {
      const collection = notification.collection || 'unknown';
      if (!notificationsByCollection[collection]) {
        notificationsByCollection[collection] = [];
      }
      notificationsByCollection[collection].push(notification);
    });
    
    // Display notifications grouped by collection
    Object.entries(notificationsByCollection).forEach(([collection, notifs]) => {
      console.log(`\n📩 Notifications in collection '${collection}': ${notifs.length}`);
      
      notifs.forEach((notification, index) => {
        console.log(`\nNotification #${index + 1}:`);
        console.log(`Type: ${notification.type || 'unknown'}`);
        console.log(`Status: ${notification.status || 'unknown'}`);
        
        // Format recipients for better readability
        if (notification.recipients && notification.recipients.length > 0) {
          console.log(`Recipients: ${notification.recipients.join(', ')}`);
        } else {
          console.log(`Recipients: None or not recorded`);
        }
        
        // Display email details if available
        if (notification.emailContent) {
          console.log(`Email Subject: ${notification.emailContent.subject || 'No subject'}`);
        }
        
        // Format timestamp
        let timestamp = notification.timestamp;
        if (timestamp) {
          if (typeof timestamp === 'object' && timestamp.toDate) {
            timestamp = timestamp.toDate().toISOString();
          }
          console.log(`Timestamp: ${timestamp}`);
        } else {
          console.log(`Timestamp: Not recorded`);
        }
        
        // Show status change if applicable
        if (notification.oldStatus && notification.newStatus) {
          console.log(`Status Change: ${notification.oldStatus} -> ${notification.newStatus}`);
        }
        
        // Show additional relevant metadata
        const relevantData = {
          prNumber: notification.prNumber,
          notes: notification.notes,
          user: notification.user ? `${notification.user.firstName || ''} ${notification.user.lastName || ''}`.trim() : undefined,
          metadata: notification.metadata
        };
        
        // Only display non-undefined values
        const filteredData = Object.fromEntries(
          Object.entries(relevantData).filter(([_, v]) => v !== undefined)
        );
        
        if (Object.keys(filteredData).length > 0) {
          console.log(`Additional Data: ${JSON.stringify(filteredData, null, 2)}`);
        }
      });
    });
    
    console.log(`\n===== NOTIFICATION CHECK COMPLETE =====`);
  } catch (error) {
    console.error(`Error checking notifications for PR ${prId}:`, error);
  }
}

/**
 * Debug function that checks the entire notification system configuration
 */
export async function verifyNotificationSystem(): Promise<void> {
  console.log('\n===== NOTIFICATION SYSTEM VERIFICATION =====');
  
  // 1. Check debug email configuration
  verifyDebugEmailConfiguration();
  
  // 2. Check for recent notifications in the system
  await checkForRecentNotifications(5);
  
  // 3. Check notifications for a specific PR
  await checkNotificationsForPR('12345'); // Replace with a test PR ID
  
  // 4. Provide general diagnostics
  console.log('\n===== NOTIFICATION SYSTEM STATUS =====');
  console.log('If you are not seeing notifications for a PR, check the following:');
  console.log('1. Firestore database - check if notifications are being stored');
  console.log('2. Browser console - check for cloud function errors');
  console.log('3. Debug email inbox - check if emails are being delivered');
  console.log('4. Cloud Functions dashboard - check if functions are deployed correctly');
  console.log('===== VERIFICATION COMPLETE =====');
}

/**
 * Debug function that will check if the debugEmailUtil is correctly adding
 * the debug email to notifications
 */
export function verifyDebugEmailConfiguration(): void {
  try {
    // Try to import the debug email utilities
    let DEV_EMAIL: string = 'unknown';
    let INCLUDE_DEBUG_EMAIL: boolean = false;
    let addDebugRecipient: Function;
    
    try {
      // Dynamically import to avoid circular dependencies
      const debugEmailModule = require('@/utils/debugEmailUtil');
      DEV_EMAIL = debugEmailModule.DEV_EMAIL;
      INCLUDE_DEBUG_EMAIL = debugEmailModule.INCLUDE_DEBUG_EMAIL;
      addDebugRecipient = debugEmailModule.addDebugRecipient;
    } catch (importError) {
      console.error('Could not import debugEmailUtil module:', importError);
      console.log('❌ Debug email configuration is not accessible');
      return;
    }
    
    console.log('\n===== Debug Email Configuration =====');
    console.log(`Debug Email Enabled: ${INCLUDE_DEBUG_EMAIL}`);
    console.log(`Debug Email Address: ${DEV_EMAIL}`);
    
    // Test the function with a sample recipient list
    const testRecipients = {
      to: ['user@example.com'],
      cc: ['manager@example.com']
    };
    
    const result = addDebugRecipient(testRecipients);
    
    console.log('Test recipient transformation:');
    console.log('Before:', JSON.stringify(testRecipients));
    console.log('After:', JSON.stringify(result));
    
    if (INCLUDE_DEBUG_EMAIL && result.cc?.includes(DEV_EMAIL)) {
      console.log(`✅ Debug email correctly added to CC list`);
    } else if (!INCLUDE_DEBUG_EMAIL) {
      console.log(`ℹ️ Debug email feature is disabled`);
    } else {
      console.log(`❌ Debug email NOT added to CC list - check implementation`);
    }
  } catch (error) {
    console.error('Error verifying debug email configuration:', error);
  }
}

/**
 * Check for recent notifications in the system across all collections
 * 
 * @param count - Number of recent notifications to retrieve
 */
export async function checkForRecentNotifications(count: number = 5): Promise<void> {
  console.log('\n===== Checking Recent Notifications =====');
  let totalFound = 0;
  
  for (const collectionName of NOTIFICATION_COLLECTIONS) {
    try {
      console.log(`Looking for recent notifications in '${collectionName}'...`);
      const notificationsRef = collection(db, collectionName);
      
      // Try with timestamp ordering first, but have fallback
      try {
        const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(count));
        const querySnapshot = await getDocs(q);
        const notifications = querySnapshot.docs.map(doc => ({
          id: doc.id,
          collection: collectionName,
          ...doc.data()
        }));
        
        if (notifications.length > 0) {
          console.log(`Found ${notifications.length} recent notifications in '${collectionName}'`);
          notifications.forEach((notification, i) => {
            console.log(`\nNotification #${i+1} (${notification.id})`);
            console.log(`Type: ${(notification as any).type || 'unknown'}`);
            console.log(`PR: ${(notification as any).prNumber || (notification as any).prId || 'unknown'}`);
            console.log(`Status: ${(notification as any).status || 'unknown'}`);
            
            // Format timestamp for display
            let timestamp = (notification as any).timestamp;
            if (timestamp) {
              if (typeof timestamp === 'object' && timestamp.toDate) {
                timestamp = timestamp.toDate().toISOString();
              }
              console.log(`Time: ${timestamp}`);
            }
          });
          
          totalFound += notifications.length;
        } else {
          console.log(`No recent notifications found in '${collectionName}'`);
        }
      } catch (indexError) {
        // If index error occurs, try without ordering
        console.log(`Index error in '${collectionName}', trying without ordering...`);
        
        const q = query(notificationsRef, limit(count));
        const querySnapshot = await getDocs(q);
        const notifications = querySnapshot.docs.map(doc => ({
          id: doc.id,
          collection: collectionName,
          ...doc.data()
        }));
        
        if (notifications.length > 0) {
          console.log(`Found ${notifications.length} notifications in '${collectionName}' (unordered)`);
          totalFound += notifications.length;
        } else {
          console.log(`No notifications found in '${collectionName}'`);
        }
      }
    } catch (error) {
      console.error(`Error checking collection '${collectionName}':`, error);
    }
  }
  
  if (totalFound === 0) {
    console.log('\n⚠️ No notifications found in any collection. Possible issues:');
    console.log('1. The notification system may not be properly initialized');
    console.log('2. No PRs have been created or updated yet');
    console.log('3. Cloud functions for notifications may not be deployed');
  } else {
    console.log(`\n✅ Found a total of ${totalFound} notifications across all collections`);
  }
}
