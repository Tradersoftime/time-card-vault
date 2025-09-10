// src/pages/MyCards.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Clock, TrendingUp, Target, Trophy, Search, SortAsc, SortDesc, AlertCircle, CheckCircle, RotateCcw, Star, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EnhancedTradingCard } from "@/components/EnhancedTradingCard";
import { ImageModal } from "@/components/ImageModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { useIsMobile } from "@/hooks/use-mobile";

const DECK_SUITS = ["Clubs", "Diamonds", "Hearts", "Spades"];
const DECK_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

type Row = {
  card_id?: string | null;
  name?: string | null;
  suit?: string | null;
  rank?: string | null;
  era?: string | null;
  rarity?: string | null;
  trader_value?: string | null;
  time_value?: number | null;
  image_url?: string | null;
  claimed_at?: string | null;
  redemption_status?: string | null;
  redemption_id?: string | null;
  admin_notes?: string | null;
  decided_at?: string | null;
  credited_amount?: number | null;
};

// Helper functions
function prettyRarity(r?: string | null): string {
  if (!r) return "—";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function rarityRank(r?: string | null): number {
  const rarities = ["degen", "trader", "investor", "market maker", "whale"];
  const index = rarities.indexOf(r?.toLowerCase() || "");
  return index === -1 ? 0 : index;
}

function toNum(s?: string | null): number {
  if (!s) return 0;
  const n = Number(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatNum(n: number): string {
  return Number(n).toLocaleString();
}

function canonicalSuit(s?: string | null): typeof DECK_SUITS[number] | "—" {
  if (!s) return "—";
  const v = s.trim().toLowerCase();
  if (v.startsWith("spa")) return "Spades";
  if (v.startsWith("hea")) return "Hearts";
  if (v.startsWith("clu")) return "Clubs";
  if (v.startsWith("dia")) return "Diamonds";
  return "—";
}

function canonRank(r?: string | null): typeof DECK_RANKS[number] | null {
  if (!r) return null;
  const v = r.trim().toLowerCase();
  if (v === "a" || v === "ace") return "A";
  if (v === "k" || v === "king") return "K";
  if (v === "q" || v === "queen") return "Q";
  if (v === "j" || v === "jack") return "J";
  if (v === "10" || v === "t" || v === "ten") return "10";
  if (/^[2-9]$/.test(v)) return v.toUpperCase() as any;
  return null;
}

function humanRank(r?: string | null): string {
  if (!r) return "—";
  const v = r.trim().toUpperCase();
  if (v === "A") return "Ace";
  if (v === "K") return "King";
  if (v === "Q") return "Queen";
  if (v === "J") return "Jack";
  return r;
}

function SuitGlyph({ suit }: { suit?: string | null }) {
  const s = canonicalSuit(suit);
  const glyph = s === "Spades" ? "♠" : s === "Hearts" ? "♥" : s === "Clubs" ? "♣" : s === "Diamonds" ? "♦" : "";
  const cls = s === "Hearts" || s === "Diamonds" ? "text-red-500" : 
             s === "Spades" || s === "Clubs" ? "text-green-500" : "text-foreground";
  return glyph ? <span className={cls} aria-label={s} title={s}>{glyph}</span> : <span>—</span>;
}

function RankSuit({ rank, suit }: { rank?: string | null; suit?: string | null }) {
  const r = humanRank(rank);
  const s = canonicalSuit(suit);
  if (r === "—" && s === "—") return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-sm text-muted-foreground">
      {r}{" "}
      <SuitGlyph suit={s} />
    </span>
  );
}

function buildBestDeck52(all: Row[]) {
  const bestByBucket = new Map<string, Row>();
  for (const row of all) {
    const s = canonicalSuit(row.suit);
    const r = canonRank(row.rank);
    if (s === "—" || !r) continue;
    const key = `${s}|${r}`;
    const curr = bestByBucket.get(key);
    if (!curr || toNum(row.trader_value) > toNum(curr.trader_value)) {
      bestByBucket.set(key, row);
    }
  }
  const chosen: Row[] = [];
  for (const s of DECK_SUITS) {
    for (const r of DECK_RANKS) {
      const hit = bestByBucket.get(`${s}|${r}`);
      if (hit) chosen.push(hit);
    }
  }
  const totalTLV = chosen.reduce((sum, c) => sum + toNum(c.trader_value), 0);
  return { chosen, totalTLV };
}

export default function MyCards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<Row | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogData, setDeleteDialogData] = useState<{
    type: 'single' | 'bulk';
    cardId?: string;
    cardName?: string;
    status?: string;
    imageUrl?: string;
    cardCount?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search and sort
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("claimed_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const isMobile = useIsMobile();

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('user_card_collection');
        if (error) throw error;
        setRows(data || []);
      } catch (err: any) {
        console.error('Error loading cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Filter and sort logic
  const filteredAndSortedRows = useMemo(() => {
    console.log('Sorting triggered:', { sortBy, sortDirection, searchTerm, rowsCount: rows.length });
    
    let filtered = [...rows]; // Create a copy to avoid mutations

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        (card.name?.toLowerCase().includes(term)) ||
        (card.era?.toLowerCase().includes(term)) ||
        (card.suit?.toLowerCase().includes(term)) ||
        (card.rank?.toLowerCase().includes(term)) ||
        (card.rarity?.toLowerCase().includes(term)) ||
        (card.trader_value?.toLowerCase().includes(term))
      );
    }

    // Sort with improved error handling
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      try {
        switch (sortBy) {
          case "name":
            aValue = (a.name ?? "").toLowerCase().trim();
            bValue = (b.name ?? "").toLowerCase().trim();
            break;
          case "era":
            aValue = (a.era ?? "").toLowerCase().trim();
            bValue = (b.era ?? "").toLowerCase().trim();
            break;
          case "suit":
            aValue = canonicalSuit(a.suit);
            bValue = canonicalSuit(b.suit);
            break;
          case "rank":
            aValue = (a.rank ?? "").toString().toLowerCase().trim();
            bValue = (b.rank ?? "").toString().toLowerCase().trim();
            break;
          case "rarity":
            aValue = rarityRank(a.rarity);
            bValue = rarityRank(b.rarity);
            break;
          case "time_value":
            aValue = Number(a.time_value) || 0;
            bValue = Number(b.time_value) || 0;
            break;
          case "trader_value":
            aValue = toNum(a.trader_value);
            bValue = toNum(b.trader_value);
            break;
          case "claimed_at":
          default:
            // Better date parsing with fallback
            aValue = a.claimed_at ? new Date(a.claimed_at).getTime() : 0;
            bValue = b.claimed_at ? new Date(b.claimed_at).getTime() : 0;
            // If dates are invalid, fall back to 0
            if (isNaN(aValue)) aValue = 0;
            if (isNaN(bValue)) bValue = 0;
            break;
        }

        // Ensure values are not null/undefined for comparison
        if (aValue == null) aValue = "";
        if (bValue == null) bValue = "";

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      } catch (err) {
        console.error('Sorting error:', err, { a, b, sortBy });
        return 0;
      }
    });

    console.log('Sorted result:', { filteredCount: filtered.length, firstCard: filtered[0]?.name });
    return filtered;
  }, [rows, searchTerm, sortBy, sortDirection]);

  // Categorize cards by redemption status
  const readyCards = useMemo(() => 
    filteredAndSortedRows.filter(r => 
      (!r.redemption_status || r.redemption_status === 'available') && r.time_value && r.time_value > 0
    ), [filteredAndSortedRows]
  );
  
  const pendingCards = useMemo(() => 
    filteredAndSortedRows.filter(r => r.redemption_status === 'pending'), 
    [filteredAndSortedRows]
  );
  
  const rejectedCards = useMemo(() => 
    filteredAndSortedRows.filter(r => r.redemption_status === 'rejected'), 
    [filteredAndSortedRows]
  );
  
  const creditedCards = useMemo(() => 
    filteredAndSortedRows.filter(r => r.redemption_status === 'credited'), 
    [filteredAndSortedRows]
  );

  const handleSubmitCard = async (cardId: string) => {
    try {
      const { data, error } = await supabase.rpc('submit_card_for_redemption', {
        p_card_id: cardId
      });
      
      if (error) throw error;
      
      if (data.ok) {
        toast.success("Card submitted for TIME rewards!");
        // Reload data to update UI
        const { data: refreshData, error: refreshError } = await supabase.rpc('user_card_collection');
        if (refreshError) throw refreshError;
        setRows(refreshData || []);
      } else {
        toast.error(`Failed to submit card: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Error submitting card:', err);
      toast.error(`Failed to submit card: ${err.message}`);
    }
  };

  const handleSubmitSelected = async () => {
    if (selectedCards.length === 0) {
      toast.error("Please select at least one card");
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const cardId of selectedCards) {
        try {
          const { data, error } = await supabase.rpc('submit_card_for_redemption', {
            p_card_id: cardId
          });
          
          if (error) throw error;
          
          if (data.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} card${successCount === 1 ? '' : 's'} submitted for TIME rewards!`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} card${failCount === 1 ? '' : 's'} failed to submit`);
      }

      // Reload data and clear selection
      const { data: refreshData, error: refreshError } = await supabase.rpc('user_card_collection');
      if (refreshError) throw refreshError;
      setRows(refreshData || []);
      setSelectedCards([]);
    } catch (err: any) {
      console.error('Error submitting cards:', err);
      toast.error(`Failed to submit cards: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAllReady = () => {
    if (selectedCards.length === readyCards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(readyCards.map(card => card.card_id || '').filter(Boolean));
    }
  };

  const handleResubmitCard = async (redemptionId: string) => {
    try {
      const { data, error } = await supabase.rpc('resubmit_rejected_card', {
        p_redemption_id: redemptionId
      });
      
      if (error) throw error;
      
      if (data.ok) {
        toast.success("Card resubmitted for review!");
        // Reload data to update UI
        const { data: refreshData, error: refreshError } = await supabase.rpc('user_card_collection');
        if (refreshError) throw refreshError;
        setRows(refreshData || []);
      } else {
        toast.error(`Failed to resubmit card: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Error resubmitting card:', err);
      toast.error(`Failed to resubmit card: ${err.message}`);
    }
  };

  const handleAcceptRejection = async (redemptionId: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_card_rejection', {
        p_redemption_id: redemptionId
      });
      
      if (error) throw error;
      
      if (data.ok) {
        toast.success("Rejection acknowledged");
        // Reload data to update UI
        const { data: refreshData, error: refreshError } = await supabase.rpc('user_card_collection');
        if (refreshError) throw refreshError;
        setRows(refreshData || []);
      } else {
        toast.error(`Failed to acknowledge rejection: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Error acknowledging rejection:', err);
      toast.error(`Failed to acknowledge rejection: ${err.message}`);
    }
  };

  const handleDeleteCard = async (cardId: string, cardName: string, status: string, imageUrl?: string) => {
    const statusMessages = {
      ready: "This will remove the card from your collection.",
      pending: "This will cancel the submission and remove the card from your collection.",
      rejected: "This will permanently remove the rejected card from your collection.",
      credited: "This will remove the credited card from your collection."
    };

    setDeleteDialogData({
      type: 'single',
      cardId,
      cardName,
      status,
      imageUrl
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedCards.length === 0) {
      toast.error("Please select at least one card to delete");
      return;
    }

    setDeleteDialogData({
      type: 'bulk',
      cardCount: selectedCards.length
    });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteDialogData) return;
    
    setIsDeleting(true);

    try {
      if (deleteDialogData.type === 'single' && deleteDialogData.cardId) {
        // Single card deletion
        const { data, error } = await supabase.rpc('delete_user_card', {
          p_card_id: deleteDialogData.cardId
        });
        
        if (error) throw error;
        
        if (data.ok) {
          toast.success("Card deleted successfully");
        } else {
          toast.error(`Failed to delete card: ${data.error}`);
        }
      } else if (deleteDialogData.type === 'bulk') {
        // Bulk deletion
        let successCount = 0;
        let failCount = 0;

        for (const cardId of selectedCards) {
          try {
            const { data, error } = await supabase.rpc('delete_user_card', {
              p_card_id: cardId
            });
            
            if (error) throw error;
            
            if (data.ok) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} card${successCount === 1 ? '' : 's'} deleted successfully`);
        }
        if (failCount > 0) {
          toast.error(`${failCount} card${failCount === 1 ? '' : 's'} failed to delete`);
        }

        setSelectedCards([]);
      }

      // Reload data to update UI
      const { data: refreshData, error: refreshError } = await supabase.rpc('user_card_collection');
      if (refreshError) throw refreshError;
      setRows(refreshData || []);
      
    } catch (err: any) {
      console.error('Error deleting:', err);
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleCardClick = (card: Row) => {
    if (selectionMode) {
      // In selection mode, toggle card selection
      const cardId = card.card_id || '';
      if (selectedCards.includes(cardId)) {
        setSelectedCards(selectedCards.filter(id => id !== cardId));
      } else {
        setSelectedCards([...selectedCards, cardId]);
      }
    } else {
      // In view mode, open image modal
      setSelectedCard(card);
      setImageModalOpen(true);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  // Summary stats
  const totalCards = rows.length;
  const totalTimeAll = rows.reduce((sum, r) => sum + (r.time_value || 0), 0);
  const totalTimeCredited = creditedCards.reduce((sum, r) => sum + (r.credited_amount || r.time_value || 0), 0);
  const totalTimeReady = readyCards.reduce((sum, r) => sum + (r.time_value || 0), 0);
  const totalTimePending = pendingCards.reduce((sum, r) => sum + (r.time_value || 0), 0);

  // Best 52-card deck
  const { chosen: deck52, totalTLV: deck52TLV } = useMemo(() => buildBestDeck52(rows), [rows]);

  if (loading) return <div className="p-6">Loading your collection...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-3">
            My Collection
          </h1>
          <p className="text-muted-foreground mb-4">Manage your trading cards and submit them for TIME rewards</p>
        </div>

        {/* Submission Process Information */}
        <div className="glass-panel p-6 rounded-2xl border border-primary/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">How Card Submission Works</h3>
              <p className="text-sm text-muted-foreground">Understanding the TIME rewards process</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Submit Cards</span>
              </div>
              <p className="text-muted-foreground">
                Select cards with TIME value and submit them for review. Higher rarity cards typically have greater TIME value.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Review Process</span>
              </div>
              <p className="text-muted-foreground">
                Reviews typically take 24-48 hours. Cards are verified for authenticity, condition, and market value.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Earn TIME</span>
              </div>
              <p className="text-muted-foreground">
                Approved cards are credited with TIME tokens. Rejected cards can be resubmitted after addressing feedback.
              </p>
            </div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-2xl glow-primary">
            <div className="text-3xl font-bold text-primary">{formatNum(totalTimeAll)}</div>
            <div className="text-sm text-muted-foreground">Collection TIME</div>
            <div className="text-xs text-muted-foreground">{totalCards} card{totalCards === 1 ? "" : "s"}</div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl font-bold text-foreground">{formatNum(totalTimeCredited)}</div>
            <div className="text-sm text-muted-foreground">Credited TIME</div>
            <div className="text-xs text-muted-foreground">{creditedCards.length} card{creditedCards.length === 1 ? "" : "s"}</div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl glow-primary">
            <div className="text-3xl font-bold text-primary">{formatNum(totalTimeReady)}</div>
            <div className="text-sm text-muted-foreground">Ready to Claim</div>
            <div className="text-xs text-muted-foreground">{readyCards.length} card{readyCards.length === 1 ? "" : "s"}</div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl">
            <div className="text-3xl font-bold text-foreground">{formatNum(totalTimePending)}</div>
            <div className="text-sm text-muted-foreground">Pending TIME</div>
            <div className="text-xs text-muted-foreground">{pendingCards.length} card{pendingCards.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        {/* Peak Collection Value - Enhanced TLV Display */}
        <div className="relative overflow-hidden">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary-glow/30 to-primary/20 blur-xl opacity-50 animate-pulse"></div>
          
          <div className="relative glass-panel p-8 rounded-3xl border-2 border-primary/30 glow-effect hover-scale transition-all duration-500">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Achievement Icon */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg">
                    <Trophy className="h-8 w-8 text-white drop-shadow-sm" />
                  </div>
                  {deck52TLV > 100000 && (
                    <div className="absolute -top-1 -right-1 p-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                      {formatNum(deck52TLV)}
                    </span>
                    <span className="text-2xl font-semibold text-primary">TLV</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    Your Peak Collection Value
                  </h3>
                  <p className="text-muted-foreground">
                    The combined value of your strongest cards across all 52 unique rank×suit combinations
                  </p>
                </div>
                
                {/* Progress Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deck Completion</span>
                    <span className="font-medium text-foreground">
                      {deck52.length}/52 slots filled ({Math.round((deck52.length / 52) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-background/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${(deck52.length / 52) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Achievement Badges */}
              <div className="flex-shrink-0 text-right space-y-2">
                {deck52TLV >= 1000000 && (
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl">
                    <div className="text-sm font-semibold text-purple-300">Million Club</div>
                    <div className="text-xs text-purple-200">Elite Collection</div>
                  </div>
                )}
                {deck52TLV >= 100000 && deck52TLV < 1000000 && (
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl">
                    <div className="text-sm font-semibold text-blue-300">High Roller</div>
                    <div className="text-xs text-blue-200">Impressive Value</div>
                  </div>
                )}
                {deck52.length === 52 && (
                  <div className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl">
                    <div className="text-sm font-semibold text-green-300">Complete Deck</div>
                    <div className="text-xs text-green-200">All 52 Slots</div>
                  </div>
                )}
                {deck52.length < 52 && (
                  <div className="px-3 py-1 bg-background/30 border border-border/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">
                      +{52 - deck52.length} slots to fill
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tooltip/Info Expandable */}
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>
                  Your peak TLV is calculated using the highest-value card for each unique rank×suit combination. 
                  {deck52.length < 52 && ` Complete your deck to maximize potential value.`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Filter & Sort Collection</h3>
              <p className="text-sm text-muted-foreground">Search and organize your cards</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, era, suit, rank, rarity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-primary/20 focus:border-primary"
                />
              </div>
              
              {/* Sort */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value) => {
                  console.log('Sort by changed:', value);
                  setSortBy(value);
                }}>
                  <SelectTrigger className="w-[200px] bg-background/50 border-primary/20">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    <SelectItem value="claimed_at">Date Claimed</SelectItem>
                    <SelectItem value="name">Card Name</SelectItem>
                    <SelectItem value="era">Era</SelectItem>
                    <SelectItem value="suit">Suit</SelectItem>
                    <SelectItem value="rank">Rank</SelectItem>
                    <SelectItem value="rarity">Rarity</SelectItem>
                    <SelectItem value="time_value">TIME Value</SelectItem>
                    <SelectItem value="trader_value">Trader Leverage (TLV)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                    console.log('Sort direction changed:', newDirection);
                    setSortDirection(newDirection);
                  }}
                  className="px-3 bg-background/50 border-primary/20 hover:bg-primary/10"
                  title={`Sort ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Results Summary */}
          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <div className="text-sm text-muted-foreground">
                Search results: <span className="text-primary font-medium">{filteredAndSortedRows.length}</span> cards found
                {searchTerm && (
                  <span className="ml-2">
                    for "<span className="text-foreground font-medium">{searchTerm}</span>"
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="ml-2 text-primary hover:text-primary/80 text-xs underline"
                    >
                      clear
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Ready for TIME Submission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Ready for TIME Submission ({readyCards.length})
                </span>
                {readyCards.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Selection Mode Toggle */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={selectionMode ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setSelectionMode(!selectionMode)}
                        className="whitespace-nowrap"
                      >
                        {selectionMode ? 'Exit Selection' : 'Select Mode'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllReady}
                        className="whitespace-nowrap"
                      >
                        {selectedCards.length === readyCards.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    
                    {/* Bulk Action Buttons */}
                    {selectedCards.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleSubmitSelected}
                          disabled={submitting}
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Submit Selected ({selectedCards.length})
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteSelected}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete Selected
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {selectionMode ? (
                  <span className="text-primary font-medium">
                    Selection Mode Active: Tap cards to select them, or tap "Exit Selection" to view card details.
                  </span>
                ) : (
                  "These cards have TIME value and are ready to submit for rewards. Use 'Select Mode' to choose multiple cards for bulk actions."
                )}
              </p>
            </CardHeader>
            <CardContent>
              {readyCards.length > 0 ? (
                <div className={`grid gap-4 ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {readyCards.map((row) => (
                    <div key={row.card_id} className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedCards.includes(row.card_id || '')}
                          onCheckedChange={(checked) => {
                            toggleCardSelection(row.card_id || '');
                          }}
                          className={`bg-background/80 border-2 ${
                            isMobile ? 'h-5 w-5' : 'h-4 w-4'
                          } ${selectionMode ? 'ring-2 ring-primary/50' : ''}`}
                        />
                      </div>
                      
                      {/* Selection Mode Indicator */}
                      {selectionMode && (
                        <div className="absolute inset-0 bg-primary/10 rounded-lg border-2 border-primary/30 z-0" />
                      )}
                      
                      <div 
                        className={`${selectionMode ? 'cursor-pointer' : ''} ${
                          selectedCards.includes(row.card_id || '') ? 'ring-2 ring-primary' : ''
                        } rounded-lg transition-all duration-200`}
                        onClick={() => selectionMode ? toggleCardSelection(row.card_id || '') : undefined}
                      >
                        <EnhancedTradingCard
                          card={{
                            id: row.card_id || '',
                            name: row.name || 'Unknown Card',
                            suit: row.suit || '',
                            rank: row.rank || '',
                            era: row.era || '',
                            rarity: row.rarity || '',
                            trader_value: row.trader_value || '',
                            time_value: row.time_value || 0,
                            image_url: row.image_url || '',
                            is_claimed: false,
                            redemption_status: row.redemption_status || ''
                          }}
                          baseWidth={isMobile ? 150 : 180}
                          showFullDetails={true}
                          onClick={() => !selectionMode ? handleCardClick(row) : undefined}
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 z-10 flex gap-1">
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(row.card_id || '', row.name || 'Unknown Card', 'ready', row.image_url || '');
                          }}
                          className="text-xs px-2 py-1 h-auto"
                          title="Delete card"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitCard(row.card_id || '');
                          }}
                          disabled={submitting}
                          className="text-xs px-2 py-1 h-auto"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No cards available for TIME submission
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submitted (Pending TIME) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Submitted (Pending TIME) ({pendingCards.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Cards under review for TIME rewards. Reviews typically take 24-48 hours. You'll be notified when the review is complete.
              </p>
            </CardHeader>
            <CardContent>
              {pendingCards.length > 0 ? (
                <div className={`grid gap-4 ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                   {pendingCards.map((row) => (
                    <div key={row.card_id} className="relative">
                      <EnhancedTradingCard
                        card={{
                          id: row.card_id || '',
                          name: row.name || 'Unknown Card',
                          suit: row.suit || '',
                          rank: row.rank || '',
                          era: row.era || '',
                          rarity: row.rarity || '',
                          trader_value: row.trader_value || '',
                          time_value: row.time_value || 0,
                          image_url: row.image_url || '',
                          is_claimed: false,
                          redemption_status: 'pending'
                        }}
                        baseWidth={isMobile ? 150 : 180}
                        showFullDetails={true}
                        onClick={() => handleCardClick(row)}
                      />
                      <div className="absolute bottom-2 right-2 z-10">
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(row.card_id || '', row.name || 'Unknown Card', 'pending', row.image_url || '');
                          }}
                          className="text-xs px-2 py-1 h-auto"
                          title="Cancel and delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No cards pending review
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejected Cards */}
          {rejectedCards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Rejected Cards ({rejectedCards.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Cards that didn't meet submission criteria. Review the admin notes below each card and use "Resubmit" to try again, or "Accept" to acknowledge the rejection.
                </p>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {rejectedCards.map((row) => (
                    <div key={row.card_id} className="relative">
                      <EnhancedTradingCard
                        card={{
                          id: row.card_id || '',
                          name: row.name || 'Unknown Card',
                          suit: row.suit || '',
                          rank: row.rank || '',
                          era: row.era || '',
                          rarity: row.rarity || '',
                          trader_value: row.trader_value || '',
                          time_value: row.time_value || 0,
                          image_url: row.image_url || '',
                          is_claimed: false,
                          redemption_status: 'rejected'
                        }}
                        baseWidth={isMobile ? 150 : 180}
                        showFullDetails={true}
                        onClick={() => handleCardClick(row)}
                      />
                      
                      {/* Admin Notes Overlay */}
                      {row.admin_notes && (
                        <div className="absolute inset-x-2 bottom-14 bg-red-500/90 text-white text-xs p-2 rounded">
                          <div className="font-semibold">Rejected:</div>
                          <div className="line-clamp-2">{row.admin_notes}</div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="absolute bottom-2 inset-x-2 flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResubmitCard(row.redemption_id || '');
                          }}
                          className="flex-1 text-xs px-1 py-1 h-auto"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Resubmit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptRejection(row.redemption_id || '');
                          }}
                          className="flex-1 text-xs px-1 py-1 h-auto"
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(row.card_id || '', row.name || 'Unknown Card', 'rejected', row.image_url || '');
                          }}
                          className="text-xs px-1 py-1 h-auto"
                          title="Delete card"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Claimed Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Claimed Cards ({creditedCards.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Cards that have been successfully processed and credited with TIME rewards. The credited amount is displayed on each card.
              </p>
            </CardHeader>
            <CardContent>
              {creditedCards.length > 0 ? (
                <div className={`grid gap-4 ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                }`}>
                  {creditedCards.map((row) => (
                    <div key={row.card_id} className="relative">
                      <EnhancedTradingCard
                        card={{
                          id: row.card_id || '',
                          name: row.name || 'Unknown Card',
                          suit: row.suit || '',
                          rank: row.rank || '',
                          era: row.era || '',
                          rarity: row.rarity || '',
                          trader_value: row.trader_value || '',
                          time_value: row.time_value || 0,
                          image_url: row.image_url || '',
                          is_claimed: true,
                          claimed_at: row.claimed_at || '',
                          redemption_status: 'credited'
                        }}
                        baseWidth={isMobile ? 150 : 180}
                        showFullDetails={true}
                        onClick={() => handleCardClick(row)}
                      />
                      
                      {/* Claimed Receipt Overlay */}
                      <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs px-2 py-1 rounded">
                        ✓ {formatNum(row.credited_amount || row.time_value || 0)} TIME
                      </div>
                      
                      {/* Delete Button */}
                      <div className="absolute bottom-2 right-2 z-10">
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(row.card_id || '', row.name || 'Unknown Card', 'credited', row.image_url || '');
                          }}
                          className="text-xs px-2 py-1 h-auto"
                          title="Delete card"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No credited cards yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Image Modal */}
        {selectedCard && (
          <ImageModal
            isOpen={imageModalOpen}
            onClose={() => setImageModalOpen(false)}
            card={{
              id: selectedCard.card_id || '',
              name: selectedCard.name || 'Unknown Card',
              suit: selectedCard.suit || '',
              rank: selectedCard.rank || '',
              era: selectedCard.era || '',
              rarity: selectedCard.rarity || '',
              trader_value: selectedCard.trader_value || '',
              time_value: selectedCard.time_value || 0,
              image_url: selectedCard.image_url || ''
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title={
            deleteDialogData?.type === 'single'
              ? `Delete "${deleteDialogData.cardName}"`
              : `Delete ${deleteDialogData?.cardCount} Selected Cards`
          }
          description={
            deleteDialogData?.type === 'single'
              ? (() => {
                  const statusMessages = {
                    ready: "This will remove the card from your collection.",
                    pending: "This will cancel the submission and remove the card from your collection.",
                    rejected: "This will permanently remove the rejected card from your collection.",
                    credited: "This will remove the credited card from your collection."
                  };
                  return statusMessages[deleteDialogData.status as keyof typeof statusMessages] || statusMessages.ready;
                })()
              : "This will remove the selected cards from your collection and cannot be undone."
          }
          confirmText={
            deleteDialogData?.type === 'single'
              ? deleteDialogData.cardName || 'DELETE'
              : 'DELETE ALL'
          }
          isLoading={isDeleting}
          imageUrl={deleteDialogData?.imageUrl}
          cardCount={deleteDialogData?.cardCount}
        />
      </div>
    </div>
  );
}