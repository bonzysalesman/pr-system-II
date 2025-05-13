import { NotificationContext, Recipients, EmailContent, StatusTransitionHandler } from '../types';
import { getApproverInfo, getRequestorInfo } from '../utils';
import { getProcurementTeamEmails } from '@/services/procurement';

/**
 * Handles the transition from PARTIALLY_RECEIVED to COMPLETED status
 */
export class PartiallyReceivedToCompletedHandler implements StatusTransitionHandler {
  /**
   * Gets the recipients for the notification
   * @param context Notification context
   * @returns Recipients object with to, cc, and bcc fields
   */
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    // Primary recipient is the requestor
    const requestorInfo = getRequestorInfo(context);
    const requestorEmail = requestorInfo?.email;
    
    // Get procurement team emails for CC
    const procurementTeamEmails = await getProcurementTeamEmails();
    
    // If requestor email is missing, send to procurement team
    const toList = requestorEmail ? [requestorEmail] : procurementTeamEmails;
    
    // CC procurement team (if not already the primary recipient)
    const ccList = requestorEmail ? procurementTeamEmails : [];
    
    return {
      to: toList,
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
    const subject = `PR #${context.prNumber} Completed - All Items Received`;
    
    // Get requestor info
    const requestorInfo = getRequestorInfo(context);
    const requestorName = requestorInfo?.name || 'Unknown Requestor';
    
    // Get user who made the change
    const changedByUser = context.user?.name || 
      (context.user?.firstName && context.user?.lastName ? 
        `${context.user.firstName} ${context.user.lastName}`.trim() : 
        'Unknown User');
    
    // Extract important PR details
    const prDetails = {
      description: context.pr?.description || 'No description provided',
      department: context.pr?.department || 'Not specified',
      requiredDate: context.pr?.requiredDate || 'Not specified',
      estimatedAmount: context.pr?.estimatedAmount || 0,
      totalAmount: context.pr?.totalAmount || context.pr?.estimatedAmount || 0,
      currency: context.pr?.currency || 'USD',
      vendorName: context.pr?.vendorName || context.pr?.vendor?.name || 'Not specified'
    };
    
    // Base URL for PR link
    const baseUrl = context.baseUrl || 'https://pr-system.1pwrafrica.com';
    const prLink = `${baseUrl}/pr/${context.prId}`;
    
    // Generate HTML content
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #00C851; color: black; padding: 10px; text-align: center; font-weight: bold;">
        PURCHASE REQUEST COMPLETED
      </div>
      
      <div style="background-color: #f8f8f8; padding: 20px; border-bottom: 3px solid #e0e0e0;">
        <h2 style="margin: 0; color: #333;">PR #${context.prNumber} - All Items Received</h2>
      </div>
      
      <div style="padding: 20px;">
        <p>All items for this purchase request have been received and the PR is now complete. Updated by ${changedByUser}.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">PR Number</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${context.prNumber}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Description</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${prDetails.description}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Department</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${prDetails.department}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Required Date</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${prDetails.requiredDate}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Estimated Amount</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: prDetails.currency
            }).format(prDetails.estimatedAmount)}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Final Amount</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: prDetails.currency
            }).format(prDetails.totalAmount)}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Vendor</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${prDetails.vendorName}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Requestor</th>
            <td style="padding: 8px; border: 1px solid #ddd;">${requestorName}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Status Change</th>
            <td style="padding: 8px; border: 1px solid #ddd;">PARTIALLY_RECEIVED → COMPLETED</td>
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
PURCHASE REQUEST COMPLETED

PR #${context.prNumber} - All Items Received

All items for this purchase request have been received and the PR is now complete. Updated by ${changedByUser}.

PR Number: ${context.prNumber}
Description: ${prDetails.description}
Department: ${prDetails.department}
Required Date: ${prDetails.requiredDate}
Estimated Amount: ${new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: prDetails.currency
}).format(prDetails.estimatedAmount)}
Final Amount: ${new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: prDetails.currency
}).format(prDetails.totalAmount)}
Vendor: ${prDetails.vendorName}
Requestor: ${requestorName}
Status Change: PARTIALLY_RECEIVED → COMPLETED
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
