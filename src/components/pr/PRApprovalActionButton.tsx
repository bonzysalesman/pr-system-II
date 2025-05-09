import { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress 
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { updatePRStatus, updatePR } from '@/services/pr';
import { PRStatus, PRRequest } from '@/types/pr';
import { approverService } from '@/services/approver';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface PRApprovalActionButtonProps {
  pr: PRRequest;
  onStatusUpdate: () => void;
}

export function PRApprovalActionButton({ pr, onStatusUpdate }: PRApprovalActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [approverId, setApproverId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvers, setApprovers] = useState<Array<{id: string; name: string; email: string}>>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchApprovers = async () => {
      setLoadingApprovers(true);
      try {
        const organizationId = pr?.organization || '';
        const approversList = await approverService.getApprovers(organizationId);
        setApprovers(approversList);
      } catch (error) {
        console.error('Error fetching approvers:', error);
      } finally {
        setLoadingApprovers(false);
      }
    };

    if (open) {
      fetchApprovers();
    }
  }, [open, pr?.organization]);

  const handleSendForApproval = async () => {
    if (!approverId || !pr.id || !currentUser) return;
    
    setLoading(true);
    try {
      // First update PR with approver information
      await updatePR(pr.id, { 
        approver: approverId,
        approvalWorkflow: {
          currentApprover: approverId,
          lastUpdated: new Date().toISOString(),
          approvalHistory: []
        }
      });
      
      // Then update status to PENDING_APPROVAL
      await updatePRStatus(
        pr.id,
        PRStatus.PENDING_APPROVAL,
        notes || 'Sent for approval',
        currentUser
      );
      
      onStatusUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error sending PR for approval:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only show button if PR is in SUBMITTED or RESUBMITTED status
  if (pr?.status !== PRStatus.SUBMITTED && pr?.status !== PRStatus.RESUBMITTED) {
    return null;
  }

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<SendIcon />}
        onClick={() => setOpen(true)}
        sx={{ ml: 1 }}
        disabled={loading}
      >
        Send for Approval
      </Button>
      
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send PR for Approval</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Select Approver</InputLabel>
            <Select
              value={approverId}
              onChange={(e) => setApproverId(e.target.value as string)}
              disabled={loadingApprovers}
            >
              {loadingApprovers ? (
                <MenuItem disabled>
                  <CircularProgress size={20} /> Loading approvers...
                </MenuItem>
              ) : (
                approvers.map(approver => (
                  <MenuItem key={approver.id} value={approver.id}>
                    {approver.name} ({approver.email})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          
          <TextField
            label="Notes for Approver"
            multiline
            rows={3}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any context or details that might help the approver make a decision"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSendForApproval} 
            variant="contained" 
            disabled={!approverId || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Send for Approval
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
