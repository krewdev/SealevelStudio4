'use-client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Dynamically import icons to prevent SSR issues
export function DynamicIcon({ icon: IconName, ...props }: { icon: string } & any) {
  const [Icon, setIcon] = React.useState<LucideIcon | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    import('lucide-react').then(mod => {
      const IconComponent = mod[IconName as keyof typeof mod] as LucideIcon;
      if (isMounted) setIcon(() => IconComponent);
    });
    return () => { isMounted = false; };
  }, [IconName]);

  if (!Icon) return null;
  return <Icon {...props} />;
}