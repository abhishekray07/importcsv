'use client';

import { SignUp as ClerkSignUp } from '@clerk/nextjs';

export function SignUp() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <ClerkSignUp 
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
