import { useState } from 'react';
import { RankDistribution, SUIT_OPTIONS, ERA_OPTIONS, RARITY_OPTIONS, calculateEvenSplitQuantities, getAverageTraderLeverage } from './utils';
import { BatchFilterDropdown } from '../BatchFilterDropdown';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Percent } from 'lucide-react';

interface UnifiedSpreadsheetTableProps {
  distributions: RankDistribution[];
  totalCards: number;
  onChange: (distributions: RankDistribution[]) => void;
}

export function UnifiedSpreadsheetTable({ distributions, totalCards, onChange }: UnifiedSpreadsheetTableProps) {
  const { toast } = useToast();
  
  const [bulkQuantity, setBulkQuantity] = useState<string>('');
  const [bulkSuits, setBulkSuits] = useState<string[]>([]);
  const [bulkEras, setBulkEras] = useState<string[]>([]);
  const [bulkRarities, setBulkRarities] = useState<string[]>([]);
  const [bulkTraderLeverage, setBulkTraderLeverage] = useState<string>('');
  const [bulkMultiplier, setBulkMultiplier] = useState<string>('');
  
  // Rarity percentage distribution state
  const [showRarityPercentages, setShowRarityPercentages] = useState(false);
  const [rarityPercentages, setRarityPercentages] = useState<Record<string, number>>({
    'Degen': 20,
    'Day Trader': 20,
    'Investor': 20,
    'Market Maker': 20,
    'Whale': 20,
  });

  const applyQuantityToAll = () => {
    if (!bulkQuantity) return;
    const quantity = parseInt(bulkQuantity);
    if (isNaN(quantity) || quantity < 0) return;
    
    onChange(distributions.map(d => ({ ...d, quantity })));
    setBulkQuantity('');
    toast({ title: `Applied quantity ${quantity} to all ranks` });
  };

  const evenSplitQuantity = () => {
    const quantities = calculateEvenSplitQuantities(totalCards, distributions.length);
    onChange(distributions.map((d, i) => ({ ...d, quantity: quantities[i] })));
    toast({ title: `Evenly distributed ${totalCards} cards across all ranks` });
  };

  const applySuitsToAll = () => {
    if (bulkSuits.length === 0) return;
    onChange(distributions.map(d => ({ ...d, suits: [...bulkSuits] })));
    setBulkSuits([]);
    toast({ title: `Applied selected suits to all ranks` });
  };

  const evenSplitSuits = () => {
    onChange(distributions.map(d => ({ ...d, suits: [...SUIT_OPTIONS] })));
    toast({ title: 'Applied all suits to all ranks' });
  };

  const applyErasToAll = () => {
    if (bulkEras.length === 0) return;
    onChange(distributions.map(d => ({ ...d, eras: [...bulkEras] })));
    setBulkEras([]);
    toast({ title: `Applied selected eras to all ranks` });
  };

  const evenSplitEras = () => {
    onChange(distributions.map(d => ({ ...d, eras: [...ERA_OPTIONS] })));
    toast({ title: 'Applied all eras to all ranks' });
  };

  const applyRaritiesToAll = () => {
    if (bulkRarities.length === 0) return;
    onChange(distributions.map(d => ({ ...d, rarities: [...bulkRarities] })));
    setBulkRarities([]);
    toast({ title: `Applied selected rarities to all ranks` });
  };

  const evenSplitRarities = () => {
    onChange(distributions.map(d => ({ ...d, rarities: [...RARITY_OPTIONS] })));
    toast({ title: 'Applied all rarities to all ranks' });
  };

  const applyRarityPercentageDistribution = () => {
    const totalPercentage = Object.values(rarityPercentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      toast({ 
        title: 'Invalid percentages', 
        description: `Total must equal 100% (currently ${totalPercentage.toFixed(1)}%)`,
        variant: 'destructive'
      });
      return;
    }

    // Calculate cards per rarity
    const rarityCounts: Record<string, number> = {};
    let remaining = totalCards;
    
    for (const [rarity, percentage] of Object.entries(rarityPercentages)) {
      const count = Math.round(totalCards * (percentage / 100));
      rarityCounts[rarity] = count;
      remaining -= count;
    }
    
    // Adjust for rounding errors
    if (remaining !== 0) {
      const firstRarity = Object.keys(rarityCounts)[0];
      rarityCounts[firstRarity] += remaining;
    }
    
    // Distribute rarities across ranks proportionally
    const totalQuantity = distributions.reduce((sum, d) => sum + d.quantity, 0);
    if (totalQuantity === 0) {
      toast({ 
        title: 'No cards allocated', 
        description: 'Please set rank quantities first',
        variant: 'destructive'
      });
      return;
    }
    
    const updatedDistributions = distributions.map(dist => {
      const proportion = dist.quantity / totalQuantity;
      const rankRarities: string[] = [];
      
      for (const [rarity, totalCount] of Object.entries(rarityCounts)) {
        const rankCount = Math.round(totalCount * proportion);
        if (rankCount > 0) {
          rankRarities.push(rarity);
        }
      }
      
      return {
        ...dist,
        rarities: rankRarities.length > 0 ? rankRarities : [...RARITY_OPTIONS],
      };
    });
    
    onChange(updatedDistributions);
    setShowRarityPercentages(false);
    toast({ title: 'Applied rarity percentage distribution' });
  };

  const applyTraderLeverageToAll = () => {
    if (!bulkTraderLeverage) return;
    const leverage = parseInt(bulkTraderLeverage);
    if (isNaN(leverage) || leverage < 10 || leverage > 100) return;
    
    onChange(distributions.map(d => ({ ...d, traderLeverage: leverage })));
    setBulkTraderLeverage('');
    toast({ title: `Applied trader leverage ${leverage} to all ranks` });
  };

  const evenSplitTraderLeverage = () => {
    const avgLeverage = getAverageTraderLeverage();
    onChange(distributions.map(d => ({ ...d, traderLeverage: avgLeverage })));
    toast({ title: `Applied average trader leverage (${avgLeverage}) to all ranks` });
  };

  const applyMultiplierToAll = () => {
    if (!bulkMultiplier) return;
    const multiplier = parseInt(bulkMultiplier);
    if (isNaN(multiplier) || multiplier < 1) return;
    
    onChange(distributions.map(d => ({ ...d, multiplier })));
    setBulkMultiplier('');
    toast({ title: `Applied multiplier ${multiplier} to all ranks` });
  };

  const evenSplitMultiplier = () => {
    const defaultMultiplier = 5;
    onChange(distributions.map(d => ({ ...d, multiplier: defaultMultiplier })));
    toast({ title: `Applied default multiplier (${defaultMultiplier}) to all ranks` });
  };

  const clearAllBulkInputs = () => {
    setBulkQuantity('');
    setBulkSuits([]);
    setBulkEras([]);
    setBulkRarities([]);
    setBulkTraderLeverage('');
    setBulkMultiplier('');
  };

  const updateDistribution = (index: number, updates: Partial<RankDistribution>) => {
    const newDistributions = [...distributions];
    newDistributions[index] = { ...newDistributions[index], ...updates };
    onChange(newDistributions);
  };

  const totalPercentage = Object.values(rarityPercentages).reduce((sum, val) => sum + val, 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.1;

  const allocatedTotal = distributions.reduce((sum, d) => sum + d.quantity, 0);
  const isValid = allocatedTotal === totalCards;

  return (
    <div className="space-y-4">
      {/* Validation Header */}
      <div className={`p-4 rounded-lg border ${isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Allocated: <span className="font-bold">{allocatedTotal}</span> / {totalCards}
            {isValid ? ' ✓' : ' ⚠️'}
          </span>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="border border-border rounded-lg overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm">
            <tr className="border-b-2 border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Suits
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Eras
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Rarities
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Trader Leverage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Multiplier
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-border">
                Time Value
              </th>
            </tr>
          </thead>

          {/* Bulk Edit Row */}
          <tr className="bg-secondary/30 border-b-2 border-border">
            <td className="px-4 py-3 text-sm font-medium text-center border-r border-border">
              Bulk Edit ↓
            </td>
            
            {/* Quantity Bulk Edit */}
            <td className="px-4 py-3 border-r border-border">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={bulkQuantity}
                    onChange={(e) => setBulkQuantity(e.target.value)}
                    className="w-20 h-8 text-xs"
                    min="0"
                  />
                  <Button 
                    onClick={applyQuantityToAll} 
                    disabled={!bulkQuantity}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <Button 
                  onClick={evenSplitQuantity} 
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs w-full"
                >
                  Even Split
                </Button>
              </div>
            </td>

            {/* Suits Bulk Edit */}
            <td className="px-4 py-3 border-r border-border">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <BatchFilterDropdown
                    label="Suits"
                    options={SUIT_OPTIONS}
                    selected={bulkSuits}
                    onChange={setBulkSuits}
                    placeholder="Select suits"
                  />
                  <Button 
                    onClick={applySuitsToAll} 
                    disabled={bulkSuits.length === 0}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <Button 
                  onClick={evenSplitSuits} 
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs w-full"
                >
                  All Suits
                </Button>
              </div>
            </td>

            {/* Eras Bulk Edit */}
            <td className="px-4 py-3 border-r border-border">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <BatchFilterDropdown
                    label="Eras"
                    options={ERA_OPTIONS}
                    selected={bulkEras}
                    onChange={setBulkEras}
                    placeholder="Select eras"
                  />
                  <Button 
                    onClick={applyErasToAll} 
                    disabled={bulkEras.length === 0}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <Button 
                  onClick={evenSplitEras} 
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs w-full"
                >
                  All Eras
                </Button>
              </div>
            </td>

            {/* Rarities Bulk Edit */}
            <td className="px-4 py-3 border-r border-border">
              <div className="flex flex-col gap-2">
                {!showRarityPercentages ? (
                  <>
                    <div className="flex gap-2">
                      <BatchFilterDropdown
                        label="Rarities"
                        options={RARITY_OPTIONS}
                        selected={bulkRarities}
                        onChange={setBulkRarities}
                        placeholder="Select rarities"
                      />
                      <Button 
                        onClick={applyRaritiesToAll} 
                        disabled={bulkRarities.length === 0}
                        size="sm"
                        className="h-8 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={evenSplitRarities} 
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs flex-1"
                      >
                        All Rarities
                      </Button>
                      <Button 
                        onClick={() => setShowRarityPercentages(true)}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        <Percent className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 p-2 bg-background/50 rounded border border-border">
                    <div className="text-xs font-semibold">Rarity %</div>
                    {RARITY_OPTIONS.map(rarity => (
                      <div key={rarity} className="flex items-center gap-2">
                        <span className="text-xs w-24 truncate">{rarity}:</span>
                        <Input
                          type="number"
                          value={rarityPercentages[rarity]}
                          onChange={(e) => setRarityPercentages(prev => ({
                            ...prev,
                            [rarity]: parseFloat(e.target.value) || 0
                          }))}
                          className="h-6 text-xs w-16"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <span className="text-xs">%</span>
                      </div>
                    ))}
                    <div className={`text-xs font-medium ${isPercentageValid ? 'text-green-600' : 'text-destructive'}`}>
                      Total: {totalPercentage.toFixed(1)}%
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={applyRarityPercentageDistribution}
                        disabled={!isPercentageValid}
                        size="sm"
                        className="h-7 text-xs flex-1"
                      >
                        Apply %
                      </Button>
                      <Button 
                        onClick={() => setShowRarityPercentages(false)}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </td>

            {/* Trader Leverage Bulk Edit */}
            <td className="px-4 py-3 border-r border-border">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Leverage"
                    value={bulkTraderLeverage}
                    onChange={(e) => setBulkTraderLeverage(e.target.value)}
                    className="w-24 h-8 text-xs"
                    min="10"
                    max="100"
                  />
                  <Button 
                    onClick={applyTraderLeverageToAll} 
                    disabled={!bulkTraderLeverage}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <Button 
                  onClick={evenSplitTraderLeverage} 
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs w-full"
                >
                  Average
                </Button>
              </div>
            </td>

            {/* Multiplier Bulk Edit */}
            <td className="px-4 py-3 border-r border-border">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Mult"
                    value={bulkMultiplier}
                    onChange={(e) => setBulkMultiplier(e.target.value)}
                    className="w-20 h-8 text-xs"
                    min="1"
                  />
                  <Button 
                    onClick={applyMultiplierToAll} 
                    disabled={!bulkMultiplier}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Apply
                  </Button>
                </div>
                <Button 
                  onClick={evenSplitMultiplier} 
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs w-full"
                >
                  Default (5)
                </Button>
              </div>
            </td>

            {/* Time Value (calculated) */}
            <td className="px-4 py-3 text-center text-xs text-muted-foreground border-r border-border">
              (calculated)
            </td>
          </tr>

          {/* Data Rows */}
          <tbody>
            {distributions.map((dist, index) => {
              const timeValue = dist.traderLeverage * dist.multiplier;
              
              return (
                <tr key={dist.rank} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-2 text-sm font-medium border-r border-border">
                    {dist.rank}
                  </td>

                  <td className="px-4 py-2 border-r border-border">
                    <Input
                      type="number"
                      min="0"
                      value={dist.quantity}
                      onChange={(e) => updateDistribution(index, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>

                  <td className="px-4 py-2 border-r border-border">
                    <BatchFilterDropdown
                      label="Suits"
                      options={SUIT_OPTIONS}
                      selected={dist.suits}
                      onChange={(suits) => updateDistribution(index, { suits })}
                      placeholder={dist.suits.length > 0 ? `${dist.suits.length} selected` : 'All'}
                    />
                  </td>

                  <td className="px-4 py-2 border-r border-border">
                    <BatchFilterDropdown
                      label="Eras"
                      options={ERA_OPTIONS}
                      selected={dist.eras}
                      onChange={(eras) => updateDistribution(index, { eras })}
                      placeholder={dist.eras.length > 0 ? `${dist.eras.length} selected` : 'All'}
                    />
                  </td>

                  <td className="px-4 py-2 border-r border-border">
                    <BatchFilterDropdown
                      label="Rarities"
                      options={RARITY_OPTIONS}
                      selected={dist.rarities}
                      onChange={(rarities) => updateDistribution(index, { rarities })}
                      placeholder={dist.rarities.length > 0 ? `${dist.rarities.length} selected` : 'All'}
                    />
                  </td>

                  <td className="px-4 py-2 border-r border-border">
                    <Input
                      type="number"
                      min="10"
                      max="100"
                      value={dist.traderLeverage}
                      onChange={(e) => updateDistribution(index, { traderLeverage: Math.max(10, parseInt(e.target.value) || 10) })}
                      className="w-24 h-8 text-xs"
                    />
                  </td>

                  <td className="px-4 py-2 border-r border-border">
                    <Input
                      type="number"
                      min="1"
                      value={dist.multiplier}
                      onChange={(e) => updateDistribution(index, { multiplier: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>

                  <td className="px-4 py-2 text-sm text-center text-muted-foreground border-r border-border">
                    {timeValue}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
