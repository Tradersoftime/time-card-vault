import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BatchFilterDropdown } from '@/components/BatchFilterDropdown';
import { useToast } from '@/hooks/use-toast';
import { ArrowDown, RotateCcw } from 'lucide-react';
import { RankDistribution, SUIT_OPTIONS, ERA_OPTIONS, RARITY_OPTIONS, TRADER_VALUE_OPTIONS } from './utils';

interface UnifiedSpreadsheetTableProps {
  distributions: RankDistribution[];
  totalCards: number;
  onChange: (distributions: RankDistribution[]) => void;
}

export function UnifiedSpreadsheetTable({ distributions, totalCards, onChange }: UnifiedSpreadsheetTableProps) {
  const { toast } = useToast();
  
  // Bulk edit temporary state
  const [bulkQuantity, setBulkQuantity] = useState<string>('');
  const [bulkSuits, setBulkSuits] = useState<string[]>([]);
  const [bulkEras, setBulkEras] = useState<string[]>([]);
  const [bulkRarities, setBulkRarities] = useState<string[]>([]);
  const [bulkTraderLeverage, setBulkTraderLeverage] = useState<string>('');
  const [bulkMultiplier, setBulkMultiplier] = useState<string>('');
  const [bulkTraderValue, setBulkTraderValue] = useState<string>('');

  // Apply to all functions
  const applyQuantityToAll = () => {
    const qty = parseInt(bulkQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({ title: 'Invalid quantity', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, quantity: qty })));
    setBulkQuantity('');
    toast({ title: `Applied quantity ${qty} to all ranks` });
  };

  const applySuitsToAll = () => {
    if (bulkSuits.length === 0) {
      toast({ title: 'Select at least one suit', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, suits: [...bulkSuits] })));
    setBulkSuits([]);
    toast({ title: 'Applied suits to all ranks' });
  };

  const applyErasToAll = () => {
    if (bulkEras.length === 0) {
      toast({ title: 'Select at least one era', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, eras: [...bulkEras] })));
    setBulkEras([]);
    toast({ title: 'Applied eras to all ranks' });
  };

  const applyRaritiesToAll = () => {
    if (bulkRarities.length === 0) {
      toast({ title: 'Select at least one rarity', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, rarities: [...bulkRarities] })));
    setBulkRarities([]);
    toast({ title: 'Applied rarities to all ranks' });
  };

  const applyTraderLeverageToAll = () => {
    const value = parseInt(bulkTraderLeverage);
    if (isNaN(value) || value < 10) {
      toast({ title: 'Invalid trader leverage (min: 10)', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, traderLeverage: value })));
    setBulkTraderLeverage('');
    toast({ title: `Applied trader leverage ${value} to all ranks` });
  };

  const applyMultiplierToAll = () => {
    const value = parseInt(bulkMultiplier);
    if (isNaN(value) || value < 1) {
      toast({ title: 'Invalid multiplier (min: 1)', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, multiplier: value })));
    setBulkMultiplier('');
    toast({ title: `Applied multiplier ${value} to all ranks` });
  };

  const applyTraderValueToAll = () => {
    if (!bulkTraderValue) {
      toast({ title: 'Select a trader value', variant: 'destructive' });
      return;
    }
    onChange(distributions.map(d => ({ ...d, traderValue: bulkTraderValue })));
    setBulkTraderValue('');
    toast({ title: `Applied trader value "${bulkTraderValue}" to all ranks` });
  };

  const clearAllBulkInputs = () => {
    setBulkQuantity('');
    setBulkSuits([]);
    setBulkEras([]);
    setBulkRarities([]);
    setBulkTraderLeverage('');
    setBulkMultiplier('');
    setBulkTraderValue('');
    toast({ title: 'Cleared all bulk inputs' });
  };

  const updateDistribution = (index: number, updates: Partial<RankDistribution>) => {
    const newDistributions = [...distributions];
    newDistributions[index] = { ...newDistributions[index], ...updates };
    onChange(newDistributions);
  };

  const allocatedTotal = distributions.reduce((sum, d) => sum + d.quantity, 0);
  const isValid = allocatedTotal === totalCards;

  return (
    <div className="space-y-4">
      {/* Validation Header */}
      <div className={`p-3 rounded-lg border ${isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Allocated: <span className="font-bold">{allocatedTotal}</span> / {totalCards}
            {isValid ? ' ✓' : ' ⚠️'}
          </span>
          <Button variant="ghost" size="sm" onClick={clearAllBulkInputs}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear Bulk Inputs
          </Button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <ScrollArea className="w-full">
        <div className="min-w-[1400px] border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            {/* Column Headers with Labels */}
            <thead className="sticky top-0 z-20 bg-muted border-b-2 border-border">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-24">Rank</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-28">Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-44">Suits</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-44">Eras</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-44">Rarities</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-36">Trader Leverage</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-28">Multiplier</th>
                <th className="px-3 py-2 text-left text-xs font-semibold border-r border-border w-28">Time Value</th>
                <th className="px-3 py-2 text-left text-xs font-semibold w-32">Trader Value</th>
              </tr>
            </thead>

            {/* Bulk Edit Row */}
            <thead className="sticky top-[41px] z-10 bg-primary/10 border-b border-border shadow-sm">
              <tr>
                <td className="px-3 py-2 border-r border-border">
                  <div className="text-xs font-medium text-primary">Bulk Edit ↓</div>
                </td>
                
                {/* Quantity Bulk */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="0"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={applyQuantityToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>

                {/* Suits Bulk */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="space-y-1">
                    <BatchFilterDropdown
                      label="Select"
                      options={SUIT_OPTIONS}
                      selected={bulkSuits}
                      onChange={setBulkSuits}
                    />
                    <Button size="sm" onClick={applySuitsToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>

                {/* Eras Bulk */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="space-y-1">
                    <BatchFilterDropdown
                      label="Select"
                      options={ERA_OPTIONS}
                      selected={bulkEras}
                      onChange={setBulkEras}
                    />
                    <Button size="sm" onClick={applyErasToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>

                {/* Rarities Bulk */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="space-y-1">
                    <BatchFilterDropdown
                      label="Select"
                      options={RARITY_OPTIONS}
                      selected={bulkRarities}
                      onChange={setBulkRarities}
                    />
                    <Button size="sm" onClick={applyRaritiesToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>

                {/* Trader Leverage Bulk */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="10"
                      value={bulkTraderLeverage}
                      onChange={(e) => setBulkTraderLeverage(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={applyTraderLeverageToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>

                {/* Multiplier Bulk */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="1"
                      value={bulkMultiplier}
                      onChange={(e) => setBulkMultiplier(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={applyMultiplierToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>

                {/* Time Value (calculated, no bulk) */}
                <td className="px-3 py-2 border-r border-border">
                  <div className="text-xs text-muted-foreground text-center py-2">
                    (calculated)
                  </div>
                </td>

                {/* Trader Value Bulk */}
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    <Select value={bulkTraderValue} onValueChange={setBulkTraderValue}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADER_VALUE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={applyTraderValueToAll} className="h-6 w-full text-xs">
                      <ArrowDown className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </td>
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {distributions.map((dist, index) => {
                const timeValue = dist.traderLeverage * dist.multiplier;
                const isOddRow = index % 2 === 1;
                
                return (
                  <tr
                    key={dist.rank}
                    className={`border-b border-border hover:bg-muted/50 transition-colors ${isOddRow ? 'bg-muted/20' : ''}`}
                  >
                    {/* Rank */}
                    <td className="px-3 py-2 border-r border-border font-medium text-sm">
                      {dist.rank}
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2 border-r border-border">
                      <Input
                        type="number"
                        min="0"
                        value={dist.quantity}
                        onChange={(e) => updateDistribution(index, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="h-8 text-xs"
                      />
                    </td>

                    {/* Suits */}
                    <td className="px-3 py-2 border-r border-border">
                      <BatchFilterDropdown
                        label={dist.suits.length > 0 ? `${dist.suits.length} selected` : 'Select suits'}
                        options={SUIT_OPTIONS}
                        selected={dist.suits}
                        onChange={(suits) => updateDistribution(index, { suits })}
                      />
                    </td>

                    {/* Eras */}
                    <td className="px-3 py-2 border-r border-border">
                      <BatchFilterDropdown
                        label={dist.eras.length > 0 ? `${dist.eras.length} selected` : 'Select eras'}
                        options={ERA_OPTIONS}
                        selected={dist.eras}
                        onChange={(eras) => updateDistribution(index, { eras })}
                      />
                    </td>

                    {/* Rarities */}
                    <td className="px-3 py-2 border-r border-border">
                      <BatchFilterDropdown
                        label={dist.rarities.length > 0 ? `${dist.rarities.length} selected` : 'Select rarities'}
                        options={RARITY_OPTIONS}
                        selected={dist.rarities}
                        onChange={(rarities) => updateDistribution(index, { rarities })}
                      />
                    </td>

                    {/* Trader Leverage */}
                    <td className="px-3 py-2 border-r border-border">
                      <Input
                        type="number"
                        min="10"
                        value={dist.traderLeverage}
                        onChange={(e) => updateDistribution(index, { traderLeverage: Math.max(10, parseInt(e.target.value) || 10) })}
                        className="h-8 text-xs"
                      />
                    </td>

                    {/* Multiplier */}
                    <td className="px-3 py-2 border-r border-border">
                      <Input
                        type="number"
                        min="1"
                        value={dist.multiplier}
                        onChange={(e) => updateDistribution(index, { multiplier: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="h-8 text-xs"
                      />
                    </td>

                    {/* Time Value (calculated) */}
                    <td className="px-3 py-2 border-r border-border">
                      <div className="text-xs font-mono text-muted-foreground py-2 text-center">
                        {timeValue}
                      </div>
                    </td>

                    {/* Trader Value */}
                    <td className="px-3 py-2">
                      <Select 
                        value={dist.traderValue} 
                        onValueChange={(value) => updateDistribution(index, { traderValue: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRADER_VALUE_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
