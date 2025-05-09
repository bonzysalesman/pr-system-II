/**
 * Approver Diagnostic Tool
 * 
 * A utility component to help diagnose issues with approver PR visibility.
 * This tool logs information about the current user, their permissions,
 * and attempts different queries to load PRs to identify the root cause.
 */

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Box, Button, Paper, Typography, Alert, AlertTitle, Divider, CircularProgress } from '@mui/material';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PRStatus } from '@/types/pr';

interface DiagnosticResult {
  query: string;
  success: boolean;
  count: number;
  error?: string;
}

export const ApproverDiagnosticTool = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  
  // Function to safely run a query and return diagnostic results
  const runDiagnosticQuery = async (
    name: string,
    queryFn: () => Promise<any>
  ): Promise<DiagnosticResult> => {
    try {
      const result = await queryFn();
      return {
        query: name,
        success: true,
        count: result.size || 0
      };
    } catch (error) {
      console.error(`Error in query "${name}":`, error);
      return {
        query: name,
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };
  
  // Run the diagnostic tests
  const runDiagnostics = async () => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }
    
    setLoading(true);
    setResults([]);
    const diagnosticTests: DiagnosticResult[] = [];
    
    // Test 1: Query all PRs (this will likely fail due to security rules)
    const test1 = await runDiagnosticQuery('All PRs', async () => {
      const q = query(collection(db, 'prs'));
      return await getDocs(q);
    });
    diagnosticTests.push(test1);
    
    // Test 2: Query PRs by status only
    const test2 = await runDiagnosticQuery('PRs by status (PENDING_APPROVAL)', async () => {
      const q = query(collection(db, 'prs'), where('status', '==', PRStatus.PENDING_APPROVAL));
      return await getDocs(q);
    });
    diagnosticTests.push(test2);
    
    // Test 3: Query PRs by approver only
    const test3 = await runDiagnosticQuery('PRs by approver ID', async () => {
      const q = query(collection(db, 'prs'), where('approver', '==', user.id));
      return await getDocs(q);
    });
    diagnosticTests.push(test3);
    
    // Test 4: Query PRs by requestor (your own PRs)
    const test4 = await runDiagnosticQuery('PRs where you are requestor', async () => {
      const q = query(collection(db, 'prs'), where('requestorId', '==', user.id));
      return await getDocs(q);
    });
    diagnosticTests.push(test4);
    
    // Test 5: Try complex query with the correct order of filters
    const test5 = await runDiagnosticQuery('PRs by status then approver', async () => {
      const q = query(
        collection(db, 'prs'),
        where('status', '==', PRStatus.PENDING_APPROVAL),
        where('approver', '==', user.id)
      );
      return await getDocs(q);
    });
    diagnosticTests.push(test5);
    
    setResults(diagnosticTests);
    setLoading(false);
  };
  
  // Log user details
  useEffect(() => {
    if (user) {
      console.log('Approver Diagnostic Tool - User Details:', {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        permissionLevel: user.permissionLevel,
        organization: user.organization
      });
    }
  }, [user]);
  
  return (
    <Paper sx={{ p: 3, my: 3 }}>
      <Typography variant="h5" gutterBottom>Approver Diagnostic Tool</Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Debugging Tool</AlertTitle>
        This tool helps diagnose issues with approver PR visibility.
        Click the button below to run diagnostic tests against Firestore.
        Check the browser console for detailed logs.
      </Alert>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Current User:</Typography>
        <Typography variant="body2">ID: {user?.id || 'Not available'}</Typography>
        <Typography variant="body2">Email: {user?.email || 'Not available'}</Typography>
        <Typography variant="body2">
          Name: {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Not available'}
        </Typography>
        <Typography variant="body2">Permission Level: {user?.permissionLevel || 'Not available'}</Typography>
        <Typography variant="body2">Organization: {user?.organization || 'Not available'}</Typography>
      </Box>
      
      <Button 
        variant="contained" 
        onClick={runDiagnostics} 
        disabled={loading || !user?.id}
        sx={{ mb: 3 }}
      >
        {loading ? <CircularProgress size={24} sx={{ mr: 1 }} /> : null}
        Run Diagnostics
      </Button>
      
      {results.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>Diagnostic Results:</Typography>
          {results.map((result, index) => (
            <Alert 
              key={index} 
              severity={result.success ? 'success' : 'error'}
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">{result.query}</Typography>
              {result.success ? (
                <Typography variant="body2">Found {result.count} documents</Typography>
              ) : (
                <Typography variant="body2">Error: {result.error}</Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}
    </Paper>
  );
};
