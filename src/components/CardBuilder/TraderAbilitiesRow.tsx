import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Zap, Plus, X } from 'lucide-react';
import type { TraderAbility } from './utils';

interface TraderAbilitiesRowProps {
  traderAbilities: TraderAbility[];
  totalCards: number;
  onChange: (abilities: TraderAbility[]) => void;
}

export function TraderAbilitiesRow({ traderAbilities, totalCards, onChange }: TraderAbilitiesRowProps) {
  const handleAddAbility = () => {
    onChange([
      ...traderAbilities,
      {
        id: `ability-${Date.now()}`,
        name: '',
        description: '',
        usePercentage: true,
        percentage: 0,
        quantity: 0,
      },
    ]);
  };

  const handleRemoveAbility = (id: string) => {
    const newAbilities = traderAbilities.filter(a => a.id !== id);
    onChange(newAbilities.length > 0 ? newAbilities : [
      {
        id: `ability-${Date.now()}`,
        name: '',
        description: '',
        usePercentage: true,
        percentage: 0,
        quantity: 0,
      },
    ]);
  };

  const handleAbilityChange = (id: string, field: keyof TraderAbility, value: any) => {
    const newAbilities = traderAbilities.map(ability => {
      if (ability.id !== id) return ability;
      
      const updated = { ...ability, [field]: value };
      
      // If switching modes, calculate the other value
      if (field === 'usePercentage') {
        if (value) {
          // Switching to percentage mode - calculate percentage from quantity
          updated.percentage = totalCards > 0 ? (ability.quantity / totalCards) * 100 : 0;
        } else {
          // Switching to quantity mode - calculate quantity from percentage
          updated.quantity = Math.round((ability.percentage / 100) * totalCards);
        }
      } else if (field === 'percentage' && ability.usePercentage) {
        // Update quantity when percentage changes
        updated.quantity = Math.round((Number(value) / 100) * totalCards);
      } else if (field === 'quantity' && !ability.usePercentage) {
        // Update percentage when quantity changes
        updated.percentage = totalCards > 0 ? (Number(value) / totalCards) * 100 : 0;
      }
      
      return updated;
    });
    
    onChange(newAbilities);
  };

  const getTotalAllocated = () => {
    return traderAbilities.reduce((sum, ability) => {
      const cards = ability.usePercentage
        ? Math.round((ability.percentage / 100) * totalCards)
        : ability.quantity;
      return sum + cards;
    }, 0);
  };

  const getUnassignedCards = () => {
    return Math.max(0, totalCards - getTotalAllocated());
  };

  const getCardCount = (ability: TraderAbility) => {
    return ability.usePercentage
      ? Math.round((ability.percentage / 100) * totalCards)
      : ability.quantity;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Trader Abilities</h3>
        </div>
        <Button onClick={handleAddAbility} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Ability
        </Button>
      </div>

      <div className="space-y-4">
        {traderAbilities.map((ability) => (
          <div key={ability.id} className="p-4 rounded-lg border border-border bg-background/50 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={ability.name}
                    onChange={(e) => handleAbilityChange(ability.id, 'name', e.target.value)}
                    placeholder="Ability Name (e.g., Diamond Hands)"
                    className="h-9 font-medium"
                  />
                  <Button
                    onClick={() => handleRemoveAbility(ability.id)}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <Textarea
                  value={ability.description}
                  onChange={(e) => handleAbilityChange(ability.id, 'description', e.target.value)}
                  placeholder="Full description of what this ability does..."
                  className="min-h-[80px] resize-none text-sm"
                />
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={ability.usePercentage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAbilityChange(ability.id, 'usePercentage', true)}
                      className="h-8"
                    >
                      Use %
                    </Button>
                    <Button
                      variant={!ability.usePercentage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAbilityChange(ability.id, 'usePercentage', false)}
                      className="h-8"
                    >
                      Use Qty
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    {ability.usePercentage ? (
                      <>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={ability.percentage}
                          onChange={(e) => handleAbilityChange(ability.id, 'percentage', parseFloat(e.target.value) || 0)}
                          className="h-8 w-24"
                        />
                        <Label className="text-sm text-muted-foreground">%</Label>
                      </>
                    ) : (
                      <>
                        <Input
                          type="number"
                          min="0"
                          value={ability.quantity}
                          onChange={(e) => handleAbilityChange(ability.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="h-8 w-24"
                        />
                        <Label className="text-sm text-muted-foreground">cards</Label>
                      </>
                    )}
                    
                    <Badge variant="secondary" className="ml-auto">
                      {ability.usePercentage 
                        ? `~${getCardCount(ability)} cards`
                        : `~${ability.percentage.toFixed(1)}%`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {traderAbilities.length} abilit{traderAbilities.length !== 1 ? 'ies' : 'y'}
        </span>
        <div className="flex items-center gap-4">
          <Badge variant={getUnassignedCards() > 0 ? "default" : "secondary"}>
            {getUnassignedCards()} unassigned
          </Badge>
          <span className="text-sm font-medium">
            {getTotalAllocated()} / {totalCards} cards allocated
          </span>
        </div>
      </div>
    </div>
  );
}
