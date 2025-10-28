import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RarityDistribution, RARITY_OPTIONS, TRADER_LEVERAGE_RANGES } from './utils';
import { Info } from 'lucide-react';

interface RarityDistributionSectionProps {
  rarityDistributions: RarityDistribution[];
  totalCards: number;
  onChange: (distributions: RarityDistribution[]) => void;
}

export function RarityDistributionSection({ 
  rarityDistributions, 
  totalCards, 
  onChange 
}: RarityDistributionSectionProps) {
  const allocatedTotal = rarityDistributions.reduce((sum, d) => sum + d.quantity, 0);
  const isValid = allocatedTotal === totalCards;
  const validationColor = isValid ? 'text-green-600' : 'text-destructive';
  
  const updateDistribution = (index: number, quantity: number) => {
    const newDistributions = [...rarityDistributions];
    newDistributions[index].quantity = Math.max(0, quantity);
    onChange(newDistributions);
  };
  
  const handleEvenSplitRarities = () => {
    const perRarity = Math.floor(totalCards / RARITY_OPTIONS.length);
    const remainder = totalCards % RARITY_OPTIONS.length;
    
    const distributions: RarityDistribution[] = RARITY_OPTIONS.map((rarity, index) => ({
      rarity,
      quantity: perRarity + (index < remainder ? 1 : 0),
      traderLeverageRange: TRADER_LEVERAGE_RANGES[rarity],
    }));
    
    onChange(distributions);
  };
  
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Rarity Distribution</h3>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEvenSplitRarities}
          >
            Even Split Rarities
          </Button>
          <div className={`text-sm font-medium ${validationColor}`}>
            Allocated: {allocatedTotal}/{totalCards} {isValid ? '✓' : '⚠️'}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium">Rarity</th>
              <th className="text-left p-2 font-medium">Quantity</th>
              <th className="text-left p-2 font-medium">%</th>
              <th className="text-left p-2 font-medium">Trader Leverage Range</th>
            </tr>
          </thead>
          <tbody>
            {rarityDistributions.map((dist, index) => {
              const percentage = totalCards > 0 ? ((dist.quantity / totalCards) * 100).toFixed(1) : '0.0';
              
              return (
                <tr key={dist.rarity} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="p-2 font-medium">{dist.rarity}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={dist.quantity}
                      onChange={(e) => updateDistribution(index, parseInt(e.target.value) || 0)}
                      className="w-24 h-9"
                    />
                  </td>
                  <td className="p-2 text-muted-foreground font-medium">{percentage}%</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span className="text-xs">
                        {dist.traderLeverageRange.min}-{dist.traderLeverageRange.max} 
                        <span className="ml-1 text-primary">(default: {dist.traderLeverageRange.default})</span>
                      </span>
                    </div>
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
