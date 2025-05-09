/**
 * Test script to check notification status for PRs in the system
 * JS version for direct execution
 */
const { collection, getDocs, query, orderBy, limit, where } = require('firebase/firestore');
const { db } = require('../config/firebase');

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Retrieves the most recent notifications from Firestore
 * 
 * @param {number} count - Number of recent notifications to retrieve (default: 10)
 * @returns {Promise<Array>} Array of notification documents
 */
async function getRecentNotifications(count = 10) {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Retrieved ${notifications.length} recent notifications`);
    return notifications;
  } catch (error) {
    console.error('Error retrieving recent notifications:', error);
    return [];
  }
}

/**
 * Gets notifications for a specific PR
 * 
 * @param {string} prId - PR ID to get notifications for
 * @returns {Promise<Array>} Array of notification documents for the PR
 */
async function getPRNotifications(prId) {
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
    
    console.log(`Retrieved ${notifications.length} notifications for PR ${prId}`);
    return notifications;
  } catch (error) {
    console.error(`Error retrieving notifications for PR ${prId}:`, error);
    return [];
  }
}

/**
 * Logs the notification activity for a PR to the console
 * 
 * @param {string} prId - PR ID to check notifications for
 */
async function checkNotificationsForPR(prId) {
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
 * @param {number} count - Number of recent notifications to check (default: 20)
 * @returns {Promise<Array>} Array of failed notification documents
 */
async function checkForFailedNotifications(count = 20) {
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

// PR IDs to check (based on the PR numbers seen in the screenshot)
const PR_IDS_TO_CHECK = [
  // These are placeholders - we'll need the actual IDs
  // You can pass the PR numbers here as well, and we'll attempt to find their IDs
];

// Check for any recent notifications in the system
async function runNotificationChecks() {
  try {
    console.log('======= CHECKING NOTIFICATION SYSTEM =======');
    
    // Check recent notifications
    console.log('\n1. Checking most recent notifications:');
    const recentNotifications = await getRecentNotifications(5);
    
    if (recentNotifications.length === 0) {
      console.log('No recent notifications found in the system.');
    } else {
      console.log(`Found ${recentNotifications.length} recent notifications:`);
      recentNotifications.forEach((notif, i) => {
        console.log(`\nNotification #${i+1}:`);
        console.log(`- PR: ${notif.prNumber || notif.prId}`);
        console.log(`- Type: ${notif.type}`);
        console.log(`- Status: ${notif.status}`);
        console.log(`- Recipients: ${notif.recipients?.join(', ')}`);
        console.log(`- Timestamp: ${notif.timestamp}`);
        if (notif.oldStatus && notif.newStatus) {
          console.log(`- Status Change: ${notif.oldStatus} -> ${notif.newStatus}`);
        }
      });
    }
    
    // Check for specific PRs from the screenshot
    console.log('\n2. Checking notifications for specific PRs:');
    if (PR_IDS_TO_CHECK.length === 0) {
      console.log('No specific PR IDs provided for checking.');
      console.log('Checking for PR numbers 1PW-2023050-RDPMD and 1PW-2023050-GHC89 instead:');
      
      // Check for the PRs seen in the screenshot
      await checkNotificationsForPR('1PW-2023050-RDPMD');
      await checkNotificationsForPR('1PW-2023050-GHC89');
    } else {
      for (const prId of PR_IDS_TO_CHECK) {
        await checkNotificationsForPR(prId);
      }
    }
    
    // Check for any failed notifications
    console.log('\n3. Checking for failed notifications:');
    await checkForFailedNotifications();
    
    console.log('\n======= NOTIFICATION CHECK COMPLETE =======');
  } catch (error) {
    console.error('Error running notification checks:', error);
  }
}

// Run the checks
runNotificationChecks();
