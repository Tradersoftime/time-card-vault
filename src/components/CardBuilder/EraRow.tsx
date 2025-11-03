import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check } from 'lucide-react';
import { ERA_OPTIONS } from './utils';

interface EraRowProps {
  selectedEras: string[];
  totalCards: number;
  onChange: (eras: string[]) => void;
}

export function EraRow({ selectedEras, totalCards, onChange }: EraRowProps) {
  const handleEvenSplit = () => {
    onChange(ERA_OPTIONS);
  };

  const handleToggleEra = (era: string) => {
    if (selectedEras.includes(era)) {
      onChange(selectedEras.filter(e => e !== era));
    } else {
      onChange([...selectedEras, era]);
    }
  };

  const getCardsPerEra = () => {
    if (selectedEras.length === 0) return 0;
    return Math.floor(totalCards / selectedEras.length);
  };

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
                <Badge variant="secondary" className="w-full justify-center">
                  ~{getCardsPerEra()} cards
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {selectedEras.length} of {ERA_OPTIONS.length} selected
        </span>
        {selectedEras.length > 0 && (
          <span className="text-sm font-medium">~{getCardsPerEra()} cards per era</span>
        )}
      </div>
    </div>
  );
}
