import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Percent, Sparkles } from 'lucide-react';
import { RARITY_OPTIONS } from './utils';

interface RarityRowProps {
  totalCards: number;
  rarityPercentages: Record<string, number>;
  onChange: (percentages: Record<string, number>) => void;
}

export function RarityRow({ totalCards, rarityPercentages, onChange }: RarityRowProps) {
  const totalPercentage = Object.values(rarityPercentages).reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleEvenSplit = () => {
    const evenValue = 100 / RARITY_OPTIONS.length;
    const newPercentages: Record<string, number> = {};
    RARITY_OPTIONS.forEach(rarity => {
      newPercentages[rarity] = parseFloat(evenValue.toFixed(2));
    });
    onChange(newPercentages);
  };

  const handlePercentageChange = (rarity: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({ ...rarityPercentages, [rarity]: numValue });
  };

  const getCardCount = (percentage: number) => {
    return Math.round((totalCards * percentage) / 100);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Rarity Distribution</h3>
        </div>
        <Button onClick={handleEvenSplit} variant="outline" size="sm">
          Even Split
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {RARITY_OPTIONS.map((rarity) => (
          <div key={rarity} className="space-y-2">
            <label className="text-sm font-medium">{rarity}</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={rarityPercentages[rarity] || 0}
                onChange={(e) => handlePercentageChange(rarity, e.target.value)}
                className="h-9"
              />
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <Badge variant="secondary" className="w-full justify-center">
              {getCardCount(rarityPercentages[rarity] || 0)} cards
            </Badge>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm font-medium">Total:</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${isValid ? 'text-success' : 'text-destructive'}`}>
            {totalPercentage.toFixed(2)}%
          </span>
          {isValid ? (
            <span className="text-success text-sm">✓ Valid</span>
          ) : (
            <span className="text-destructive text-sm">Must equal 100%</span>
          )}
        </div>
      </div>
    </div>
  );
}
