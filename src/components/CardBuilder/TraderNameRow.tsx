import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Plus, X } from 'lucide-react';

interface TraderNameRowProps {
  traderNames: string[];
  totalCards: number;
  onChange: (names: string[]) => void;
}

export function TraderNameRow({ traderNames, totalCards, onChange }: TraderNameRowProps) {
  const handleAddName = () => {
    onChange([...traderNames, '']);
  };

  const handleRemoveName = (index: number) => {
    const newNames = traderNames.filter((_, i) => i !== index);
    onChange(newNames.length > 0 ? newNames : ['']);
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...traderNames];
    newNames[index] = value;
    onChange(newNames);
  };

  const getCardsPerName = () => {
    const validNames = traderNames.filter(n => n.trim()).length;
    if (validNames === 0) return 0;
    return Math.floor(totalCards / validNames);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Trader Names</h3>
        </div>
        <Button onClick={handleAddName} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Name
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {traderNames.map((name, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`Trader ${index + 1}`}
                className="h-9"
              />
              {traderNames.length > 1 && (
                <Button
                  onClick={() => handleRemoveName(index)}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {name.trim() && (
              <Badge variant="secondary" className="w-full justify-center">
                ~{getCardsPerName()} cards
              </Badge>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {traderNames.filter(n => n.trim()).length} active trader{traderNames.filter(n => n.trim()).length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm font-medium">
          ~{getCardsPerName()} cards per trader
        </span>
      </div>
    </div>
  );
}
