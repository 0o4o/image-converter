import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, Copy, Loader2, Check, X } from 'lucide-react';

interface ImageData {
  Height: number;
  Width: number;
  Pixels: number[][];
}

const ImageToRoblox: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processImage = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      processFile(file);
    } else if (urlInput.trim()) {
      processURL(urlInput.trim());
    } else {
      toast({
        title: "No input provided",
        description: "Please select a file or enter a URL",
        variant: "destructive"
      });
    }
  };

  const processFile = (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        processImageData(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const processURL = (url: string) => {
    setIsLoading(true);
    setFileName('Image from URL');
    processImageData(url);
  };

  const processImageData = (src: string) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setPreviewSrc(src);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        handleError('Failed to create canvas context');
        return;
      }
      
      let { width, height } = img;
      const maxDim = 512;
      
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels: number[][] = [];
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        pixels.push([
          imageData.data[i],     // R
          imageData.data[i + 1], // G
          imageData.data[i + 2]  // B
        ]);
      }
      
      const result: ImageData = {
        Height: height,
        Width: width,
        Pixels: pixels
      };
      
      const jsonString = JSON.stringify(result);
      setImageData(jsonString);
      
      setIsLoading(false);
      
      toast({
        title: "Conversion complete",
        description: `${width}×${height} • ${pixels.length.toLocaleString()} pixels`,
      });
    };
    
    img.onerror = () => {
      handleError('Failed to load image');
    };
    
    img.src = src;
  };

  const handleError = (message: string) => {
    setIsLoading(false);
    setPreviewSrc(null);
    setImageData(null);
    toast({
      title: "Error",
      description: message,
      variant: "destructive"
    });
  };

  const copyToClipboard = async () => {
    if (!imageData) return;
    
    try {
      await navigator.clipboard.writeText(imageData);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Copied to clipboard!",
        description: "JSON data is ready to paste",
      });
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = imageData;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: "Copied to clipboard!",
          description: "JSON data is ready to paste",
        });
      } catch (fallbackErr) {
        toast({
          title: "Failed to copy",
          description: "Please try the download option instead",
          variant: "destructive"
        });
      }
      
      document.body.removeChild(textarea);
    }
  };

  const downloadJSON = () => {
    if (!imageData) return;
    
    const blob = new Blob([imageData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roblox-image-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show instructions modal after download
    setShowInstructionsModal(true);
    
    toast({
      title: "Downloaded",
      description: "JSON file saved successfully",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUrlInput('');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    if (e.target.value.trim() && fileInputRef.current) {
      fileInputRef.current.value = '';
      setFileName('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 opacity-0 animate-fade-in">
          <h1 className="text-4xl font-light tracking-tight">
            Image to Roblox
          </h1>
          <p className="text-muted-foreground">
            Convert images to JSON format
          </p>
        </div>

        {/* Main Card */}
        <div className="antimetal-card p-6 space-y-6 opacity-0 animate-fade-in animate-delay-200">
          {/* File Upload */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Upload Image</label>
            <div className="file-drop-zone p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                <div className="text-sm">
                  {fileName || 'Choose PNG or JPG file'}
                </div>
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Or paste image URL</label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={handleUrlChange}
              className="antimetal-input"
            />
          </div>

          {/* Convert Button */}
          <Button
            onClick={processImage}
            disabled={isLoading}
            className="w-full antimetal-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              'Convert Image'
            )}
          </Button>

          {/* Preview */}
          {previewSrc && (
            <div className="text-center space-y-3">
              <img
                src={previewSrc}
                alt="Preview"
                className="max-w-full max-h-32 rounded border border-border mx-auto"
              />
            </div>
          )}

          {/* Success State */}
          {imageData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4" />
                Ready for Roblox
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="antimetal-button"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy JSON
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={downloadJSON}
                  className="antimetal-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center opacity-0 animate-fade-in animate-delay-400">
          <p className="text-xs text-muted-foreground">
            by @0o4o
          </p>
        </div>

        {/* Instructions Modal */}
        <Dialog open={showInstructionsModal} onOpenChange={setShowInstructionsModal}>
          <DialogContent className="antimetal-card max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Installation Instructions
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInstructionsModal(false)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                To use your converted image data in Roblox:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">1.</span>
                  <span>Go into your Roblox executor&apos;s workspace folder</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">2.</span>
                  <span>Open the <code className="bg-secondary px-1 rounded text-xs">pixelporter</code> folder</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">3.</span>
                  <span>Place the downloaded JSON file in there</span>
                </div>
              </div>
              <Button 
                onClick={() => setShowInstructionsModal(false)}
                className="w-full antimetal-button mt-4"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ImageToRoblox;
