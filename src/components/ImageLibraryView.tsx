import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Copy, Trash2, Download } from 'lucide-react';

interface ImageCode {
  id: string;
  code: string;
  public_url: string;
  filename: string;
  created_at: string;
}

export const ImageLibraryView: React.FC = () => {
  const [imageCodes, setImageCodes] = useState<ImageCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Image preview modal state
  const [imagePreview, setImagePreview] = useState<{
    isOpen: boolean;
    imageUrl: string;
    filename: string;
    code: string;
  }>({
    isOpen: false,
    imageUrl: '',
    filename: '',
    code: ''
  });

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
    loadImageCodes();
  }, []);

  const filteredImages = imageCodes.filter(img =>
    img.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code} to clipboard`);
  };

  const copyAllCodes = () => {
    const codes = filteredImages.map(img => img.code).join(', ');
    navigator.clipboard.writeText(codes);
    toast.success(`Copied ${filteredImages.length} codes to clipboard`);
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

  const downloadMapping = () => {
    const mapping = filteredImages
      .map(img => `${img.code},${img.filename},${img.public_url}`)
      .join('\n');
    
    const blob = new Blob([`code,filename,url\n${mapping}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image-mappings.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Downloaded image mappings');
  };

  // Open image preview modal
  const openImagePreview = (imageUrl: string, filename: string, code: string) => {
    setImagePreview({
      isOpen: true,
      imageUrl,
      filename,
      code
    });
  };

  // Close image preview modal
  const closeImagePreview = () => {
    setImagePreview({
      isOpen: false,
      imageUrl: '',
      filename: '',
      code: ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Image Library ({imageCodes.length} images)</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyAllCodes}>
            <Copy className="h-4 w-4 mr-2" />
            Copy All Codes
          </Button>
          <Button variant="outline" size="sm" onClick={downloadMapping}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadImageCodes}>
            Refresh
          </Button>
        </div>
      </div>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map((img) => (
            <div key={img.id} className="group relative border rounded-lg overflow-hidden">
              <div className="aspect-square bg-muted cursor-pointer" onClick={() => openImagePreview(img.public_url, img.filename, img.code)}>
                <img
                  src={img.public_url}
                  alt={img.filename}
                  className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                />
              </div>
              
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <code className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded font-mono">
                    {img.code}
                  </code>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyCode(img.code);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteImage(img.id, img.code);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1" title={img.filename}>
                  {img.filename}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(img.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Image Preview Modal */}
      <Dialog open={imagePreview.isOpen} onOpenChange={closeImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle>
              {imagePreview.code} - {imagePreview.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center max-h-[70vh] overflow-hidden">
            <img 
              src={imagePreview.imageUrl} 
              alt={imagePreview.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};