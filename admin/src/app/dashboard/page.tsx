'use client';

import React, { useEffect } from 'react';
import { useAuth as useClerkAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    } else if (isLoaded && isSignedIn) {
      // Redirect to importers page
      router.push('/dashboard/importers');
    }
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to access the dashboard</p>
      </div>
    );
  }

  // We already checked if the user is signed in above, so this is redundant
  // but we'll keep it for clarity
  if (!isSignedIn) {
      return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to importers...</p>
    </div>
  );
}
