import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

interface BatchCreateFormProps {
  onBatchCreated: () => void;
  batchCount: number;
}

export function BatchCreateForm({ onBatchCreated, batchCount }: BatchCreateFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [printDate, setPrintDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Batch name is required');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('print_batches').insert({
        name: name.trim(),
        description: description.trim() || null,
        print_date: printDate || null,
        sort_order: batchCount,
      });

      if (error) throw error;

      toast.success('Batch created successfully');
      setName('');
      setDescription('');
      setPrintDate('');
      onBatchCreated();
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl mb-6">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="batch-name">Batch Name *</Label>
          <Input
            id="batch-name"
            placeholder="e.g., First Print - January 2025"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="batch-description">Description</Label>
          <Input
            id="batch-description"
            placeholder="Optional notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Label htmlFor="batch-date">Print Date</Label>
          <Input
            id="batch-date"
            type="date"
            value={printDate}
            onChange={(e) => setPrintDate(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create Batch'}
        </Button>
      </div>
    </div>
  );
}
