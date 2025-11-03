import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, RotateCcw } from 'lucide-react';
import { RARITY_OPTIONS, TRADER_LEVERAGE_RANGES } from './utils';

interface TLVRowProps {
  multiplier: number;
  rarityPercentages: Record<string, number>;
  totalCards: number;
  tlvRanges: Record<string, { min: number; max: number }>;
  onChange: (multiplier: number, tlvRanges: Record<string, { min: number; max: number }>) => void;
}

export function TLVRow({ multiplier, rarityPercentages, totalCards, tlvRanges, onChange }: TLVRowProps) {
  const handleMultiplierChange = (newMultiplier: number) => {
    onChange(newMultiplier, tlvRanges);
  };

  const handleTLVRangeChange = (rarity: string, field: 'min' | 'max', value: number) => {
    const newRanges = {
      ...tlvRanges,
      [rarity]: {
        ...tlvRanges[rarity],
        [field]: Math.max(0, value),
      },
    };
    onChange(multiplier, newRanges);
  };

  const handleResetToDefaults = () => {
    onChange(multiplier, TRADER_LEVERAGE_RANGES);
  };

  const getTLVInfo = (rarity: string) => {
    const range = tlvRanges[rarity] || { min: 0, max: 0 };
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">TLV & Time Value</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleResetToDefaults} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Multiplier:</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={multiplier}
              onChange={(e) => handleMultiplierChange(parseInt(e.target.value) || 1)}
              className="w-20 h-9"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {RARITY_OPTIONS.map((rarity) => {
          const info = getTLVInfo(rarity);
          return (
            <div key={rarity} className="p-4 rounded-lg border border-border space-y-3">
              <h4 className="font-medium text-sm">{rarity}</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={info.min}
                    onChange={(e) => handleTLVRangeChange(rarity, 'min', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                    placeholder="Min"
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input
                    type="number"
                    min="0"
                    value={info.max}
                    onChange={(e) => handleTLVRangeChange(rarity, 'max', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                    placeholder="Max"
                  />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Time: {info.minTime}-{info.maxTime}</p>
                  <Badge variant="outline" className="w-full justify-center">
                    {info.cards} cards
                  </Badge>
                </div>
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
