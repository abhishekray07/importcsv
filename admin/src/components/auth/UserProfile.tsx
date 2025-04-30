'use client';

import { UserProfile as ClerkUserProfile } from '@clerk/nextjs';

export function UserProfile() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ClerkUserProfile 
        appearance={{
          elements: {
            card: 'shadow-lg rounded-lg border border-gray-200',
            navbar: 'bg-white',
            navbarButton: 'text-gray-700 hover:text-primary',
            navbarButtonActive: 'text-primary',
          }
        }}
      />
    </div>
  );
}
