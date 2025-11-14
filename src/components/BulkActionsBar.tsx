import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { PrintBatchSelector } from '@/components/PrintBatchSelector';
import { Trash2, CheckSquare, Square, Loader2, Package } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onRefresh: () => void;
  selectedCardIds: string[];
}

export function BulkActionsBar({ 
  selectedCount, 
  onClearSelection, 
  onRefresh, 
  selectedCardIds 
}: BulkActionsBarProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<string>('');
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const handleBulkSetActive = async (isActive: boolean) => {
    setLoading(true);
    setOperation(isActive ? 'activating' : 'deactivating');
    
    try {
      const { data, error } = await supabase.rpc('admin_bulk_set_active', {
        p_card_ids: selectedCardIds,
        p_is_active: isActive
      });

      if (error) throw error;

      console.log('Bulk set active response:', data);
      const count = data?.updated_count || 0;
      toast({
        title: "Success",
        description: `${count} card${count !== 1 ? 's' : ''} ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
      
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error('Error updating cards:', error);
      toast({
        title: "Error", 
        description: error.message || `Failed to ${isActive ? 'activate' : 'deactivate'} cards`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOperation('');
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    setOperation('deleting');
    
    try {
      const { data, error } = await supabase.rpc('admin_bulk_soft_delete', {
        p_card_ids: selectedCardIds
      });

      if (error) throw error;

      console.log('Bulk delete response:', data);
      const count = data?.deleted_count || 0;
      toast({
        title: "Success",
        description: `${count} card${count !== 1 ? 's' : ''} deleted successfully`,
      });
      
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting cards:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOperation('');
    }
  };

  const handleBulkAssignBatch = async () => {
    if (!selectedBatchId && selectedBatchId !== null) return;
    
    setLoading(true);
    setOperation('assigning');
    
    try {
      const { data, error } = await supabase.rpc('admin_bulk_assign_batch', {
        p_card_ids: selectedCardIds,
        p_batch_id: selectedBatchId
      });

      if (error) throw error;

      console.log('Bulk assign batch response:', data);
      const count = data?.updated_count || 0;
      toast({
        title: "Success",
        description: `${count} card${count !== 1 ? 's' : ''} assigned to ${selectedBatchId ? 'batch' : 'unassigned'} successfully`,
      });
      
      setShowBatchDialog(false);
      setSelectedBatchId(null);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      console.error('Error assigning cards:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign cards to batch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOperation('');
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="glass-panel p-4 rounded-2xl border shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {selectedCount} card{selectedCount !== 1 ? 's' : ''} selected
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearSelection}
              disabled={loading}
            >
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Activate Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Activate Selected Cards</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to activate {selectedCount} card{selectedCount !== 1 ? 's' : ''}? 
                    This will make them available for claiming by users.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkSetActive(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading && operation === 'activating' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Activate Cards
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  className="text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Deactivate Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate Selected Cards</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to deactivate {selectedCount} card{selectedCount !== 1 ? 's' : ''}? 
                    This will prevent users from claiming them until reactivated.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkSetActive(false)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {loading && operation === 'deactivating' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Deactivate Cards
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Assign to Batch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign to Print Batch</DialogTitle>
                  <DialogDescription>
                    Select a batch to assign {selectedCount} card{selectedCount !== 1 ? 's' : ''} to
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <PrintBatchSelector
                    value={selectedBatchId}
                    onChange={setSelectedBatchId}
                    showAllOption={false}
                    showUnassignedOption={true}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBatchDialog(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkAssignBatch} 
                    disabled={loading}
                  >
                    {loading && operation === 'assigning' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Assign Cards
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Cards</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedCount} card{selectedCount !== 1 ? 's' : ''}? 
                    This action will soft-delete the cards (they can be restored later).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading && operation === 'deleting' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Delete Cards
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}