import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BatchFilterDropdown } from '@/components/BatchFilterDropdown';
import { SUIT_OPTIONS, ERA_OPTIONS } from './utils';
import { Sparkles } from 'lucide-react';

interface BulkFillSectionProps {
  bulkSuits: string[];
  onBulkSuitsChange: (suits: string[]) => void;
  bulkEras: string[];
  onBulkErasChange: (eras: string[]) => void;
  bulkTraderLeverage: number;
  onBulkTraderLeverageChange: (value: number) => void;
  bulkMultiplier: number;
  onBulkMultiplierChange: (value: number) => void;
  onApplyAll: () => void;
}

export function BulkFillSection({
  bulkSuits,
  onBulkSuitsChange,
  bulkEras,
  onBulkErasChange,
  bulkTraderLeverage,
  onBulkTraderLeverageChange,
  bulkMultiplier,
  onBulkMultiplierChange,
  onApplyAll,
}: BulkFillSectionProps) {
  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-primary-glow/5 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Global Bulk Fill
        </h3>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onApplyAll}
          className="bg-gradient-to-r from-primary to-primary-glow"
        >
          Apply to All Ranks
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Suits</Label>
          <BatchFilterDropdown
            label="Suits"
            options={SUIT_OPTIONS}
            selected={bulkSuits}
            onChange={onBulkSuitsChange}
            placeholder="Select suits"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Eras</Label>
          <BatchFilterDropdown
            label="Eras"
            options={ERA_OPTIONS}
            selected={bulkEras}
            onChange={onBulkErasChange}
            placeholder="Select eras"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bulkTraderLeverage">Trader Leverage</Label>
          <Input
            id="bulkTraderLeverage"
            type="number"
            min="10"
            max="100"
            value={bulkTraderLeverage}
            onChange={(e) => onBulkTraderLeverageChange(parseInt(e.target.value) || 10)}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bulkMultiplier">Multiplier</Label>
          <Input
            id="bulkMultiplier"
            type="number"
            min="1"
            value={bulkMultiplier}
            onChange={(e) => onBulkMultiplierChange(parseInt(e.target.value) || 1)}
            className="w-full"
          />
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Set default values and click "Apply to All Ranks" to populate all rank fields at once
      </p>
    </div>
  );
}
