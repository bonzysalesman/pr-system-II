import { doc, getDoc } from 'firebase/firestore';
import { db } from "@/config/firebase";
import { StatusTransitionHandler, NotificationContext, Recipients, EmailContent } from '../types';
import { getBaseUrl } from '../../../utils/environment';

export class SubmittedToPendingApprovalHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    const { prId } = context;
    const recipients: Recipients = {
      to: [], // Will be filled with approver
      cc: [] // Will be filled with requestor and procurement
    };

    // Get PR data to find approver and requestor
    const prRef = doc(db, 'purchaseRequests', prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data();

    // Add current approver as primary recipient - prioritize pr.approver as the single source of truth
    if (pr.approver) {
      // If approver is an object with email
      if (typeof pr.approver === 'object' && pr.approver?.email) {
        recipients.to.push(pr.approver.email);
      } 
      // If approver is a string and looks like an email
      else if (typeof pr.approver === 'string' && pr.approver.includes('@')) {
        recipients.to.push(pr.approver);
      }
      // If approver is just an ID, we'll need to fetch the user details
      else {
        // This would require additional code to fetch user details by ID
        console.log('Approver ID found, but email not available directly:', pr.approver);
      }
    }
    // Fallback to approvalWorkflow.currentApprover only if pr.approver is not available
    else if (pr.approvalWorkflow?.currentApprover?.email) {
      recipients.to.push(pr.approvalWorkflow.currentApprover.email);
    }

    // Add requestor to CC - check multiple possible locations for the email
    // First try the requestor object structure
    if (pr.requestor?.email) {
      recipients.cc?.push(pr.requestor.email);
    } 
    // Then try the requestorEmail field directly
    else if (pr.requestorEmail) {
      recipients.cc?.push(pr.requestorEmail);
    }
    
    // Ensure we always have the requestor email
    if (recipients.cc?.length === 0 && pr.requestor) {
      // Last resort - try to extract email from the requestor string if it's an email format
      const requestorString = pr.requestor.toString();
      if (requestorString.includes('@')) {
        recipients.cc?.push(requestorString);
      }
    }

    // Add procurement to CC
    if (!recipients.cc) {
      recipients.cc = [];
    }
    recipients.cc.push('procurement@1pwrafrica.com');

    // Log the recipients for debugging
    console.log('Notification recipients for pending approval:', {
      to: recipients.to,
      cc: recipients.cc,
      pr: {
        id: prId,
        approver: pr.approver,
        requestor: pr.requestor
      }
    });

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    const { pr, user, notes } = context;
    
    if (!pr) {
      throw new Error('PR data is missing in notification context');
    }

    const baseUrl = getBaseUrl();
    const prViewUrl = `${baseUrl}/pr/${pr.id}`;
    
    // Extract approver's name if available for personalization
    let approverName = 'Approver';
    if (pr.approver && typeof pr.approver === 'object' && pr.approver.firstName) {
      approverName = pr.approver.firstName;
    }
    
    // Format date for display
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format department and category names if available
    const departmentName = typeof pr.department === 'object' ? pr.department.name : pr.department;
    const categoryName = typeof pr.projectCategory === 'object' ? pr.projectCategory.name : pr.projectCategory;
    
    // Get line items summary if available
    let lineItemsHtml = '';
    if (pr.lineItems && pr.lineItems.length > 0) {
      lineItemsHtml = `
        <h3 style="margin-top: 24px; color: #333;">Line Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Description</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Unit Price</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${pr.lineItems.map(item => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.description || 'No description'}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${item.quantity || 0}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${pr.currency || '$'} ${item.unitPrice?.toFixed(2) || '0.00'}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${pr.currency || '$'} ${(item.quantity * item.unitPrice)?.toFixed(2) || '0.00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Include notes from sender if available
    let notesHtml = '';
    if (notes) {
      notesHtml = `
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Notes from Sender</h3>
          <p style="margin-bottom: 0;">${notes}</p>
        </div>
      `;
    }

    // Create action buttons
    const actionButtonsHtml = `
      <div style="margin: 30px 0;">
        <a href="${prViewUrl}" style="display: inline-block; background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold;">Review PR</a>
      </div>
    `;
    
    return {
      subject: `${pr.isUrgent ? '[URGENT] ' : ''}PR #${pr.prNumber} - Pending Your Approval`,
      text: `A purchase request requires your approval. PR #${pr.prNumber} has been submitted and is pending your review.\n\n` +
           `Details:\n` +
           `- PR Number: ${pr.prNumber}\n` +
           `- Requestor: ${pr.requestor?.name || pr.requestor?.email || 'Unknown'}\n` +
           `- Department: ${departmentName || 'Not specified'}\n` +
           `- Category: ${categoryName || 'Not specified'}\n` +
           `- Description: ${pr.description || 'Not provided'}\n` +
           `- Total Amount: ${pr.currency || '$'} ${pr.totalAmount?.toFixed(2) || 'Not specified'}\n` +
           `${notes ? `\nNotes from sender: ${notes}\n` : ''}\n` +
           `Please review this PR at: ${prViewUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2196F3; margin-bottom: 5px;">Purchase Request Pending Approval</h1>
            <p style="font-size: 18px; color: #666;">Action Required</p>
          </div>

          <div style="background-color: #f5f5f5; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <p>Dear ${approverName},</p>
            <p>A purchase request has been sent for your approval on ${currentDate}.</p>
            
            ${pr.isUrgent ? '<p style="color: #ff5722; font-weight: bold;">⚠️ This request is marked as URGENT</p>' : ''}

            <h3 style="margin-top: 24px; color: #333;">PR Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <th style="text-align: left; padding: 8px; width: 30%;">PR Number:</th>
                <td style="padding: 8px;"><strong>${pr.prNumber}</strong></td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <th style="text-align: left; padding: 8px;">Requestor:</th>
                <td style="padding: 8px;">${pr.requestor?.name || pr.requestor?.email || 'Unknown'}</td>
              </tr>
              <tr>
                <th style="text-align: left; padding: 8px;">Department:</th>
                <td style="padding: 8px;">${departmentName || 'Not specified'}</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <th style="text-align: left; padding: 8px;">Project Category:</th>
                <td style="padding: 8px;">${categoryName || 'Not specified'}</td>
              </tr>
              <tr>
                <th style="text-align: left; padding: 8px;">Description:</th>
                <td style="padding: 8px;">${pr.description || 'Not provided'}</td>
              </tr>
              <tr style="background-color: #f2f2f2;">
                <th style="text-align: left; padding: 8px;">Total Amount:</th>
                <td style="padding: 8px;"><strong>${pr.currency || '$'} ${pr.totalAmount?.toFixed(2) || 'Not specified'}</strong></td>
              </tr>
              <tr>
                <th style="text-align: left; padding: 8px;">Date Required:</th>
                <td style="padding: 8px;">${pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : 'Not specified'}</td>
              </tr>
            </table>

            ${notesHtml}
            ${lineItemsHtml}
            
            ${actionButtonsHtml}

            <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all;">${prViewUrl}</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
            <p>This is an automated message from the 1PWR Procurement System. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} 1PWR Group. All rights reserved.</p>
          </div>
        </div>
      `
    };
  }
}
