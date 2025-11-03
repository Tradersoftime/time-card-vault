import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spade, Check, AlertCircle } from 'lucide-react';
import { SUIT_OPTIONS } from './utils';

interface SuitsRowProps {
  selectedSuits: string[];
  suitCardCounts: Record<string, number>;
  totalCards: number;
  onChange: (suits: string[], cardCounts: Record<string, number>) => void;
}

export function SuitsRow({ selectedSuits, suitCardCounts, totalCards, onChange }: SuitsRowProps) {
  const handleEvenSplit = () => {
    const cardsPerSuit = Math.floor(totalCards / SUIT_OPTIONS.length);
    const remainder = totalCards % SUIT_OPTIONS.length;
    const newCounts: Record<string, number> = {};
    
    SUIT_OPTIONS.forEach((suit, index) => {
      newCounts[suit] = cardsPerSuit + (index < remainder ? 1 : 0);
    });
    
    onChange(SUIT_OPTIONS, newCounts);
  };

  const handleToggleSuit = (suit: string) => {
    if (selectedSuits.includes(suit)) {
      const newSuits = selectedSuits.filter(s => s !== suit);
      const newCounts = { ...suitCardCounts };
      delete newCounts[suit];
      
      // Redistribute cards
      if (newSuits.length > 0) {
        const cardsPerSuit = Math.floor(totalCards / newSuits.length);
        const remainder = totalCards % newSuits.length;
        newSuits.forEach((s, index) => {
          newCounts[s] = cardsPerSuit + (index < remainder ? 1 : 0);
        });
      }
      
      onChange(newSuits, newCounts);
    } else {
      const newSuits = [...selectedSuits, suit];
      const cardsPerSuit = Math.floor(totalCards / newSuits.length);
      const remainder = totalCards % newSuits.length;
      const newCounts: Record<string, number> = { ...suitCardCounts };
      
      newSuits.forEach((s, index) => {
        newCounts[s] = cardsPerSuit + (index < remainder ? 1 : 0);
      });
      
      onChange(newSuits, newCounts);
    }
  };

  const handleCardCountChange = (suit: string, value: number) => {
    const newCounts = { ...suitCardCounts, [suit]: Math.max(0, value) };
    onChange(selectedSuits, newCounts);
  };

  const allocatedTotal = Object.values(suitCardCounts).reduce((sum, count) => sum + count, 0);
  const isValid = allocatedTotal === totalCards;

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
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={suitCardCounts[suit] || 0}
                    onChange={(e) => handleCardCountChange(suit, parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">cards</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {selectedSuits.length} of {SUIT_OPTIONS.length} selected
        </span>
        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Total: {allocatedTotal}/{totalCards} cards
            </span>
          ) : (
            <span className="text-sm font-medium text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Total: {allocatedTotal}/{totalCards} ({allocatedTotal - totalCards > 0 ? '+' : ''}{allocatedTotal - totalCards})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
