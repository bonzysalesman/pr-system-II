import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { PRStatus } from '@/types/pr';
import { notificationService } from '@/services/notifications/notificationService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/types';
import { addDebugRecipient } from '@/utils/debugEmailUtil';
import { verifyNotificationSystem, checkNotificationsForPR } from '@/utils/prNotificationDebugger';

/**
 * Test component for notification system
 */
export const NotificationTester = () => {
  const [selectedTransition, setSelectedTransition] = useState<string>('');
  const [prId, setPrId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isDirectCall, setIsDirectCall] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  
  const { user } = useSelector((state: RootState) => state.auth);
  const functions = getFunctions();

  // Define status transitions
  const transitions = [
    { label: 'New → Submitted', from: null, to: PRStatus.SUBMITTED },
    { label: 'Submitted → Revision Required', from: PRStatus.SUBMITTED, to: PRStatus.REVISION_REQUIRED },
    { label: 'Revision Required → Submitted', from: PRStatus.REVISION_REQUIRED, to: PRStatus.SUBMITTED },
    { label: 'Submitted → Pending Approval', from: PRStatus.SUBMITTED, to: PRStatus.PENDING_APPROVAL },
    { label: 'In Queue → Pending Approval', from: PRStatus.IN_QUEUE, to: PRStatus.PENDING_APPROVAL },
    { label: 'Pending Approval → Approved', from: PRStatus.PENDING_APPROVAL, to: PRStatus.APPROVED },
    { label: 'Pending Approval → Rejected', from: PRStatus.PENDING_APPROVAL, to: PRStatus.REJECTED },
    { label: 'Submitted → Canceled', from: PRStatus.SUBMITTED, to: PRStatus.CANCELED },
    { label: 'Pending Approval → Canceled', from: PRStatus.PENDING_APPROVAL, to: PRStatus.CANCELED },
    { label: 'Approved → Ordered', from: PRStatus.APPROVED, to: PRStatus.ORDERED },
    { label: 'Ordered → Partially Received', from: PRStatus.ORDERED, to: PRStatus.PARTIALLY_RECEIVED },
    { label: 'Partially Received → Completed', from: PRStatus.PARTIALLY_RECEIVED, to: PRStatus.COMPLETED }
  ];

  /**
   * Handle triggering a notification for a status transition
   */
  const handleTriggerNotification = async () => {
    if (!selectedTransition || !prId) {
      setError('Please select a transition and enter a PR ID');
      return;
    }

    if (!user) {
      setError('You must be logged in to test notifications');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Find the selected transition
      const [fromStatus, toStatus] = selectedTransition.split(',');
      const oldStatus = fromStatus === 'null' ? null : fromStatus as PRStatus;
      const newStatus = toStatus as PRStatus;

      if (isDirectCall) {
        // Call the cloud function directly
        const sendPRNotificationV2 = httpsCallable(functions, 'sendPRNotificationV2');
        
        const notificationPayload = {
          notification: {
            prId,
            prNumber: `TEST-${prId.substring(0, 5)}`,
            oldStatus: oldStatus || 'NEW',
            newStatus,
            user: {
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            },
            notes,
            metadata: {
              isUrgent: debugMode,
              description: 'Test notification description',
              amount: 1000,
              currency: 'USD',
              department: 'IT Department',
              requiredDate: new Date().toISOString().split('T')[0]
            }
          },
          recipients: ['notificationtest@example.com'],
          cc: [],
          emailBody: {
            subject: `Test Notification for PR ${prId}`,
            text: `This is a test notification for PR ${prId} for transition ${oldStatus || 'NEW'} → ${newStatus}. Notes: ${notes}`,
            html: `<div><h2>Test Notification</h2><p>This is a test notification for PR ${prId} for transition ${oldStatus || 'NEW'} → ${newStatus}.</p><p>Notes: ${notes}</p></div>`
          }
        };

        const result = await sendPRNotificationV2(notificationPayload);
        setResult(result.data);
        console.log('Direct notification call result:', result.data);
      } else {
        // Use notification service
        await notificationService.handleStatusChange(
          prId,
          oldStatus,
          newStatus,
          user,
          { 
            notes,
            isUrgent: debugMode,
            testMode: true
          }
        );

        setResult({
          success: true, 
          message: `Notification triggered for ${oldStatus || 'NEW'} → ${newStatus}`
        });
        
        // Verify notification sent
        setTimeout(async () => {
          console.log(`\nChecking notifications for PR ${prId}...`);
          await checkNotificationsForPR(prId);
        }, 3000);
      }
    } catch (err) {
      console.error('Error triggering notification:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify notification system setup
   */
  const handleVerifySystem = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const verifyResult = await verifyNotificationSystem();
      setResult({ success: true, verifyResult });
    } catch (err) {
      console.error('Error verifying notification system:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Test recipient functions
   */
  const testRecipients = () => {
    const originalRecipients = {
      to: ['user1@example.com', 'user2@example.com'],
      cc: ['manager@example.com']
    };

    const enhancedRecipients = addDebugRecipient(originalRecipients);
    setResult({
      success: true,
      originalRecipients,
      enhancedRecipients
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Notification System Tester
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Verification
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleVerifySystem}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Verify Notification System
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={testRecipients}
            disabled={loading}
          >
            Test Debug Recipients
          </Button>
        </CardContent>
      </Card>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Trigger Test Notification
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="transition-label">Status Transition</InputLabel>
                <Select
                  labelId="transition-label"
                  value={selectedTransition}
                  label="Status Transition"
                  onChange={(e) => setSelectedTransition(e.target.value as string)}
                >
                  {transitions.map((transition) => (
                    <MenuItem 
                      key={`${transition.from}-${transition.to}`}
                      value={`${transition.from},${transition.to}`}
                    >
                      {transition.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="PR ID"
                fullWidth
                sx={{ mb: 2 }}
                value={prId}
                onChange={(e) => setPrId(e.target.value)}
                placeholder="Enter an existing PR ID"
                helperText="Enter a PR ID that exists in the system"
              />
              
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                sx={{ mb: 2 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes to include in notification"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="call-type-label">Call Type</InputLabel>
                <Select
                  labelId="call-type-label"
                  value={isDirectCall ? "direct" : "service"}
                  label="Call Type"
                  onChange={(e) => setIsDirectCall(e.target.value === "direct")}
                >
                  <MenuItem value="service">Use Notification Service</MenuItem>
                  <MenuItem value="direct">Direct Cloud Function Call</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <Typography component="div" variant="body2" sx={{ mb: 1 }}>
                  Debug Settings
                </Typography>
                
                <Button
                  color={debugMode ? "error" : "primary"}
                  variant={debugMode ? "contained" : "outlined"}
                  onClick={() => setDebugMode(!debugMode)}
                  sx={{ mb: 1 }}
                >
                  {debugMode ? "URGENT Mode ON" : "URGENT Mode OFF"}
                </Button>
                
                <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                  When enabled, the notification will be marked as urgent
                </Typography>
              </FormControl>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                onClick={handleTriggerNotification}
              >
                {loading ? <CircularProgress size={24} /> : 'Trigger Notification'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Result
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, overflow: 'auto' }}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default NotificationTester;
