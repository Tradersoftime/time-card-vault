import { Input } from '@/components/ui/input';
import { BatchFilterDropdown } from '@/components/BatchFilterDropdown';
import { RankDistribution, RANK_OPTIONS, SUIT_OPTIONS, ERA_OPTIONS, RARITY_OPTIONS, TRADER_VALUE_OPTIONS } from './utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RankDistributionTableProps {
  distributions: RankDistribution[];
  totalCards: number;
  onChange: (distributions: RankDistribution[]) => void;
}

export function RankDistributionTable({ distributions, totalCards, onChange }: RankDistributionTableProps) {
  const allocatedTotal = distributions.reduce((sum, d) => sum + d.quantity, 0);
  const isValid = allocatedTotal === totalCards;
  const validationColor = isValid ? 'text-green-600' : 'text-destructive';
  
  const updateDistribution = (index: number, updates: Partial<RankDistribution>) => {
    const newDistributions = [...distributions];
    newDistributions[index] = { ...newDistributions[index], ...updates };
    onChange(newDistributions);
  };
  
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Rank Distribution</h3>
        <div className={`text-sm font-medium ${validationColor}`}>
          Allocated: {allocatedTotal}/{totalCards} {isValid ? '✓' : '⚠️'}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium">Rank</th>
              <th className="text-left p-2 font-medium">Quantity</th>
              <th className="text-left p-2 font-medium">%</th>
              <th className="text-left p-2 font-medium">Suits</th>
              <th className="text-left p-2 font-medium">Eras</th>
              <th className="text-left p-2 font-medium">Rarities</th>
              <th className="text-left p-2 font-medium">Time Value</th>
              <th className="text-left p-2 font-medium">Trader Value</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((dist, index) => {
              const percentage = totalCards > 0 ? ((dist.quantity / totalCards) * 100).toFixed(1) : '0.0';
              
              return (
                <tr key={dist.rank} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="p-2 font-medium">{dist.rank}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={dist.quantity}
                      onChange={(e) => updateDistribution(index, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-20 h-9"
                    />
                  </td>
                  <td className="p-2 text-muted-foreground">{percentage}%</td>
                  <td className="p-2">
                    <BatchFilterDropdown
                      label="Suits"
                      options={SUIT_OPTIONS}
                      selected={dist.suits}
                      onChange={(suits) => updateDistribution(index, { suits })}
                      placeholder="All"
                    />
                  </td>
                  <td className="p-2">
                    <BatchFilterDropdown
                      label="Eras"
                      options={ERA_OPTIONS}
                      selected={dist.eras}
                      onChange={(eras) => updateDistribution(index, { eras })}
                      placeholder="All"
                    />
                  </td>
                  <td className="p-2">
                    <BatchFilterDropdown
                      label="Rarities"
                      options={RARITY_OPTIONS}
                      selected={dist.rarities}
                      onChange={(rarities) => updateDistribution(index, { rarities })}
                      placeholder="All"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={dist.timeValue}
                      onChange={(e) => updateDistribution(index, { timeValue: parseInt(e.target.value) || 0 })}
                      className="w-20 h-9"
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={dist.traderValue}
                      onValueChange={(value) => updateDistribution(index, { traderValue: value })}
                    >
                      <SelectTrigger className="w-28 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADER_VALUE_OPTIONS.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
