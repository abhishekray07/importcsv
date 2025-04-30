'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/utils/apiClient";

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  
  useEffect(() => {
    console.log('ApiProvider: Setting up token getter directly from Clerk useAuth');
    setTokenGetter(() => getToken());
    
    // Test the token getter to make sure it's working
    const testToken = async () => {
      try {
        const token = await getToken();
        console.log('ApiProvider: Test token retrieval:', token ? `Success (${token.substring(0, 10)}...)` : 'Failed (null token)');
      } catch (error) {
        console.error('ApiProvider: Error testing token getter:', error);
      }
    };
    
    // Perform the test (don't wait for it)
    testToken();
  }, [getToken]);

  return <>{children}</>;
}