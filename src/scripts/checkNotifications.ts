/**
 * Test script to check notification status for PRs in the system
 */
import { getRecentNotifications, getPRNotifications, checkNotificationsForPR, checkForFailedNotifications } from '../utils/debugNotificationHelper';

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
