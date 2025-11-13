'use client';

import React, { ReactNode, useEffect, useState } from 'react';

// Wrapper to prevent hydration mismatches with icons
export function SafeIcon({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // On server, render fallback or nothing
  if (!isClient) {
    return fallback || <span className="w-4 h-4 inline-block" />;
  }

  // On client, render the actual icon
  return <>{children}</>;
}
