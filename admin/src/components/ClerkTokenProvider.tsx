'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

// Create a context to hold the token
type TokenContextType = {
  getToken: () => Promise<string | null>;
};

const TokenContext = createContext<TokenContextType>({
  getToken: async () => null,
});

export const useClerkToken = () => useContext(TokenContext);

export const ClerkTokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();

  // Set up the token getter function
  const tokenGetter = async (): Promise<string | null> => {
    try {
      console.log('ClerkTokenProvider: Getting token from Clerk');
      if (getToken) {
        // Use the standard JWT token from Clerk without template
        // This works better with most backend implementations
        const token = await getToken();
        console.log('ClerkTokenProvider: Token received:', token ? 'Yes (length: ' + token.length + ')' : 'No');
        return token;
      }
      console.warn('ClerkTokenProvider: getToken function not available');
      return null;
    } catch (error) {
      console.error('ClerkTokenProvider: Error getting token:', error);
      return null;
    }
  };

  // Log when the component mounts
  useEffect(() => {
    console.log('ClerkTokenProvider: Component mounted');
  }, []);

  return (
    <TokenContext.Provider value={{ getToken: tokenGetter }}>
      {children}
    </TokenContext.Provider>
  );
};
