import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Edit, QrCode, Eye, Download, AlertTriangle } from 'lucide-react';

interface CardData {
  id: string;
  code: string;
  name: string;
  suit: string;
  rank: string;
  era: string;
  rarity: string | null;
  time_value: number;
  trader_value: string | null;
  image_url: string | null;
  description: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  current_target?: string | null;
  qr_dark?: string | null;
  qr_light?: string | null;
}

interface AdminTradingCardProps {
  card: CardData;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
  onEdit: (card: CardData) => void;
  onViewQR: (card: CardData) => void;
  onViewImage?: (imageUrl: string, cardName: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AdminTradingCard({
  card,
  isSelected,
  onSelect,
  onEdit,
  onViewQR,
  onViewImage,
  size = 'md',
  className
}: AdminTradingCardProps) {
  const sizeClasses = {
    sm: 'w-32 h-44',
    md: 'w-48 h-64',
    lg: 'w-56 h-72'
  };

  const getSuitColor = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
      case 'diamonds':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'clubs':
      case 'spades':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getEraColor = (era: string) => {
    switch (era.toLowerCase()) {
      case 'prehistoric':
        return 'bg-amber-800/20 text-amber-700 border-amber-800/30';
      case 'ancient':
        return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30';
      case 'medieval':
        return 'bg-red-800/20 text-red-600 border-red-800/30';
      case 'modern':
        return 'bg-slate-900/20 text-slate-300 border-slate-900/30';
      case 'future':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'degen':
        return 'bg-black/20 text-slate-100 border-black/30';
      case 'trader':
        return 'bg-slate-300/20 text-slate-400 border-slate-300/30';
      case 'investor':
        return 'bg-amber-600/20 text-amber-500 border-amber-600/30';
      case 'market maker':
        return 'bg-rose-400/20 text-rose-300 border-rose-400/30';
      case 'whale':
        return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    if (status === 'draft') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  };

  const hasCustomQR = card.qr_dark !== '#000000' || card.qr_light !== '#FFFFFF';

  return (
    <div className={cn(
      'card-premium rounded-xl p-3 relative overflow-hidden interactive group cursor-pointer',
      sizeClasses[size],
      isSelected && 'ring-2 ring-primary glow-primary',
      className
    )}>
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-20">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(card.id)}
          className="bg-background/80 backdrop-blur-sm border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      {/* Status and Active Indicators */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        {!card.is_active && (
          <Badge variant="outline" className="text-xs bg-destructive/20 text-destructive border-destructive/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        )}
        {card.is_active && card.status === 'active' && (
          <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            Active
          </Badge>
        )}
        {hasCustomQR && (
          <Badge variant="outline" className="text-xs bg-primary-glow/20 text-primary-glow border-primary-glow/30">
            Custom QR
          </Badge>
        )}
      </div>

      {/* Card ID Badge */}
      <div className="absolute bottom-2 left-2 z-20">
        <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm text-muted-foreground border-border">
          ID: {card.id.slice(-8)}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="h-full flex flex-col pt-6 pb-8" onClick={() => onEdit(card)}>
        {/* Image Area */}
        <div className="flex-1 bg-gradient-to-br from-muted/50 to-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {card.image_url ? (
            <img 
              src={card.image_url} 
              alt={card.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onViewImage?.(card.image_url!, card.name);
              }}
            />
          ) : (
            <div className="text-3xl font-bold text-muted-foreground/50">
              {card.rank}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
              {card.name}
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={cn("text-xs", getSuitColor(card.suit))}>
              {card.suit} {card.rank}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", getEraColor(card.era))}>
              {card.era}
            </Badge>
          </div>
          
          {card.rarity && (
            <Badge variant="outline" className={cn("text-xs", getRarityColor(card.rarity))}>
              {card.rarity}
            </Badge>
          )}

          {size === 'lg' && card.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {card.description}
            </p>
          )}

          {/* TIME Value */}
          <div className="text-xs text-muted-foreground">
            TIME: {card.time_value}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="absolute bottom-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewQR(card);
          }}
        >
          <QrCode className="h-3 w-3" />
        </Button>
        {card.image_url && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewImage?.(card.image_url!, card.name);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-primary-glow/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}