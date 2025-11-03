import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Check, AlertCircle } from 'lucide-react';
import { ERA_OPTIONS } from './utils';

interface EraRowProps {
  selectedEras: string[];
  eraCardCounts: Record<string, number>;
  totalCards: number;
  onChange: (eras: string[], cardCounts: Record<string, number>) => void;
}

export function EraRow({ selectedEras, eraCardCounts, totalCards, onChange }: EraRowProps) {
  const handleEvenSplit = () => {
    const cardsPerEra = Math.floor(totalCards / ERA_OPTIONS.length);
    const remainder = totalCards % ERA_OPTIONS.length;
    const newCounts: Record<string, number> = {};
    
    ERA_OPTIONS.forEach((era, index) => {
      newCounts[era] = cardsPerEra + (index < remainder ? 1 : 0);
    });
    
    onChange(ERA_OPTIONS, newCounts);
  };

  const handleToggleEra = (era: string) => {
    if (selectedEras.includes(era)) {
      const newEras = selectedEras.filter(e => e !== era);
      const newCounts = { ...eraCardCounts };
      delete newCounts[era];
      
      // Redistribute cards
      if (newEras.length > 0) {
        const cardsPerEra = Math.floor(totalCards / newEras.length);
        const remainder = totalCards % newEras.length;
        newEras.forEach((e, index) => {
          newCounts[e] = cardsPerEra + (index < remainder ? 1 : 0);
        });
      }
      
      onChange(newEras, newCounts);
    } else {
      const newEras = [...selectedEras, era];
      const cardsPerEra = Math.floor(totalCards / newEras.length);
      const remainder = totalCards % newEras.length;
      const newCounts: Record<string, number> = { ...eraCardCounts };
      
      newEras.forEach((e, index) => {
        newCounts[e] = cardsPerEra + (index < remainder ? 1 : 0);
      });
      
      onChange(newEras, newCounts);
    }
  };

  const handleCardCountChange = (era: string, value: number) => {
    const newCounts = { ...eraCardCounts, [era]: Math.max(0, value) };
    onChange(selectedEras, newCounts);
  };

  const allocatedTotal = Object.values(eraCardCounts).reduce((sum, count) => sum + count, 0);
  const isValid = allocatedTotal === totalCards;

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Eras</h3>
        </div>
        <Button onClick={handleEvenSplit} variant="outline" size="sm">
          <Check className="h-4 w-4 mr-1" />
          Select All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ERA_OPTIONS.map((era) => {
          const isSelected = selectedEras.includes(era);
          return (
            <div key={era} className="space-y-2">
              <div
                onClick={() => handleToggleEra(era)}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => handleToggleEra(era)} />
                <label className="text-sm font-medium cursor-pointer">{era}</label>
              </div>
              {isSelected && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={eraCardCounts[era] || 0}
                    onChange={(e) => handleCardCountChange(era, parseInt(e.target.value) || 0)}
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
          {selectedEras.length} of {ERA_OPTIONS.length} selected
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
