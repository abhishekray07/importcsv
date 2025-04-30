'use client';

import { SignIn as ClerkSignIn } from '@clerk/nextjs';

export function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <ClerkSignIn 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-primary hover:bg-primary/90 text-white',
            card: 'shadow-lg rounded-lg border border-gray-200',
          }
        }}
      />
    </div>
  );
}
