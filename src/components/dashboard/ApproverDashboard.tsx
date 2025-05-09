/**
 * Approver Dashboard Component
 * 
 * This component displays PRs that need approval from the current user.
 * It addresses the issue where approvers cannot see PRs assigned to them.
 * Enhanced with expandable PR details and quick review actions.
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Button,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  CardActions,
  Stack
} from '@mui/material';
import {
  PriorityHigh as PriorityHighIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { RootState } from '@/store';
import { setPendingApprovals } from '@/store/slices/prSlice';
import { approverPRService } from '@/services/approverPRs';
import { PRRequest, PRStatus } from '@/types/pr';
import { formatCurrency } from '@/utils/formatters';
import { updatePRStatus } from '@/services/pr';

// Row component with expandable details
interface ExpandableRowProps {
  pr: PRRequest;
  onApprove: (prId: string, notes: string) => Promise<void>;
  onReject: (prId: string, notes: string) => Promise<void>;
  onNavigate: (prId: string) => void;
}

const ExpandableRow = ({ pr, onApprove, onReject, onNavigate }: ExpandableRowProps) => {
  const [open, setOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const daysPending = calculateDaysPending(pr);
  
  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(pr.id, notes);
      setApproveDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(pr.id, notes);
      setRejectDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to get requestor display name
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
  
  // Calculate urgency level (for visual indicators)
  const getUrgencyLevel = () => {
    if (pr.isUrgent) return 'high';
    if (daysPending > 5) return 'medium';
    if (daysPending > 3) return 'low';
    return 'normal';
  };
  
  const urgencyLevel = getUrgencyLevel();
  const requestorName = getRequestorName();
  
  return (
    <>
      <TableRow
        sx={{
          cursor: 'pointer',
          ...(urgencyLevel === 'high' && {
            backgroundColor: theme => `${theme.palette.error.main}15`,
            '&:hover': { backgroundColor: theme => `${theme.palette.error.main}25` },
          }),
          ...(urgencyLevel === 'medium' && {
            backgroundColor: theme => `${theme.palette.warning.main}10`,
            '&:hover': { backgroundColor: theme => `${theme.palette.warning.main}20` },
          }),
        }}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell onClick={() => setOpen(!open)}>
          {pr.prNumber}
          {pr.isUrgent && (
            <Tooltip title="Urgent PR">
              <PriorityHighIcon
                color="error"
                sx={{ ml: 1, verticalAlign: 'middle' }}
              />
            </Tooltip>
          )}
        </TableCell>
        <TableCell onClick={() => setOpen(!open)}>{pr.description}</TableCell>
        <TableCell onClick={() => setOpen(!open)}>{requestorName}</TableCell>
        <TableCell onClick={() => setOpen(!open)}>{formatCurrency(pr.estimatedAmount, pr.currency)}</TableCell>
        <TableCell onClick={() => setOpen(!open)}>
          <Chip 
            label={daysPending}
            color={urgencyLevel === 'high' ? "error" : urgencyLevel === 'medium' ? "warning" : "default"}
          />
        </TableCell>
      </TableRow>
      
      {/* Expandable detail row */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                  <Typography variant="h6" gutterBottom>PR Details</Typography>
                  <Stack spacing={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary" display="flex" alignItems="center">
                              <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Department
                            </Typography>
                            <Typography variant="body2">{pr.department || 'Not specified'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary" display="flex" alignItems="center">
                              <MoneyIcon fontSize="small" sx={{ mr: 1 }} /> Project Category
                            </Typography>
                            <Typography variant="body2">{pr.projectCategory || 'Not specified'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary" display="flex" alignItems="center">
                              <PersonIcon fontSize="small" sx={{ mr: 1 }} /> Requested By
                            </Typography>
                            <Typography variant="body2">{requestorName}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2" color="text.secondary" display="flex" alignItems="center">
                              <TimeIcon fontSize="small" sx={{ mr: 1 }} /> Date Required
                            </Typography>
                            <Typography variant="body2">
                              {pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : 'Not specified'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                    
                    {pr.lineItems && pr.lineItems.length > 0 && (
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>Line Items</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Quantity</TableCell>
                                <TableCell align="right">Amount</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {pr.lineItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell align="right">{formatCurrency(item.quantity * (item.unitPrice || 0), pr.currency)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={5}>
                  <Typography variant="h6" gutterBottom>Actions</Typography>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" paragraph>
                        This PR requires your attention. It has been waiting for {daysPending} day(s).
                      </Typography>
                      {pr.isUrgent && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <AlertTitle>Urgent</AlertTitle>
                          This PR has been marked as urgent by the requestor
                        </Alert>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        startIcon={<ViewIcon />}
                        onClick={() => onNavigate(pr.id)}
                      >
                        View Full Details
                      </Button>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => setApproveDialogOpen(true)}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => setRejectDialogOpen(true)}
                      >
                        Reject
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
      
      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Approve Purchase Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            You are about to approve PR #{pr.prNumber} for {formatCurrency(pr.totalAmount || pr.estimatedAmount, pr.currency)}.
          </Typography>
          <TextField
            label="Notes (Optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="Add any comments or notes for this approval"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            color="success"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Approval'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject Purchase Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            You are about to reject PR #{pr.prNumber}.
          </Typography>
          <TextField
            label="Reason for Rejection (Required)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={rejectDialogOpen && notes.trim() === ''}
            helperText={rejectDialogOpen && notes.trim() === '' ? 'Please provide a reason for rejection' : ''}
            placeholder="Explain why this purchase request is being rejected"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleReject} 
            variant="contained" 
            color="error"
            disabled={loading || notes.trim() === ''}
          >
            {loading ? 'Processing...' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Calculate days pending approval
const calculateDaysPending = (pr: PRRequest): number => {
  // Find status history entry for PENDING_APPROVAL
  const pendingEntry = pr.statusHistory?.find(item => item.status === 'PENDING_APPROVAL');
  
  if (!pendingEntry?.timestamp) return 0;
  
  const pendingDate = new Date(pendingEntry.timestamp);
  const currentDate = new Date();
  
  const diffTime = Math.abs(currentDate.getTime() - pendingDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const ApproverDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSelector((state: RootState) => state.auth);
  const { pendingApprovals } = useSelector((state: RootState) => state.pr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load PRs pending the current user's approval
  const loadPendingApprovals = async () => {
    if (!user?.id) {
      console.log('ApproverDashboard: No user ID available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add detailed debugging logs
      console.log('ApproverDashboard: Current user details:', {
        id: user.id,
        email: user.email,
        organization: user.organization,
        permissionLevel: user.permissionLevel,
      });
      
      // Try fetching without organization filter first
      console.log('ApproverDashboard: Loading pending approvals for user:', user.id);
      const prs = await approverPRService.getPendingApprovalPRs(user.id);
      
      console.log(`ApproverDashboard: Found ${prs.length} PRs pending approval`, {
        prs: prs.map(pr => ({
          id: pr.id,
          prNumber: pr.prNumber,
          status: pr.status,
          approver: pr.approver
        }))
      });
      
      dispatch(setPendingApprovals(prs));
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      // Provide more specific error message based on the error
      if (error instanceof Error) {
        setError(`Error: ${error.message}`);
      } else {
        setError('Failed to load PRs pending your approval. This may be due to security permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, [user?.id, user?.organization, dispatch]);
  
  // Handle PR approval
  const handleApprove = async (prId: string, notes: string) => {
    if (!user) return;
    
    try {
      await updatePRStatus(
        prId,
        PRStatus.APPROVED,
        notes || 'Approved',
        user
      );
      
      enqueueSnackbar('PR approved successfully', { variant: 'success' });
      // Refresh the list after approval
      loadPendingApprovals();
    } catch (error) {
      console.error('Error approving PR:', error);
      enqueueSnackbar('Failed to approve PR', { variant: 'error' });
    }
  };
  
  // Handle PR rejection
  const handleReject = async (prId: string, notes: string) => {
    if (!user || !notes.trim()) return;
    
    try {
      await updatePRStatus(
        prId,
        PRStatus.REJECTED,
        notes,
        user
      );
      
      enqueueSnackbar('PR rejected successfully', { variant: 'info' });
      // Refresh the list after rejection
      loadPendingApprovals();
    } catch (error) {
      console.error('Error rejecting PR:', error);
      enqueueSnackbar('Failed to reject PR', { variant: 'error' });
    }
  };

  // Navigate to PR details page
  const handleNavigate = (prId: string) => {
    navigate(`/pr/${prId}`);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Purchase Requests Pending Your Approval
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : pendingApprovals.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography>No purchase requests pending your approval.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Table aria-label="collapsible pr table">
            <TableHead>
              <TableRow>
                <TableCell width="48px" />
                <TableCell>PR Number</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Requestor</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Days Pending</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingApprovals.map((pr) => (
                <ExpandableRow
                  key={pr.id}
                  pr={pr}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onNavigate={handleNavigate}
                />
              ))}
            </TableBody>
          </Table>
          
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {pendingApprovals.length} purchase request(s) pending your approval
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={loadPendingApprovals}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

// Helper function to display rich notifications for approvers
const displayApproverNotification = () => {
  // Implementation will be added in future for push notifications
};

