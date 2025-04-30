'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';

export function UserButton() {
  return (
    <ClerkUserButton 
      appearance={{
        elements: {
          userButtonAvatarBox: 'w-10 h-10',
          userButtonPopoverCard: 'shadow-lg rounded-lg border border-gray-200',
          userButtonPopoverFooter: 'hidden',
        }
      }}
    />
  );
}
