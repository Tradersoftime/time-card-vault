import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon, Code } from 'lucide-react';
import { ImageCodeBrowser } from './ImageCodeBrowser';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  cardCode?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImageUrl,
  cardCode,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [mode, setMode] = useState<'upload' | 'code'>('upload');
  const [imageCode, setImageCode] = useState('');

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${cardCode || Date.now()}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('card-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onImageUploaded(publicUrl);
      toast.success('Image uploaded successfully!');
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }
      
      uploadImage(file);
    }
  }, [cardCode, onImageUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg']
    },
    multiple: false,
    disabled: uploading
  });

  const resolveImageCode = async (code: string) => {
    try {
      const { data, error } = await supabase
        .rpc('resolve_image_code', { p_code: code.trim() });

      if (error) throw error;
      
      if (data) {
        setPreview(data);
        onImageUploaded(data);
        toast.success(`Found image for code: ${code}`);
      } else {
        toast.error(`No image found for code: ${code}`);
      }
    } catch (error: any) {
      console.error('Error resolving image code:', error);
      toast.error('Failed to resolve image code');
    }
  };

  const handleImageCodeSubmit = () => {
    if (imageCode.trim()) {
      resolveImageCode(imageCode.trim());
    }
  };

  const handleSelectFromBrowser = (url: string, code: string) => {
    setPreview(url);
    setImageCode(code);
    onImageUploaded(url);
  };

  const removeImage = () => {
    setPreview(null);
    setImageCode('');
    onImageUploaded('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2 text-sm">
        <Button
          type="button"
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('upload')}
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload New
        </Button>
        <Button
          type="button"
          variant={mode === 'code' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('code')}
        >
          <Code className="h-4 w-4 mr-1" />
          Use Code
        </Button>
      </div>

      {preview ? (
        <div className="relative">
          <div className="bg-white p-2 rounded-lg border shadow-sm">
            <img 
              src={preview} 
              alt="Card preview"
              className="w-full h-32 object-cover rounded"
            />
          </div>
          {imageCode && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {imageCode}
            </div>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : mode === 'upload' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-2">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <div className="p-2 bg-muted rounded-full">
                  {isDragActive ? (
                    <Upload className="h-6 w-6 text-primary" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop image here' : 'Upload card image'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag & drop or click to browse (PNG, JPG, WebP, SVG - Max 5MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter image code (e.g., a1, a2, b3...)"
              value={imageCode}
              onChange={(e) => setImageCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleImageCodeSubmit()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleImageCodeSubmit}
              disabled={!imageCode.trim()}
            >
              Find Image
            </Button>
          </div>
          
          <div className="text-center">
            <ImageCodeBrowser
              onSelectImage={handleSelectFromBrowser}
              trigger={
                <Button type="button" variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Browse Image Library
                </Button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};