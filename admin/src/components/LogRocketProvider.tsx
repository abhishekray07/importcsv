'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// Dynamically import LogRocket to handle loading errors
let LogRocket: any = null;

export function LogRocketProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Only initialize LogRocket in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Dynamically import LogRocket to avoid build issues
    const initLogRocket = async () => {
      try {
        const LR = await import('logrocket');
        LogRocket = LR.default;
        
        // Initialize LogRocket with error handling
        if (LogRocket && LogRocket.init) {
          LogRocket.init('dwyxun/importcsv');
          
          // Identify user when they're loaded
          if (isLoaded && user) {
            LogRocket.identify(user.id, {
              name: user.fullName || '',
              email: user.primaryEmailAddress?.emailAddress || '',
            });
          }
        }
      } catch (error) {
        // Silently fail in production, log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('LogRocket initialization skipped:', error);
        }
      }
    };

    initLogRocket();
  }, [isLoaded, user]);

  return <>{children}</>;
}
