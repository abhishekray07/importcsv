'use client';

import { useEffect } from 'react';
import LogRocket from 'logrocket';
import { useUser } from '@clerk/nextjs';

export function LogRocketProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Initialize LogRocket
    LogRocket.init('dwyxun/importcsv');

    // Identify user when they're loaded
    if (isLoaded && user) {
      LogRocket.identify(user.id, {
        name: user.fullName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
      });
    }
  }, [isLoaded, user]);

  return <>{children}</>;
}
