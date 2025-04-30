'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/utils/apiClient";

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
}