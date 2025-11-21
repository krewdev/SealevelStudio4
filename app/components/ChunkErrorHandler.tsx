'use client';

import { useEffect } from 'react';

/**
 * Handles chunk loading errors and retries automatically
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;
      if (error && (
        error.message?.includes('chunk') ||
        error.message?.includes('ChunkLoadError') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('ERR_INCOMPLETE_CHUNKED_ENCODING')
      )) {
        console.warn('Chunk loading error detected, will retry...', error);
        
        // Retry after a short delay
        setTimeout(() => {
          console.log('Retrying chunk load...');
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener('error', handleChunkError);
    
    return () => {
      window.removeEventListener('error', handleChunkError);
    };
  }, []);

  return null;
}

