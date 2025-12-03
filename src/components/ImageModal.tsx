import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  };
}

export function ImageModal({ isOpen, onClose, card }: ImageModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold uppercase">{card.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="bg-gradient-to-br from-muted/50 to-muted rounded-lg overflow-hidden">
            {card.image_url ? (
              <img 
                src={card.image_url} 
                alt={card.name}
                className="w-full h-auto object-contain max-h-[60vh]"
              />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center">
                <div className="text-6xl font-bold text-muted-foreground/50">
                  {card.rank}
                </div>
              </div>
            )}
          </div>

          {/* Card Details */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-lg font-medium text-muted-foreground flex items-center gap-2 uppercase">
                {card.era}{card.rarity && (
                  <span className="text-muted-foreground">- {card.rarity}</span>
                )}
              </div>
              <div className="text-2xl font-bold flex items-center gap-3">
                <span className="text-foreground uppercase">{card.rank}</span>
                <span className={cn("text-3xl", getSuitColor(card.suit))}>{getSuitIcon(card.suit)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {card.trader_value && (
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">TLV</span>
                  <span className="text-lg font-bold text-muted-foreground">{card.trader_value}</span>
                </div>
              )}
              
              {card.time_value && (
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">TIME</span>
                  <span className="text-lg font-bold text-muted-foreground">{card.time_value}</span>
                </div>
              )}
            </div>

            {card.description && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}