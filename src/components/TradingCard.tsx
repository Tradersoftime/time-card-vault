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

  const getSuitIcon = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '•';
    }
  };

  const getSuitColor = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
      case 'diamonds':
        return 'text-red-500';
      case 'clubs':
      case 'spades':
        return 'text-emerald-500';
      default:
        return 'text-primary';
    }
  };

  const getEraColor = (era: string) => {
    switch (era.toLowerCase()) {
      case 'prehistoric':
        return 'text-amber-400';
      case 'ancient':
        return 'text-yellow-400';
      case 'medieval':
        return 'text-rose-400';
      case 'modern':
        return 'text-slate-300';
      case 'future':
        return 'text-cyan-400';
      default:
        return 'text-primary';
    }
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
        <div className="space-y-1.5">
          <h3 className="font-semibold text-sm leading-tight text-foreground uppercase">{card.name}</h3>
          
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {card.era}
            </div>
            <div className="text-xl font-bold flex items-center gap-2">
              <span className="text-foreground uppercase">{card.rank}</span>
              <span className={cn("text-2xl", getSuitColor(card.suit))}>{getSuitIcon(card.suit)}</span>
            </div>
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