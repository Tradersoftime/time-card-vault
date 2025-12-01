import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Copy, RefreshCw, Download, Search, ChevronDown, Check, Edit2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

interface ImageCode {
  id: string;
  code: string;
  public_url: string;
  filename: string;
  created_at: string;
  storage_path: string;
}

type SortOption = 'code-asc' | 'code-desc' | 'filename-asc' | 'filename-desc' | 'date-newest' | 'date-oldest';

export const ImageLibraryView: React.FC = () => {
  const [imageCodes, setImageCodes] = useState<ImageCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  
  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string; code: string } | null>(null);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; id?: string; code?: string } | null>(null);

  useEffect(() => {
    loadImageCodes();
  }, []);

  async function loadImageCodes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('image_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImageCodes(data || []);
    } catch (error: any) {
      toast.error('Failed to load images: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort images
  const processedImages = (() => {
    let filtered = imageCodes.filter(img =>
      img.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'code-asc':
          return a.code.localeCompare(b.code);
        case 'code-desc':
          return b.code.localeCompare(a.code);
        case 'filename-asc':
          return a.filename.localeCompare(b.filename);
        case 'filename-desc':
          return b.filename.localeCompare(a.filename);
        case 'date-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  })();

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  }

  function copyAllCodes() {
    const codes = processedImages.map(img => img.code).join('\n');
    navigator.clipboard.writeText(codes);
    toast.success(`Copied ${processedImages.length} codes`);
  }

  async function handleDeleteSingle(id: string, code: string) {
    try {
      const image = imageCodes.find(img => img.id === id);
      if (!image) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('card-images')
        .remove([image.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('image_codes')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setImageCodes(prev => prev.filter(img => img.id !== id));
      toast.success(`Deleted: ${code}`);
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    try {
      const imagesToDelete = imageCodes.filter(img => selectedIds.has(img.id));
      
      // Delete from storage
      const storagePaths = imagesToDelete.map(img => img.storage_path);
      const { error: storageError } = await supabase.storage
        .from('card-images')
        .remove(storagePaths);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('image_codes')
        .delete()
        .in('id', Array.from(selectedIds));

      if (dbError) throw dbError;

      setImageCodes(prev => prev.filter(img => !selectedIds.has(img.id)));
      toast.success(`Deleted ${selectedIds.size} images`);
      setSelectedIds(new Set());
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error('Failed to bulk delete: ' + error.message);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === processedImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedImages.map(img => img.id)));
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  async function handleSaveCode(id: string) {
    const newCode = editingCode.trim();
    if (!newCode) {
      toast.error('Code cannot be empty');
      return;
    }

    // Check for duplicates
    const duplicate = imageCodes.find(img => img.code === newCode && img.id !== id);
    if (duplicate) {
      toast.error('Code already exists');
      return;
    }

    try {
      const { error } = await supabase
        .from('image_codes')
        .update({ code: newCode })
        .eq('id', id);

      if (error) throw error;

      setImageCodes(prev => prev.map(img => img.id === id ? { ...img, code: newCode } : img));
      toast.success('Code updated');
      setEditingId(null);
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  }

  function downloadMapping() {
    const csv = ['code,filename,url', ...processedImages.map(img => `${img.code},${img.filename},${img.public_url}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image-mapping.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded image mapping CSV');
  }

  function openImagePreview(imageUrl: string, filename: string, code: string) {
    setPreviewImage({ url: imageUrl, filename, code });
  }

  function closeImagePreview() {
    setPreviewImage(null);
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date-newest', label: 'Date (Newest)' },
    { value: 'date-oldest', label: 'Date (Oldest)' },
    { value: 'code-asc', label: 'Code (A-Z)' },
    { value: 'code-desc', label: 'Code (Z-A)' },
    { value: 'filename-asc', label: 'Filename (A-Z)' },
    { value: 'filename-desc', label: 'Filename (Z-A)' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold">
          Image Library ({processedImages.length} {processedImages.length === 1 ? 'image' : 'images'})
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyAllCodes} disabled={processedImages.length === 0}>
            <Copy className="w-4 h-4 mr-1" />
            Copy All Codes
          </Button>
          <Button variant="outline" size="sm" onClick={downloadMapping} disabled={processedImages.length === 0}>
            <Download className="w-4 h-4 mr-1" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadImageCodes}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-background border border-input rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
        </div>

        {/* Select All */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectAll}
          disabled={processedImages.length === 0}
        >
          <Check className="w-4 h-4 mr-1" />
          {selectedIds.size === processedImages.length && processedImages.length > 0 ? 'Deselect All' : 'Select All'}
        </Button>

        {/* Bulk Delete */}
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirm({ type: 'bulk' })}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by code or filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading/Empty States */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading images...</div>
      ) : processedImages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? 'No images match your search' : 'No images uploaded yet'}
        </div>
      ) : (
        /* Image Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {processedImages.map((img) => (
            <div
              key={img.id}
              className="relative group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(img.id)}
                  onChange={() => toggleSelect(img.id)}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>

              {/* Image */}
              <div
                className="aspect-square bg-muted cursor-pointer"
                onClick={() => openImagePreview(img.public_url, img.filename, img.code)}
              >
                <img
                  src={img.public_url}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                {/* Code with inline edit */}
                {editingId === img.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingCode}
                      onChange={(e) => setEditingCode(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCode(img.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleSaveCode(img.id)} className="h-7 w-7 p-0">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 p-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono flex-1 truncate">{img.code}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(img.id);
                        setEditingCode(img.code);
                      }}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground truncate" title={img.filename}>
                  {img.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(img.created_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyCode(img.code)}
                    className="flex-1 h-8"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm({ type: 'single', id: img.id, code: img.code })}
                    className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={closeImagePreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{previewImage?.filename}</span>
              <code className="text-sm font-mono ml-2">{previewImage?.code}</code>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            <img
              src={previewImage?.url}
              alt={previewImage?.filename}
              className="w-full h-auto"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'single'
                ? `This will permanently delete the image "${deleteConfirm.code}". This action cannot be undone.`
                : `This will permanently delete ${selectedIds.size} selected images. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.type === 'single' && deleteConfirm.id && deleteConfirm.code) {
                  handleDeleteSingle(deleteConfirm.id, deleteConfirm.code);
                } else if (deleteConfirm?.type === 'bulk') {
                  handleBulkDelete();
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
