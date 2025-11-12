import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Edit, QrCode, Eye, Download, AlertTriangle, Trash2, Copy, UserPlus, Globe } from 'lucide-react';
import { useImageDimensions, calculateCardDimensions } from '@/hooks/useImageDimensions';

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
  image_code?: string | null;
  description: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  current_target?: string | null;
  qr_dark?: string | null;
  qr_light?: string | null;
  claim_token?: string | null; // Added for secure token-based claiming
  owner_user_id?: string | null;
  owner_email?: string | null;
  is_in_pending_redemption?: boolean;
  is_credited?: boolean;
}

interface AdminTradingCardProps {
  card: CardData;
  isSelected: boolean;
  onSelect: (cardId: string) => void;
  onEdit: (card: CardData) => void;
  onViewQR: (card: CardData) => void;
  onViewImage?: (imageUrl: string, cardName: string) => void;
  onDelete?: (cardId: string) => void;
  onCopyToken?: (token: string) => void; // For copying claim tokens
  onViewHistory?: (cardId: string) => void; // For viewing ownership history
  onAssignCard?: (cardId: string) => void; // For assigning cards to users
  onReleaseCard?: (cardId: string) => void; // For releasing cards to wild
  baseWidth?: number;
  className?: string;
}

export function AdminTradingCard({
  card,
  isSelected,
  onSelect,
  onEdit,
  onViewQR,
  onViewImage,
  onDelete,
  onCopyToken,
  onViewHistory,
  onAssignCard,
  onReleaseCard,
  baseWidth = 200,
  className
}: AdminTradingCardProps) {
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

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    if (status === 'draft') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  };

  const hasCustomQR = card.qr_dark !== '#000000' || card.qr_light !== '#FFFFFF';

  return (
    <div 
      className={cn(
        'card-premium rounded-xl p-3 relative overflow-visible interactive group cursor-pointer',
        isSelected && 'ring-2 ring-primary glow-primary',
        className
      )}
      style={{ width: `${width}px`, minHeight: `${height}px` }}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-20">
        <div className="relative">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(card.id)}
            className="h-5 w-5 bg-background/80 backdrop-blur-sm border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          {/* Larger clickable area */}
          <div 
            className="absolute -inset-2 cursor-pointer" 
            onClick={() => onSelect(card.id)}
          />
        </div>
      </div>

      {/* Status and Active Indicators */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 items-end">
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
      <div className="flex flex-col pt-6" onClick={() => onEdit(card)}>
        {/* Image Area */}
        <div className="flex-1 bg-gradient-to-br from-muted/50 to-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {card.image_url ? (
            <img 
              src={card.image_url} 
              alt={card.name}
              className="w-full h-full object-contain cursor-pointer"
              style={{ opacity: loading ? 0.5 : 1 }}
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
        <div className="space-y-1.5">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
            {card.name}
          </h3>
          
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              {card.era}{card.rarity && (
                <span className="text-muted-foreground">- {card.rarity}</span>
              )}
            </div>
            
            {/* Image Code Display */}
            {card.image_code && (
              <div className="text-xs font-mono bg-muted/50 px-1 py-0.5 rounded text-muted-foreground">
                IMG: {card.image_code}
              </div>
            )}
            
            {/* Claim Token Display */}
            {card.claim_token && (
              <div className="flex items-center justify-between text-xs font-mono bg-green-500/10 px-1 py-0.5 rounded text-green-600">
                <span className="truncate">TOKEN: {card.claim_token.substring(0, 8)}...</span>
                {onCopyToken && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyToken(card.claim_token!);
                    }}
                    className="ml-1 p-0.5 hover:bg-green-500/20 rounded transition-colors"
                    title="Copy claim token"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}
            <div className="text-xl font-bold flex items-center gap-2">
              <span className="text-foreground">{card.rank}</span>
              <span className={cn("text-2xl", getSuitColor(card.suit))}>{getSuitIcon(card.suit)}</span>
            </div>
            <div className="space-y-0.5 text-xs">
              {card.trader_value && (
                <div className="text-muted-foreground font-medium">
                  TLV: {card.trader_value}
                </div>
              )}
              <div className="text-muted-foreground font-medium">
                TIME: {card.time_value}
              </div>
            </div>
          </div>

          {baseWidth >= 250 && card.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {card.description}
            </p>
          )}
        </div>

        {/* Owner Info Section */}
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          {/* Owner Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Status:</span>
            {!card.owner_email ? (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                🌍 In the Wild
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                👤 Owned
              </Badge>
            )}
          </div>

          {/* Owner Email (if claimed) */}
          {card.owner_email && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Owner:</span>
              <span className="text-foreground font-mono text-[10px] truncate max-w-[140px]" title={card.owner_email}>
                {card.owner_email}
              </span>
            </div>
          )}

          {/* Redemption Status */}
          {card.is_in_pending_redemption && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Redemption:</span>
              <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                ⏳ Pending
              </Badge>
            </div>
          )}
          {card.is_credited && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">TIME:</span>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                ✓ Credited
              </Badge>
            </div>
          )}

          {/* View History Button - Prominent */}
          {onViewHistory && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(card.id);
              }}
            >
              View History
            </Button>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="absolute top-14 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Admin Transfer Actions */}
        {onAssignCard && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm text-blue-500 border-blue-500/30 hover:bg-blue-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onAssignCard(card.id);
            }}
            title="Assign to user"
          >
            <UserPlus className="h-3 w-3" />
          </Button>
        )}
        
        {onReleaseCard && card.owner_email && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm text-amber-500 border-amber-500/30 hover:bg-amber-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onReleaseCard(card.id);
            }}
            title="Release to wild"
          >
            <Globe className="h-3 w-3" />
          </Button>
        )}

        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0 bg-background/80 backdrop-blur-sm text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                onClick={(e) => e.stopPropagation()}
                title="Delete card"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Card</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{card.name}"? This action will soft-delete the card (it can be restored later).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(card.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Card
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
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