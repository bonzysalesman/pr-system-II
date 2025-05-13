import { PRStatus } from '../../../types/pr';
import { StatusTransitionHandler } from '../types';
import { NewPRSubmittedHandler } from './newPRSubmitted';
import { SubmittedToRevisionRequiredHandler } from './submittedToRevisionRequired';
import { RevisionRequiredToResubmittedHandler } from './revisionRequiredToResubmitted';
import { SubmittedToPendingApprovalHandler } from './submittedToPendingApproval';
import { PendingApprovalToApprovedHandler } from './pendingApprovalToApproved';
import { PendingApprovalToRejectedHandler } from './pendingApprovalToRejected';
import { SubmittedToCanceledHandler } from './submittedToCanceled';
import { PendingApprovalToCanceledHandler } from './pendingApprovalToCanceled';
import { ApprovedToOrderedHandler } from './approvedToOrdered';
import { OrderedToPartiallyReceivedHandler } from './orderedToPartiallyReceived';
import { PartiallyReceivedToCompletedHandler } from './partiallyReceivedToCompleted';

// Map of status transitions to their handlers
const transitionHandlers = new Map<string, StatusTransitionHandler>();

// Helper function to create transition key
function createTransitionKey(oldStatus: PRStatus | null, newStatus: PRStatus): string {
  return `${oldStatus || 'NEW'}->${newStatus}`;
}

// Register all transition handlers
transitionHandlers.set(createTransitionKey(null, PRStatus.SUBMITTED), new NewPRSubmittedHandler());
transitionHandlers.set(createTransitionKey(PRStatus.SUBMITTED, PRStatus.REVISION_REQUIRED), new SubmittedToRevisionRequiredHandler());
transitionHandlers.set(createTransitionKey(PRStatus.REVISION_REQUIRED, PRStatus.SUBMITTED), new RevisionRequiredToResubmittedHandler());
transitionHandlers.set(createTransitionKey(PRStatus.SUBMITTED, PRStatus.PENDING_APPROVAL), new SubmittedToPendingApprovalHandler());
// Also use the same handler for IN_QUEUE to PENDING_APPROVAL transition
transitionHandlers.set(createTransitionKey(PRStatus.IN_QUEUE, PRStatus.PENDING_APPROVAL), new SubmittedToPendingApprovalHandler());
transitionHandlers.set(createTransitionKey(PRStatus.PENDING_APPROVAL, PRStatus.APPROVED), new PendingApprovalToApprovedHandler());
transitionHandlers.set(createTransitionKey(PRStatus.PENDING_APPROVAL, PRStatus.REJECTED), new PendingApprovalToRejectedHandler());
// Add handlers for cancellation status transitions
transitionHandlers.set(createTransitionKey(PRStatus.SUBMITTED, PRStatus.CANCELED), new SubmittedToCanceledHandler());
transitionHandlers.set(createTransitionKey(PRStatus.PENDING_APPROVAL, PRStatus.CANCELED), new PendingApprovalToCanceledHandler());
// Add handlers for order processing and delivery status transitions
transitionHandlers.set(createTransitionKey(PRStatus.APPROVED, PRStatus.ORDERED), new ApprovedToOrderedHandler());
transitionHandlers.set(createTransitionKey(PRStatus.ORDERED, PRStatus.PARTIALLY_RECEIVED), new OrderedToPartiallyReceivedHandler());
transitionHandlers.set(createTransitionKey(PRStatus.PARTIALLY_RECEIVED, PRStatus.COMPLETED), new PartiallyReceivedToCompletedHandler());

export function getTransitionHandler(oldStatus: PRStatus | null, newStatus: PRStatus): StatusTransitionHandler | undefined {
  return transitionHandlers.get(createTransitionKey(oldStatus, newStatus));
}
