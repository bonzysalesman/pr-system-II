/**
 * Approver Review Panel
 * 
 * This component provides a dedicated interface for approvers to review PRs
 * and take approval actions. It displays relevant PR information in a structured format
 * optimized for approval decisions.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ThumbUp as ApproveIcon,
  ThumbDown as RejectIcon,
  Edit as ReviseIcon,
  PlaylistAddCheck as ChecklistIcon,
  ReceiptLong as ReceiptIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { PRRequest, PRStatus } from '@/types/pr';
import { User } from '@/types/user';
import { updatePRStatus } from '@/services/pr';
import { formatCurrency } from '@/utils/formatters';

interface ApproverReviewPanelProps {
  pr: PRRequest;
  currentUser: User;
  assignedApprover?: User | null;
  onStatusChange?: () => void;
}

export function ApproverReviewPanel({ pr, currentUser, assignedApprover, onStatusChange }: ApproverReviewPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | 'revise' | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Safety check - if props are missing, don't render
  if (!pr || !currentUser) {
    return null;
  }

  // Check if user is the assigned approver for this PR
  const isApprover = currentUser.id === assignedApprover?.id || currentUser.id === pr.approver;
  
  // Only show review panel to the assigned approver when PR is in PENDING_APPROVAL
  if (pr.status !== PRStatus.PENDING_APPROVAL || !isApprover) {
    return null;
  }

  // Calculate days pending approval
  const calculateDaysPending = (): number => {
    try {
      if (!pr.statusHistory) return 0;
      
      // Find status history entry for PENDING_APPROVAL
      const pendingEntry = pr.statusHistory.find(item => item.status === 'PENDING_APPROVAL');
      
      if (!pendingEntry?.timestamp) return 0;
      
      const pendingDate = new Date(pendingEntry.timestamp);
      const currentDate = new Date();
      
      const diffTime = Math.abs(currentDate.getTime() - pendingDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days pending:', error);
      return 0;
    }
  };

  const daysPending = calculateDaysPending();
  const isUrgent = pr.isUrgent || daysPending > 5;

  // Handle action button click
  const handleActionClick = (action: 'approve' | 'reject' | 'revise') => {
    setSelectedAction(action);
    setIsDialogOpen(true);
    setNotes('');
    setError(null);
  };

  // Handle dialog close
  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedAction(null);
    setNotes('');
    setError(null);
  };

  // Process the selected action (approve, reject, or request revision)
  const handleProcessAction = async () => {
    if (!selectedAction || !currentUser) {
      return;
    }

    // For reject action, notes are required
    if (selectedAction === 'reject' && !notes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let newStatus;
      switch (selectedAction) {
        case 'approve':
          newStatus = PRStatus.APPROVED;
          break;
        case 'reject':
          newStatus = PRStatus.REJECTED;
          break;
        case 'revise':
          newStatus = PRStatus.REVISION_REQUIRED;
          break;
        default:
          setError('Invalid action selected');
          setLoading(false);
          return;
      }

      // Update PR status
      await updatePRStatus(
        pr.id,
        newStatus,
        notes || `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}d by ${currentUser.name || currentUser.email}`,
        currentUser
      );

      // Show success notification
      const actionText = selectedAction === 'approve' ? 'approved' : 
                        selectedAction === 'reject' ? 'rejected' : 
                        'sent back for revision';
      enqueueSnackbar(`PR #${pr.prNumber} has been ${actionText}`, { variant: 'success' });
      
      // Close dialog and refresh parent component
      handleClose();
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error processing PR action:', error);
      setError(error instanceof Error ? error.message : 'Failed to process your action');
    } finally {
      setLoading(false);
    }
  };

  // Get action button label based on selected action
  const getActionLabel = () => {
    switch (selectedAction) {
      case 'approve':
        return 'Approve PR';
      case 'reject':
        return 'Reject PR';
      case 'revise':
        return 'Request Revision';
      default:
        return '';
    }
  };

  // Get dialog content based on selected action
  const getDialogContent = () => {
    switch (selectedAction) {
      case 'approve':
        return (
          <>
            <DialogContent>
              <Typography paragraph>
                You are about to approve PR #{pr.prNumber} for {formatCurrency(pr.totalAmount || pr.estimatedAmount, pr.currency)}.
              </Typography>
              <TextField
                autoFocus
                label="Approval Notes (Optional)"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="Add any comments or instructions for this approval"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleProcessAction} 
                variant="contained" 
                color="primary"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <ApproveIcon />}
              >
                {loading ? 'Processing...' : 'Confirm Approval'}
              </Button>
            </DialogActions>
          </>
        );
      case 'reject':
        return (
          <>
            <DialogContent>
              <Typography paragraph>
                You are about to reject PR #{pr.prNumber}. Please provide a reason for rejection.
              </Typography>
              <TextField
                autoFocus
                label="Reason for Rejection"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                variant="outlined"
                required
                error={!!error}
                helperText={error || "This message will be sent to the requestor"}
                placeholder="Explain why this purchase request is being rejected"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleProcessAction} 
                variant="contained" 
                color="error"
                disabled={loading || !notes.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <RejectIcon />}
              >
                {loading ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </DialogActions>
          </>
        );
      case 'revise':
        return (
          <>
            <DialogContent>
              <Typography paragraph>
                You are requesting revisions for PR #{pr.prNumber}. Please provide details about what needs to be revised.
              </Typography>
              <TextField
                autoFocus
                label="Revision Instructions"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                variant="outlined"
                required
                error={!!error}
                helperText={error || "This message will be sent to the requestor"}
                placeholder="Explain what needs to be revised in this purchase request"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleProcessAction} 
                variant="contained" 
                color="warning"
                disabled={loading || !notes.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <ReviseIcon />}
              >
                {loading ? 'Processing...' : 'Request Revision'}
              </Button>
            </DialogActions>
          </>
        );
      default:
        return null;
    }
  };

  // Format request details for display
  const getRequestorName = () => {
    if (!pr.requestor) return 'Unknown';
    
    if (typeof pr.requestor === 'string') {
      return pr.requestor;
    }
    
    if (pr.requestor.name) {
      return pr.requestor.name;
    }
    
    if (pr.requestor.firstName && pr.requestor.lastName) {
      return `${pr.requestor.firstName} ${pr.requestor.lastName}`;
    }
    
    return pr.requestor.email || 'Unknown';
  };

  // Calculate total requested amount
  const calculateTotal = () => {
    if (pr.totalAmount) return pr.totalAmount;
    if (pr.estimatedAmount) return pr.estimatedAmount;
    
    if (pr.lineItems && pr.lineItems.length > 0) {
      return pr.lineItems.reduce((total, item) => {
        // Some line items might have unitPrice as a custom property
        const unitPrice = (item as any).unitPrice || 0;
        const itemTotal = (item.quantity || 0) * unitPrice;
        return total + itemTotal;
      }, 0);
    }
    
    return 0;
  };

  // Render the review panel UI
  return (
    <>
      <Paper sx={{ p: 3, mb: 3, border: isUrgent ? '1px solid #f44336' : undefined }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Approver Review Panel
          </Typography>
          {isUrgent && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ py: 0 }}>
              {pr.isUrgent ? 'Marked as urgent' : `Pending for ${daysPending} days`}
            </Alert>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {/* Left side - PR details */}
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" gutterBottom>
                <ChecklistIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Review Summary
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" sx={{ width: '40%', fontWeight: 'bold' }}>
                        PR Number
                      </TableCell>
                      <TableCell>{pr.prNumber}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Description
                      </TableCell>
                      <TableCell>{pr.description}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Requestor
                      </TableCell>
                      <TableCell>{getRequestorName()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Department
                      </TableCell>
                      <TableCell>{pr.department}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Project Category
                      </TableCell>
                      <TableCell>{pr.projectCategory}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Total Amount
                      </TableCell>
                      <TableCell>{formatCurrency(calculateTotal(), pr.currency)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Waiting For
                      </TableCell>
                      <TableCell>{daysPending} day(s)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Line Items Summary */}
              {pr.lineItems && pr.lineItems.length > 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    <ReceiptIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Line Items
                  </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Your Approval Is Required</AlertTitle>
                  This purchase request requires your review and decision.
                </Alert>

                <Typography variant="body2" paragraph>
                  Please review the details of this PR and take one of the following actions:
                </Typography>

                <List>
                  <ListItem>
                    <ListItemIcon>
                      <ApproveIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Approve" 
                      secondary="Approve this PR and move it to the next workflow step" 
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <RejectIcon color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Reject" 
                      secondary="Reject this PR and provide a reason for rejection" 
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <ReviseIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Request Revision" 
                      secondary="Send this PR back to the requestor for changes" 
                    />
                  </ListItem>
                </List>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => handleActionClick('approve')}
                  sx={{ minWidth: '110px' }}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => handleActionClick('reject')}
                  sx={{ minWidth: '110px' }}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<ReviseIcon />}
                  onClick={() => handleActionClick('revise')}
                  sx={{ minWidth: '110px' }}
                >
                  Revise
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{getActionLabel()}</DialogTitle>
        {getDialogContent()}
      </Dialog>
    </>
  );
}
