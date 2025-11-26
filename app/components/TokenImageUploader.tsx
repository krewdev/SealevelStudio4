import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  X, 
  Download, 
  Loader2,
  Wand2,
  RefreshCw
} from 'lucide-react';

interface TokenImageUploaderProps {
  tokenSymbol: string;
  tokenName: string;
  onImageChange: (imageUrl: string, imageFile?: File) => void;
  currentImage?: string;
}

export function TokenImageUploader({ 
  tokenSymbol, 
  tokenName, 
  onImageChange,
  currentImage 
}: TokenImageUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string>(currentImage || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, GIF, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        onImageChange(result, file);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const generateAIImage = async () => {
    if (!tokenSymbol && !customPrompt) {
      setError('Please enter a token symbol or custom prompt');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSymbol,
          tokenName,
          prompt: customPrompt,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Image generation failed');
      }

      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        setImagePreview(data.imageUrl);
        onImageChange(data.imageUrl);
        setShowPromptInput(false);
        setCustomPrompt('');
      } else {
        throw new Error('No image URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
      console.error('AI generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImage = () => {
    setImagePreview('');
    onImageChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadImage = async () => {
    if (!imagePreview) return;
    
    try {
      const response = await fetch(imagePreview);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tokenSymbol || 'token'}-logo.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
        <ImageIcon className="w-5 h-5 text-blue-400" />
        <span>Token Image</span>
      </h2>

      <p className="text-sm text-gray-400 mb-6">
        Upload a custom token logo or generate one with AI. This image will be used for social media posts 
        on Twitter and Telegram.
      </p>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-6 relative group">
          <div className="aspect-square w-full max-w-xs mx-auto bg-gray-900 rounded-xl overflow-hidden border-2 border-purple-500/30">
            <img 
              src={imagePreview} 
              alt="Token preview" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Image Actions Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center space-x-3 max-w-xs mx-auto">
            <button
              onClick={downloadImage}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={clearImage}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              title="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Upload & Generate Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isGenerating}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Upload Image</span>
            </>
          )}
        </button>

        {/* AI Generate Button */}
        <button
          onClick={generateAIImage}
          disabled={isGenerating || isUploading || !tokenSymbol}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate with AI</span>
            </>
          )}
        </button>
      </div>

      {/* Custom Prompt Section */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => setShowPromptInput(!showPromptInput)}
          className="text-sm text-purple-400 hover:text-purple-300 flex items-center space-x-2 transition-colors"
        >
          <Wand2 className="w-4 h-4" />
          <span>{showPromptInput ? 'Hide' : 'Show'} Custom Prompt</span>
        </button>

        {showPromptInput && (
          <div className="mt-4 space-y-3">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe your ideal token logo... (leave empty to auto-generate based on token name)"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500">
              💡 Tip: Be specific! Include colors, style (minimalist, futuristic, etc.), and themes.
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200/80">
            <p className="font-semibold text-blue-200 mb-2">AI Image Generator Features:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Automatically generates professional token logos based on your symbol</li>
              <li>High-quality 1024x1024 images perfect for social media</li>
              <li>Optimized for Twitter and Telegram profile pictures</li>
              <li>Custom prompts for unique branding</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

