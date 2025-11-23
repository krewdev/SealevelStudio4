import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  ExternalLink,
  Twitter,
  Send,
  Sparkles,
  Calendar
} from 'lucide-react';
import { 
  getAllTokenImages, 
  deleteTokenImage, 
  TokenImageMetadata,
  optimizeForSocialMedia 
} from '../lib/token-images/storage';

export function TokenImageGallery() {
  const [images, setImages] = useState<TokenImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<TokenImageMetadata | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const storedImages = await getAllTokenImages();
      setImages(storedImages);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tokenSymbol: string) => {
    if (!confirm(`Delete image for ${tokenSymbol}?`)) return;
    
    try {
      await deleteTokenImage(tokenSymbol);
      setImages(images.filter(img => img.tokenSymbol !== tokenSymbol));
      if (selectedImage?.tokenSymbol === tokenSymbol) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleDownload = async (image: TokenImageMetadata, platform?: 'twitter' | 'telegram') => {
    try {
      let blob: Blob;
      
      if (platform) {
        // Optimize for specific platform
        blob = await optimizeForSocialMedia(image.imageUrl, platform);
      } else {
        // Download original
        const response = await fetch(image.imageUrl);
        blob = await response.blob();
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.tokenSymbol}-${platform || 'original'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShare = async (image: TokenImageMetadata, platform: 'twitter' | 'telegram') => {
    try {
      await fetch('/api/social/post-token-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol: image.tokenSymbol,
          tokenName: image.tokenName,
          tokenMintAddress: image.mintAddress,
          imageUrl: image.imageUrl,
          platforms: [platform],
        }),
      });
      alert(`Posted to ${platform}!`);
    } catch (error) {
      console.error(`Failed to post to ${platform}:`, error);
      alert(`Failed to post to ${platform}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Token Images Yet</h3>
        <p className="text-gray-500">
          Launch a token with an image to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <ImageIcon className="w-6 h-6 text-purple-400" />
          <span>Token Image Gallery</span>
        </h2>
        <span className="text-sm text-gray-400">{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div
            key={image.tokenSymbol}
            className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all group"
          >
            {/* Image Preview */}
            <div 
              className="aspect-square bg-gray-900 cursor-pointer relative"
              onClick={() => setSelectedImage(image)}
            >
              <img 
                src={image.imageUrl} 
                alt={image.tokenName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Badge */}
              {image.imageType === 'ai-generated' && (
                <div className="absolute top-3 right-3 bg-purple-600/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span className="text-xs text-white font-medium">AI</span>
                </div>
              )}
            </div>

            {/* Info & Actions */}
            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-white">{image.tokenName}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-400">${image.tokenSymbol}</span>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(image.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {image.mintAddress && (
                <div className="mb-3 p-2 bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Mint Address</div>
                  <div className="text-xs font-mono text-blue-400 truncate">
                    {image.mintAddress}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDownload(image)}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors"
                  title="Download original"
                >
                  <Download className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => handleShare(image, 'twitter')}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors"
                  title="Share on Twitter"
                >
                  <Twitter className="w-3 h-3" />
                </button>
                
                <button
                  onClick={() => handleShare(image, 'telegram')}
                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition-colors"
                  title="Share on Telegram"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => handleDelete(image.tokenSymbol)}
                className="w-full mt-2 flex items-center justify-center space-x-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-xs transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for full view */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-gray-800 rounded-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img 
                src={selectedImage.imageUrl} 
                alt={selectedImage.tokenName}
                className="w-full h-auto"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedImage.tokenName} (${selectedImage.tokenSymbol})
              </h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Type: {selectedImage.imageType === 'ai-generated' ? '🤖 AI Generated' : '📤 Uploaded'}</p>
                <p>Created: {new Date(selectedImage.generatedAt).toLocaleString()}</p>
                {selectedImage.mintAddress && (
                  <p className="font-mono text-xs break-all">Mint: {selectedImage.mintAddress}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => handleDownload(selectedImage, 'twitter')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  <span>Download for Twitter</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedImage, 'telegram')}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Download for Telegram</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

