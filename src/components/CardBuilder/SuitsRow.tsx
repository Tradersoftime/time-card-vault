import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spade, Check } from 'lucide-react';
import { SUIT_OPTIONS } from './utils';

interface SuitsRowProps {
  selectedSuits: string[];
  totalCards: number;
  onChange: (suits: string[]) => void;
}

export function SuitsRow({ selectedSuits, totalCards, onChange }: SuitsRowProps) {
  const handleEvenSplit = () => {
    onChange(SUIT_OPTIONS);
  };

  const handleToggleSuit = (suit: string) => {
    if (selectedSuits.includes(suit)) {
      onChange(selectedSuits.filter(s => s !== suit));
    } else {
      onChange([...selectedSuits, suit]);
    }
  };

  const getCardsPerSuit = () => {
    if (selectedSuits.length === 0) return 0;
    return Math.floor(totalCards / selectedSuits.length);
  };

  const getSuitIcon = (suit: string) => {
    const icons: Record<string, string> = {
      Spades: '♠',
      Hearts: '♥',
      Diamonds: '♦',
      Clubs: '♣',
    };
    return icons[suit] || '♠';
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Spade className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Suits</h3>
        </div>
        <Button onClick={handleEvenSplit} variant="outline" size="sm">
          <Check className="h-4 w-4 mr-1" />
          Select All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUIT_OPTIONS.map((suit) => {
          const isSelected = selectedSuits.includes(suit);
          return (
            <div key={suit} className="space-y-2">
              <div
                onClick={() => handleToggleSuit(suit)}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSuit(suit)} />
                <span className="text-xl mr-1">{getSuitIcon(suit)}</span>
                <label className="text-sm font-medium cursor-pointer">{suit}</label>
              </div>
              {isSelected && (
                <Badge variant="secondary" className="w-full justify-center">
                  ~{getCardsPerSuit()} cards
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {selectedSuits.length} of {SUIT_OPTIONS.length} selected
        </span>
        {selectedSuits.length > 0 && (
          <span className="text-sm font-medium">~{getCardsPerSuit()} cards per suit</span>
        )}
      </div>
    </div>
  );
}
