import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageDownloadButtonProps {
  imageUrl: string;
  filename?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const ImageDownloadButton = ({
  imageUrl,
  filename,
  variant = 'outline',
  size = 'sm',
  className = ''
}: ImageDownloadButtonProps) => {
  const { toast } = useToast();

  const downloadImage = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename if not provided
      if (filename) {
        a.download = filename;
      } else {
        const urlParts = imageUrl.split('/');
        const originalFilename = urlParts[urlParts.length - 1];
        a.download = originalFilename || 'image.jpg';
      }
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={downloadImage}
      className={`${className}`}
    >
      <Download className="h-3 w-3 mr-1" />
      Download
    </Button>
  );
};