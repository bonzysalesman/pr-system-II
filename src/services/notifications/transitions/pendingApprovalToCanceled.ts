import { NotificationContext, Recipients, EmailContent, StatusTransitionHandler } from '../types';
import { getApproverInfo, getRequestorInfo } from '../utils';
import { getProcurementTeamEmails } from '@/services/procurement';

/**
 * Handles the transition from PENDING_APPROVAL to CANCELED status
 */
export class PendingApprovalToCanceledHandler implements StatusTransitionHandler {
  /**
   * Gets the recipients for the notification
   * @param context Notification context
   * @returns Recipients object with to, cc, and bcc fields
   */
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    // Primary recipients are the procurement team
    const procurementTeamEmails = await getProcurementTeamEmails();
    
    // Get requestor and approver information
    const requestorInfo = getRequestorInfo(context);
    const approverInfo = getApproverInfo(context);
    
    // CC the requestor and approver
    const ccList = [];
    if (requestorInfo?.email) {
      ccList.push(requestorInfo.email);
    }
    if (approverInfo?.email && !ccList.includes(approverInfo.email)) {
      ccList.push(approverInfo.email);
    }
    
    return {
      to: procurementTeamEmails,
      cc: ccList
    };
  }

  /**
   * Gets the email content for the notification
   * @param context Notification context
   * @returns Email content object
   */
  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    // Generate subject
    const subject = `PR #${context.prNumber} Canceled`;
    
    // Get requestor info
    const requestorInfo = getRequestorInfo(context);
    const requestorName = requestorInfo?.name || 'Unknown Requestor';
    
    // Get user who made the change
    const changedByUser = context.user?.name || 
      (context.user?.firstName && context.user?.lastName ? 
        `${context.user.firstName} ${context.user.lastName}`.trim() : 
        'Unknown User');
    
    // Base URL for PR link
    const baseUrl = context.baseUrl || 'https://pr-system.1pwrafrica.com';
    const prLink = `${baseUrl}/pr/${context.prId}`;
    
    // Generate HTML content
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f8f8; padding: 20px; border-bottom: 3px solid #e0e0e0;">
        <h2 style="margin: 0; color: #333;">PR #${context.prNumber} Has Been Canceled</h2>
      </div>
      
      <div style="padding: 20px;">
        <p>This purchase request has been canceled by ${changedByUser}.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">PR Number</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${context.prNumber}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Requestor</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${requestorName}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Status Change</th>
            <td style="padding: 8px; border: 1px solid #ddd;">PENDING_APPROVAL → CANCELED</td>
          </tr>
          ${context.notes ? `
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Notes</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${context.notes}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="margin: 20px 0; text-align: center;">
          <a href="${prLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View PR Details</a>
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          This is an automated message from the 1PWR Procurement System. Please do not reply to this email.
        </p>
      </div>
    </div>
    `;
    
    // Generate plain text content
    const text = `
PR #${context.prNumber} Has Been Canceled

This purchase request has been canceled by ${changedByUser}.

PR Number: ${context.prNumber}
Requestor: ${requestorName}
Status Change: PENDING_APPROVAL → CANCELED
${context.notes ? `Notes: ${context.notes}` : ''}

View PR Details: ${prLink}

This is an automated message from the 1PWR Procurement System. Please do not reply to this email.
    `;
    
    return {
      subject,
      html,
      text,
      context
    };
  }
}
