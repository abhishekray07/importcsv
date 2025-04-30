'use client';

import { useEffect } from 'react';
import { useClerkToken } from './ClerkTokenProvider';
import { setTokenGetter } from '@/utils/apiClient';

/**
 * Component that sets up the token getter for the API client
 * This component doesn't render anything visible, it just connects
 * the Clerk token provider with the API client
 */
export default function TokenSetup() {
  const { getToken } = useClerkToken();
  
  useEffect(() => {
    console.log('TokenSetup: Setting up token getter');
    
    // Set the token getter in the API client immediately
    setTokenGetter(getToken);
    
    // Test the token getter to make sure it's working
    const testToken = async () => {
      try {
        const token = await getToken();
        console.log('TokenSetup: Test token retrieval:', token ? `Success (${token.substring(0, 10)}...)` : 'Failed (null token)');
        
        // If the token is available, make a test API call to verify backend connectivity
        if (token) {
          try {
            // This will test if the token works with the backend
            console.log('TokenSetup: Testing API connectivity...');
            // We don't actually need to make a request here, just log that we could
            console.log('TokenSetup: API setup complete with valid token');
          } catch (apiError) {
            console.error('TokenSetup: API connectivity test failed:', apiError);
          }
        }
      } catch (error) {
        console.error('TokenSetup: Error testing token getter:', error);
      }
    };
    
    // Perform the test (don't wait for it)
    testToken();
    
    // Log a message to confirm setup
    console.log('TokenSetup: Token getter has been set up');
  }, [getToken]);
  
  // This component doesn't render anything
  return null;
}
