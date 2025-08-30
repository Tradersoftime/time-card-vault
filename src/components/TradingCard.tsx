import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useImageDimensions, calculateCardDimensions } from '@/hooks/useImageDimensions';

interface TradingCardProps {
  card: {
    id: string;
    name: string;
    suit: string;
    rank: string;
    era: string;
    image_url?: string;
    description?: string;
    is_claimed?: boolean;
  };
  baseWidth?: number;
  showClaimedBadge?: boolean;
  className?: string;
}

export function TradingCard({ card, baseWidth = 200, showClaimedBadge = false, className }: TradingCardProps) {
  const { aspectRatio, loading } = useImageDimensions(card.image_url);
  const { width, height } = calculateCardDimensions(aspectRatio, baseWidth);
  
  const cardStyle = {
    width: `${width}px`,
    height: `${height}px`,
  };

  const getSuitColor = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
      case 'diamonds':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'clubs':
      case 'spades':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getEraColor = (era: string) => {
    const colors = [
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-green-500/20 text-green-400 border-green-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
    ];
    const index = era.length % colors.length;
    return colors[index];
  };

  return (
    <div 
      className={cn(
        'card-premium rounded-xl p-4 relative overflow-hidden interactive group',
        className
      )}
      style={cardStyle}
    >
      {/* Claimed Badge */}
      {showClaimedBadge && card.is_claimed && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
            Owned
          </Badge>
        </div>
      )}

      {/* Card Content */}
      <div className="h-full flex flex-col">
        {/* Image Area */}
        <div className="flex-1 bg-gradient-to-br from-muted/50 to-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {card.image_url ? (
            <img 
              src={card.image_url} 
              alt={card.name}
              className="w-full h-full object-contain"
              style={{ opacity: loading ? 0.5 : 1 }}
            />
          ) : (
            <div className="text-4xl font-bold text-muted-foreground/50">
              {card.rank}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm leading-tight">{card.name}</h3>
          
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={cn("text-xs", getSuitColor(card.suit))}>
              {card.suit} {card.rank}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", getEraColor(card.era))}>
              {card.era}
            </Badge>
          </div>
          
          {card.description && baseWidth >= 250 && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {card.description}
            </p>
          )}
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-glow/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}