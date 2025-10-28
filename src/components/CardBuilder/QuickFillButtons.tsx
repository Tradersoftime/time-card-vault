import { Button } from '@/components/ui/button';
import { RankDistribution, RANK_OPTIONS } from './utils';

interface QuickFillButtonsProps {
  totalCards: number;
  onDistribute: (distributions: RankDistribution[]) => void;
}

export function QuickFillButtons({ totalCards, onDistribute }: QuickFillButtonsProps) {
  const handleEvenSplit = () => {
    const perRank = Math.floor(totalCards / RANK_OPTIONS.length);
    const remainder = totalCards % RANK_OPTIONS.length;
    
    const distributions: RankDistribution[] = RANK_OPTIONS.map((rank, index) => ({
      rank,
      quantity: perRank + (index < remainder ? 1 : 0),
      suits: [],
      eras: [],
      rarities: [],
      timeValue: 0,
      traderValue: 'Standard',
    }));
    
    onDistribute(distributions);
  };
  
  const handlePyramid = () => {
    // Pyramid distribution: more commons, fewer face cards
    const weights: Record<string, number> = {
      'Ace': 4,
      'King': 4,
      'Queen': 4,
      'Jack': 4,
      '10': 6,
      '9': 8,
      '8': 10,
      '7': 10,
      '6': 10,
      '5': 10,
      '4': 10,
      '3': 10,
      '2': 10,
    };
    
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    
    const distributions: RankDistribution[] = RANK_OPTIONS.map(rank => ({
      rank,
      quantity: Math.round((weights[rank] / totalWeight) * totalCards),
      suits: [],
      eras: [],
      rarities: [],
      timeValue: 0,
      traderValue: 'Standard',
    }));
    
    // Adjust to match exact total
    const currentTotal = distributions.reduce((sum, d) => sum + d.quantity, 0);
    if (currentTotal !== totalCards) {
      distributions[0].quantity += totalCards - currentTotal;
    }
    
    onDistribute(distributions);
  };
  
  const handleClear = () => {
    const distributions: RankDistribution[] = RANK_OPTIONS.map(rank => ({
      rank,
      quantity: 0,
      suits: [],
      eras: [],
      rarities: [],
      timeValue: 0,
      traderValue: 'Standard',
    }));
    
    onDistribute(distributions);
  };
  
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleEvenSplit}
      >
        Even Split
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePyramid}
      >
        Pyramid
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClear}
      >
        Clear All
      </Button>
    </div>
  );
}
