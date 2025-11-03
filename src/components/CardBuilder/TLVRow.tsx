import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';
import { RARITY_OPTIONS, TRADER_LEVERAGE_RANGES } from './utils';

interface TLVRowProps {
  multiplier: number;
  rarityPercentages: Record<string, number>;
  totalCards: number;
  onChange: (multiplier: number) => void;
}

export function TLVRow({ multiplier, rarityPercentages, totalCards, onChange }: TLVRowProps) {
  const getTLVInfo = (rarity: string) => {
    const range = TRADER_LEVERAGE_RANGES[rarity];
    if (!range) return { min: 0, max: 0, cards: 0 };
    
    const percentage = rarityPercentages[rarity] || 0;
    const cards = Math.round((totalCards * percentage) / 100);
    
    return {
      min: range.min,
      max: range.max,
      cards,
      minTime: range.min * multiplier,
      maxTime: range.max * multiplier,
    };
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">TLV & Time Value</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">Multiplier:</label>
          <Input
            type="number"
            min="1"
            max="100"
            value={multiplier}
            onChange={(e) => onChange(parseInt(e.target.value) || 1)}
            className="w-20 h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {RARITY_OPTIONS.map((rarity) => {
          const info = getTLVInfo(rarity);
          return (
            <div key={rarity} className="p-4 rounded-lg border border-border space-y-2">
              <h4 className="font-medium text-sm">{rarity}</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>TLV Range: {info.min}-{info.max}</p>
                <p>Time: {info.minTime}-{info.maxTime}</p>
                <Badge variant="outline" className="w-full justify-center mt-2">
                  {info.cards} cards
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Formula: <span className="font-mono text-foreground">TLV × {multiplier} = Time Value</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Each card within a rarity will be evenly distributed across its TLV range.
        </p>
      </div>
    </div>
  );
}
