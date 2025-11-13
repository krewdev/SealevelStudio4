'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import icons to prevent SSR issues
export function DynamicIcon({ icon: IconName, ...props }: { icon: string } & any) {
  const Icon = dynamic(() => 
    import('lucide-react').then(mod => {
      const IconComponent = mod[IconName as keyof typeof mod];
      return () => React.createElement(IconComponent, props);
    })
  );
  
  return <Icon />;
}
