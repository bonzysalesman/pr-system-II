/**
 * @fileoverview Debug Notification Helper
 * @version 1.0.0
 * 
 * Description:
 * Utility functions for debugging notification functionality in the PR system.
 * These functions help verify if notifications are being sent and logged correctly.
 */

import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Retrieves the most recent notifications from Firestore
 * 
 * @param count - Number of recent notifications to retrieve (default: 10)
 * @returns Array of notification documents
 */
export async function getRecentNotifications(count: number = 10): Promise<any[]> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.debug(`Retrieved ${notifications.length} recent notifications`);
    return notifications;
  } catch (error) {
    logger.error('Error retrieving recent notifications:', error);
    return [];
  }
}

/**
 * Gets notifications for a specific PR
 * 
 * @param prId - PR ID to get notifications for
 * @returns Array of notification documents for the PR
 */
export async function getPRNotifications(prId: string): Promise<any[]> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef, 
      where('prId', '==', prId), 
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.debug(`Retrieved ${notifications.length} notifications for PR ${prId}`);
    return notifications;
  } catch (error) {
    logger.error(`Error retrieving notifications for PR ${prId}:`, error);
    return [];
  }
}

/**
 * Logs the notification activity for a PR to the console
 * 
 * @param prId - PR ID to check notifications for
 */
export async function checkNotificationsForPR(prId: string): Promise<void> {
  try {
    const notifications = await getPRNotifications(prId);
    
    if (notifications.length === 0) {
      console.log(`No notifications found for PR ${prId}`);
      return;
    }
    
    console.log(`===== Notifications for PR ${prId} =====`);
    notifications.forEach((notification, index) => {
      console.log(`\nNotification #${index + 1}:`);
      console.log(`Type: ${notification.type}`);
      console.log(`Status: ${notification.status}`);
      console.log(`Recipients: ${notification.recipients?.join(', ')}`);
      console.log(`Timestamp: ${notification.timestamp}`);
      
      if (notification.oldStatus && notification.newStatus) {
        console.log(`Status Change: ${notification.oldStatus} -> ${notification.newStatus}`);
      }
      
      // Show additional metadata if needed
      console.log(`Additional Data: ${JSON.stringify({
        prNumber: notification.prNumber,
        notes: notification.notes,
      }, null, 2)}`);
    });
    
    console.log(`\nTotal notifications for PR ${prId}: ${notifications.length}`);
  } catch (error) {
    console.error(`Error checking notifications for PR ${prId}:`, error);
  }
}

/**
 * Check if there are any failed notifications in the system
 * 
 * @param count - Number of recent notifications to check (default: 20)
 * @returns Array of failed notification documents
 */
export async function checkForFailedNotifications(count: number = 20): Promise<any[]> {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef, 
      where('status', '!=', 'SENT'),
      orderBy('status'),
      orderBy('timestamp', 'desc'), 
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    
    const failedNotifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`===== Failed Notifications =====`);
    if (failedNotifications.length === 0) {
      console.log('No failed notifications found');
    } else {
      failedNotifications.forEach((notification, index) => {
        console.log(`\nFailed Notification #${index + 1}:`);
        console.log(`PR ID: ${notification.prId}`);
        console.log(`PR Number: ${notification.prNumber}`);
        console.log(`Type: ${notification.type}`);
        console.log(`Status: ${notification.status}`);
        console.log(`Timestamp: ${notification.timestamp}`);
      });
      
      console.log(`\nTotal failed notifications: ${failedNotifications.length}`);
    }
    
    return failedNotifications;
  } catch (error) {
    console.error('Error checking for failed notifications:', error);
    return [];
  }
}
