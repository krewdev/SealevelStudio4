/**
 * Token Image Storage and Management
 * Handles storage, retrieval, and social media optimization of token images
 */

export interface TokenImageMetadata {
  tokenSymbol: string;
  tokenName: string;
  imageUrl: string;
  imageType: 'uploaded' | 'ai-generated';
  generatedAt: string;
  mintAddress?: string;
  socialMediaReady: boolean;
}

/**
 * Store token image in browser's IndexedDB for offline access
 */
export async function storeTokenImage(
  tokenSymbol: string,
  imageUrl: string,
  metadata: Partial<TokenImageMetadata> = {}
): Promise<void> {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['tokenImages'], 'readwrite');
    const store = transaction.objectStore('tokenImages');

    const imageData: TokenImageMetadata = {
      tokenSymbol,
      tokenName: metadata.tokenName || tokenSymbol,
      imageUrl,
      imageType: metadata.imageType || 'uploaded',
      generatedAt: new Date().toISOString(),
      mintAddress: metadata.mintAddress,
      socialMediaReady: true,
    };

    await store.put(imageData);
  } catch (error) {
    console.error('Failed to store token image:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem(
        `token_image_${tokenSymbol}`,
        JSON.stringify({ imageUrl, ...metadata })
      );
    } catch (e) {
      console.error('localStorage fallback failed:', e);
    }
  }
}

/**
 * Retrieve token image from storage
 */
export async function getTokenImage(
  tokenSymbol: string
): Promise<TokenImageMetadata | null> {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['tokenImages'], 'readonly');
    const store = transaction.objectStore('tokenImages');
    const result = await store.get(tokenSymbol);
    return result || null;
  } catch (error) {
    console.error('Failed to retrieve token image:', error);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`token_image_${tokenSymbol}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }
}

/**
 * Get all stored token images
 */
export async function getAllTokenImages(): Promise<TokenImageMetadata[]> {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['tokenImages'], 'readonly');
    const store = transaction.objectStore('tokenImages');
    const allImages = await store.getAll();
    return allImages;
  } catch (error) {
    console.error('Failed to retrieve all token images:', error);
    return [];
  }
}

/**
 * Delete token image from storage
 */
export async function deleteTokenImage(tokenSymbol: string): Promise<void> {
  try {
    const db = await openImageDB();
    const transaction = db.transaction(['tokenImages'], 'readwrite');
    const store = transaction.objectStore('tokenImages');
    await store.delete(tokenSymbol);
  } catch (error) {
    console.error('Failed to delete token image:', error);
    localStorage.removeItem(`token_image_${tokenSymbol}`);
  }
}

/**
 * Convert image URL to base64 for embedding
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Optimize image for social media (resize, compress)
 */
export async function optimizeForSocialMedia(
  imageUrl: string,
  platform: 'twitter' | 'telegram'
): Promise<Blob> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  // Create canvas for resizing
  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Platform-specific sizing
  const targetSize = platform === 'twitter' ? 400 : 512;
  canvas.width = targetSize;
  canvas.height = targetSize;

  // Draw and compress
  ctx.drawImage(img, 0, 0, targetSize, targetSize);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      0.9
    );
  });
}

/**
 * Open or create IndexedDB for token images
 */
function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TokenImagesDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('tokenImages')) {
        db.createObjectStore('tokenImages', { keyPath: 'tokenSymbol' });
      }
    };
  });
}

/**
 * Export token image data for API calls
 */
export function prepareImageForAPI(
  imageUrl: string,
  tokenSymbol: string,
  tokenName: string
): FormData {
  const formData = new FormData();
  formData.append('tokenSymbol', tokenSymbol);
  formData.append('tokenName', tokenName);
  formData.append('imageUrl', imageUrl);
  return formData;
}

/**
 * Check if image is suitable for social media
 */
export async function validateImageForSocialMedia(
  imageUrl: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Check file size (max 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      issues.push('Image size exceeds 5MB');
    }
    
    // Check dimensions
    const img = await createImageBitmap(blob);
    if (img.width < 400 || img.height < 400) {
      issues.push('Image dimensions too small (minimum 400x400)');
    }
    if (img.width > 4096 || img.height > 4096) {
      issues.push('Image dimensions too large (maximum 4096x4096)');
    }
    
    // Check aspect ratio
    const aspectRatio = img.width / img.height;
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      issues.push('Image aspect ratio should be between 1:2 and 2:1');
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    return {
      valid: false,
      issues: ['Failed to validate image'],
    };
  }
}

