import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, CircularProgress, Link, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { signIn, resetPassword } from '../../services/auth';
import { setError } from '../../store/slices/authSlice';
import { RootState } from '../../store';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

export const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const globalError = useSelector((state: RootState) => state.auth.error);
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.user);
  
  // Test user creation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('Test123!');
  const [testCreationStatus, setTestCreationStatus] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      console.log('LoginPage: User is authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage: Starting login attempt');
    setLoading(true);
    setLocalError(null);
    dispatch(setError(null));

    try {
      console.log('LoginPage: Attempting login with email:', email);
      await signIn(email, password);
      console.log('LoginPage: Login successful');
    } catch (error) {
      console.error('LoginPage: Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    setLoading(true);
    setLocalError(null);
    dispatch(setError(null));

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (error) {
      console.error('LoginPage: Password reset error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  // Test user creation function
  const createTestUser = async () => {
    console.log('Creating test user...');
    setTestCreationStatus(null);
    setLoading(true);
    
    try {
      // Initialize Firebase with direct config
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
      
      // Initialize a fresh Firebase app instance
      const testApp = initializeApp(firebaseConfig, 'createUserTest');
      const testAuth = getAuth(testApp);
      
      // Create the test user
      console.log(`Attempting to create user with email: ${testEmail}`);
      const userCredential = await createUserWithEmailAndPassword(testAuth, testEmail, testPassword);
      console.log('Test user created successfully:', userCredential.user.uid);
      setTestCreationStatus('SUCCESS: Test user created! Try logging in with these credentials.');
      
      // Auto-fill the login form with test credentials
      setEmail(testEmail);
      setPassword(testPassword);
    } catch (error) {
      console.error('Error creating test user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestCreationStatus(`ERROR: ${errorMessage}`);
    } finally {
      setLoading(false);
      // Close dialog after a delay
      setTimeout(() => setDialogOpen(false), 5000);
    }
  };

  // Configuration debugging function
  const debugFirebaseConfig = () => {
    console.log('Debugging Firebase Configuration');
    setLoading(true);
    
    try {
      // Log the configuration that would be used
      console.log('Environment variables check:');
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Exists (Masked)' : 'MISSING',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'MISSING',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'MISSING',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'MISSING',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'Exists' : 'MISSING',
        appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'Exists' : 'MISSING',
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'MISSING'
      };
      
      console.log('Firebase config check results:', config);
      
      // Check for empty or suspicious values
      const issues = Object.entries(config)
        .filter(([_, value]) => value === 'MISSING' || value === '')
        .map(([key]) => key);
      
      if (issues.length > 0) {
        const message = `Missing or empty Firebase config values: ${issues.join(', ')}`;
        console.error(message);
        setLocalError(message);
      } else {
        setLocalError('All Firebase config variables exist. Check console for details.');
      }
    } catch (error) {
      console.error('Config debug error:', error);
      setLocalError(`Debug error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Direct Firebase authentication test function
  const handleDirectFirebaseTest = async () => {
    console.log('Starting direct Firebase test');
    setLoading(true);
    setLocalError(null);
    
    try {
      // Define Firebase config directly
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
      
      console.log('Firebase config loaded for test:', {
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId
      });
      
      // Initialize a fresh Firebase app instance
      const testApp = initializeApp(firebaseConfig, 'authTest');
      const testAuth = getAuth(testApp);
      
      console.log('Test auth instance created');
      
      // Try authentication directly
      console.log('Attempting direct Firebase authentication');
      try {
        const userCredential = await signInWithEmailAndPassword(
          testAuth, 
          email, 
          password
        );
        console.log('Direct Firebase authentication successful!', userCredential.user);
        setLocalError('Direct authentication successful! Regular auth flow may have configuration issues.');
      } catch (authError) {
        console.error('Direct Firebase authentication failed:', authError);
        setLocalError(`Direct auth error: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test setup error:', error);
      setLocalError(`Test setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
      }}
    >
      <Box
        component="form"
        onSubmit={handleLogin}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 3,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign In
        </Typography>

        {(localError || globalError) && (
          <Typography color="error" sx={{ mb: 2 }}>
            {localError || globalError}
          </Typography>
        )}

        {resetSent && (
          <Typography color="success.main" sx={{ mb: 2 }}>
            Password reset email sent. Please check your inbox.
          </Typography>
        )}

        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
        
        {/* Direct Firebase Authentication Test Button */}
        <Button
          fullWidth
          variant="outlined"
          color="secondary"
          sx={{ mb: 2 }}
          onClick={handleDirectFirebaseTest}
          disabled={loading}
        >
          Test Direct Firebase Auth
        </Button>
        
        {/* Firebase Configuration Debug Button */}
        <Button
          fullWidth
          variant="outlined"
          color="info"
          sx={{ mb: 2 }}
          onClick={debugFirebaseConfig}
          disabled={loading}
        >
          Debug Firebase Config
        </Button>
        
        {/* Test User Creation Button */}
        <Button
          fullWidth
          variant="outlined"
          color="success"
          sx={{ mb: 2 }}
          onClick={() => setDialogOpen(true)}
          disabled={loading}
        >
          Create Test User
        </Button>
        
        {/* Test User Creation Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Create Test User</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              This will create a new test user in Firebase to help diagnose authentication issues.
            </Typography>
            
            <TextField
              fullWidth
              margin="normal"
              label="Test Email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={loading}
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Test Password"
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              disabled={loading}
            />
            
            {testCreationStatus && (
              <Typography 
                color={testCreationStatus.startsWith('ERROR') ? 'error' : 'success.main'}
                sx={{ mt: 2 }}
              >
                {testCreationStatus}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={createTestUser} disabled={loading} variant="contained" color="primary">
              {loading ? <CircularProgress size={24} /> : 'Create Test User'}
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link
            component="button"
            variant="body2"
            onClick={handleResetPassword}
            disabled={loading}
          >
            Forgot password?
          </Link>
        </Box>
      </Box>
    </Box>
  );
};
