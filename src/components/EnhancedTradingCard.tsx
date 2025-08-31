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
        <div className="space-y-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1" title={card.name}>
            {card.name}
          </h3>
          
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={cn("text-xs", getSuitColor(card.suit))}>
              {card.suit} {card.rank}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", getEraColor(card.era))}>
              {card.era}
            </Badge>
          </div>

          {showFullDetails && (
            <>
              {/* Rarity */}
              {card.rarity && (
                <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {card.rarity}
                </Badge>
              )}

              {/* TLV and TIME Values */}
              <div className="space-y-1">
                {card.trader_value && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">TLV:</span>
                    <span className="font-semibold text-primary">{card.trader_value}</span>
                  </div>
                )}
                {card.time_value && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">TIME:</span>
                    <span className="font-semibold text-primary">{card.time_value}</span>
                  </div>
                )}
              </div>

              {/* Claimed Receipt */}
              {card.claimed_at && (
                <div className="text-xs text-muted-foreground">
                  Claimed: {new Date(card.claimed_at).toLocaleDateString()}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-glow/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}