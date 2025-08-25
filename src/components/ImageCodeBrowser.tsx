import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Copy, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageCode {
  id: string;
  code: string;
  public_url: string;
  filename: string;
  created_at: string;
}

interface ImageCodeBrowserProps {
  onSelectImage: (url: string, code: string) => void;
  trigger?: React.ReactNode;
}

export const ImageCodeBrowser: React.FC<ImageCodeBrowserProps> = ({
  onSelectImage,
  trigger
}) => {
  const [imageCodes, setImageCodes] = useState<ImageCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const loadImageCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('image_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImageCodes(data || []);
    } catch (error: any) {
      console.error('Error loading image codes:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadImageCodes();
    }
  }, [open]);

  const filteredImages = imageCodes.filter(img =>
    img.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code} to clipboard`);
  };

  const deleteImage = async (id: string, code: string) => {
    try {
      const { error } = await supabase
        .from('image_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setImageCodes(prev => prev.filter(img => img.id !== id));
      toast.success(`Deleted image code ${code}`);
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const selectImage = (url: string, code: string) => {
    onSelectImage(url, code);
    setOpen(false);
    toast.success(`Selected image ${code}`);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <ImageIcon className="h-4 w-4 mr-2" />
      Browse Images
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Image Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No images found matching your search' : 'No images uploaded yet'}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 overflow-y-auto flex-1">
              {filteredImages.map((img) => (
                <div key={img.id} className="group relative">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                    <img
                      src={img.public_url}
                      alt={img.filename}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => selectImage(img.public_url, img.code)}
                    />
                  </div>
                  
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {img.code}
                  </div>
                  
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 w-6 p-0"
                      onClick={() => copyCode(img.code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0"
                      onClick={() => deleteImage(img.id, img.code)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="mt-1 text-xs text-center truncate" title={img.filename}>
                    {img.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};