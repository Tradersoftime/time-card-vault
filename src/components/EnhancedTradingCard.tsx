import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useImageDimensions, calculateCardDimensions } from '@/hooks/useImageDimensions';

interface EnhancedTradingCardProps {
  card: {
    id: string;
    name: string;
    suit: string;
    rank: string;
    era: string;
    rarity?: string;
    trader_value?: string | number;
    time_value?: number;
    image_url?: string;
    description?: string;
    is_claimed?: boolean;
    claimed_at?: string;
    redemption_status?: string;
  };
  baseWidth?: number;
  showClaimedBadge?: boolean;
  showFullDetails?: boolean;
  className?: string;
  onClick?: () => void;
}

export function EnhancedTradingCard({ 
  card, 
  baseWidth = 200, 
  showClaimedBadge = false,
  showFullDetails = true,
  className,
  onClick 
}: EnhancedTradingCardProps) {
  const { aspectRatio, loading } = useImageDimensions(card.image_url);
  const { width, height } = calculateCardDimensions(aspectRatio, baseWidth);
  
  const cardStyle = {
    width: `${width}px`,
    height: showFullDetails ? `${height + 60}px` : `${height}px`, // Extra space for details
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

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'degen':
        return 'text-gray-300';
      case 'trader':
        return 'text-amber-300';
      case 'investor':
        return 'text-yellow-400';
      case 'market maker':
        return 'text-rose-300';
      case 'whale':
        return 'text-yellow-300';
      default:
        return 'text-primary';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'credited':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <div 
      className={cn(
        'card-premium rounded-xl p-3 relative overflow-hidden interactive group cursor-pointer',
        className
      )}
      style={cardStyle}
      onClick={onClick}
    >
      {/* Status/Claimed Badge */}
      {(showClaimedBadge && card.is_claimed) || card.redemption_status ? (
        <div className="absolute top-2 right-2 z-10">
          {card.redemption_status ? (
            <Badge variant="outline" className={cn("text-xs", getStatusColor(card.redemption_status))}>
              {card.redemption_status === 'credited' ? 'Claimed' : 
               card.redemption_status === 'pending' ? 'Pending' : 
               card.redemption_status === 'rejected' ? 'Rejected' : card.redemption_status}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
              Owned
            </Badge>
          )}
        </div>
      ) : null}

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
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground" title={card.name}>
            {card.name}
          </h3>
          
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              {card.era}{card.rarity && (
                <span className="text-muted-foreground">- {card.rarity}</span>
              )}
            </div>
            <div className="text-xl font-bold flex items-center gap-2">
              <span className="text-foreground">{card.rank}</span>
              <span className={cn("text-2xl", getSuitColor(card.suit))}>{getSuitIcon(card.suit)}</span>
            </div>
            
            {showFullDetails && (
              <div className="space-y-0.5 text-xs">
                {card.trader_value && (
                  <div className="text-muted-foreground font-medium">
                    TLV: {card.trader_value}
                  </div>
                )}
                {card.time_value && (
                  <div className="text-muted-foreground font-medium">
                    TIME: {card.time_value}
                  </div>
                )}
              </div>
            )}
          </div>

          {showFullDetails && card.claimed_at && (
            <div className="text-xs text-muted-foreground">
              Claimed: {new Date(card.claimed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-glow/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}