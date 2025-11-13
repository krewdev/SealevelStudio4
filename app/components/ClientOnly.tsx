'use client';

import React, { ReactNode, useEffect, useState } from 'react';

// Ensures component only renders on client to prevent hydration mismatches
export function ClientOnly({ 
  children, 
  fallback = null 
}: { 
  children: ReactNode; 
  fallback?: ReactNode 
}) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // On server, render fallback or nothing
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // On client, render the actual children
  return <>{children}</>;
}



