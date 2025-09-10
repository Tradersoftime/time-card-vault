import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, DollarSign, Clock, User, Calendar, Filter, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EnhancedTradingCard } from "@/components/EnhancedTradingCard";

interface PendingRedemption {
  redemption_id: string;
  user_id: string;
  user_email: string;
  card_id: string;
  card_name: string;
  card_suit: string;
  card_rank: string;
  card_era: string;
  card_rarity: string;
  card_image_url: string;
  time_value: number;
  trader_value: string;
  submitted_at: string;
}

export default function AdminRedemptions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>([]);
  const [selectedRedemptions, setSelectedRedemptions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("submitted_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterBy, setFilterBy] = useState<string>("all");

  useEffect(() => {
    loadPendingRedemptions();
  }, []);

  const loadPendingRedemptions = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_pending_card_redemptions');
      if (error) throw error;
      setPendingRedemptions(data || []);
    } catch (err: any) {
      console.error('Error loading pending redemptions:', err);
      toast.error(`Failed to load redemptions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedRedemptions = useMemo(() => {
    let filtered = pendingRedemptions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.card_rarity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.card_era?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Additional filters
    if (filterBy === "high_value") {
      filtered = filtered.filter(r => r.time_value >= 100);
    } else if (filterBy === "rare") {
      filtered = filtered.filter(r => 
        r.card_rarity?.toLowerCase().includes("rare") || 
        r.card_rarity?.toLowerCase().includes("epic") ||
        r.card_rarity?.toLowerCase().includes("legendary")
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case "time_value":
          aVal = a.time_value || 0;
          bVal = b.time_value || 0;
          break;
        case "user_email":
          aVal = a.user_email || "";
          bVal = b.user_email || "";
          break;
        case "card_name":
          aVal = a.card_name || "";
          bVal = b.card_name || "";
          break;
        default:
          aVal = a.submitted_at;
          bVal = b.submitted_at;
      }

      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }, [pendingRedemptions, searchTerm, sortBy, sortOrder, filterBy]);

  const handleSelectAll = () => {
    if (selectedRedemptions.length === filteredAndSortedRedemptions.length) {
      setSelectedRedemptions([]);
    } else {
      setSelectedRedemptions(filteredAndSortedRedemptions.map(r => r.redemption_id));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedRedemptions.length === 0) {
      toast.error("Please select at least one redemption");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_bulk_decision_cards', {
        p_redemption_ids: selectedRedemptions,
        p_action: action,
        p_admin_notes: adminNotes || null,
        p_external_ref: externalRef || null
      });

      if (error) throw error;

      if (data.ok) {
        const actionText = action === 'approve' ? 'approved and credited' : 'rejected';
        toast.success(`${data.updated} cards ${actionText}${action === 'approve' ? ` for ${data.total_credited} TIME` : ''}`);
        
        setSelectedRedemptions([]);
        setAdminNotes("");
        setExternalRef("");
        await loadPendingRedemptions();
      } else {
        toast.error(`Failed to ${action} cards: ${data.error}`);
      }
    } catch (err: any) {
      console.error(`Error ${action}ing cards:`, err);
      toast.error(`Failed to ${action} cards: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRedemptions.length === 0) {
      toast.error("Please select at least one redemption");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_pending_redemptions', {
        p_redemption_ids: selectedRedemptions
      });

      if (error) throw error;

      if (data.ok) {
        toast.success(`${data.deleted_count} redemption${data.deleted_count !== 1 ? 's' : ''} permanently deleted`);
        setSelectedRedemptions([]);
        setAdminNotes("");
        setExternalRef("");
        await loadPendingRedemptions();
      } else {
        toast.error(`Failed to delete redemptions: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Error deleting redemptions:', err);
      toast.error(`Failed to delete redemptions: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const totalTimeValue = selectedRedemptions.reduce((sum, id) => {
    const redemption = pendingRedemptions.find(r => r.redemption_id === id);
    return sum + (redemption?.time_value || 0);
  }, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Card Redemptions</h1>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {pendingRedemptions.length} Pending
        </Badge>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards</SelectItem>
                <SelectItem value="high_value">High Value (100+ TIME)</SelectItem>
                <SelectItem value="rare">Rare Cards</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Submission Date</SelectItem>
                <SelectItem value="time_value">TIME Value</SelectItem>
                <SelectItem value="user_email">User Email</SelectItem>
                <SelectItem value="card_name">Card Name</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Bulk Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {selectedRedemptions.length} selected
                </Badge>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {totalTimeValue} total TIME
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
                <Input
                  placeholder="External reference (optional)"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="default" 
                  onClick={() => handleBulkAction('approve')}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Credit Selected
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleBulkAction('reject')}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      disabled={processing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Permanently Delete Redemptions?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedRedemptions.length} redemption request{selectedRedemptions.length !== 1 ? 's' : ''} from the database. 
                        This action cannot be undone. Consider using "Reject" instead if you want to preserve the record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redemptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Redemptions ({filteredAndSortedRedemptions.length})
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
            >
              {selectedRedemptions.length === filteredAndSortedRedemptions.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedRedemptions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredAndSortedRedemptions.map((redemption) => {
                const isSelected = selectedRedemptions.includes(redemption.redemption_id);
                return (
                  <div 
                    key={redemption.redemption_id} 
                    className={`space-y-2 p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRedemptions(selectedRedemptions.filter(id => id !== redemption.redemption_id));
                      } else {
                        setSelectedRedemptions([...selectedRedemptions, redemption.redemption_id]);
                      }
                    }}
                  >
                    <div className="relative">
                      <EnhancedTradingCard
                        card={{
                          id: redemption.card_id,
                          name: redemption.card_name,
                          suit: redemption.card_suit,
                          rank: redemption.card_rank,
                          era: redemption.card_era,
                          rarity: redemption.card_rarity,
                          image_url: redemption.card_image_url,
                          time_value: redemption.time_value,
                          trader_value: redemption.trader_value,
                          description: '',
                          is_claimed: false,
                          claimed_at: null,
                          redemption_status: 'pending'
                        }}
                        baseWidth={120}
                        showFullDetails={true}
                        className="transition-all duration-200"
                      />
                      
                      {/* TIME Value Badge - Super Visible */}
                      <div className="absolute -top-2 -left-2 z-20">
                        <Badge className="bg-green-600 text-white font-bold text-sm px-2 py-1 shadow-lg border-2 border-white">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {redemption.time_value} TIME
                        </Badge>
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <CheckCircle className="h-5 w-5 text-primary bg-background rounded-full" />
                        </div>
                      )}
                    </div>
                    
                    {/* User Info Below Card - Grayed Out */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 truncate">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{redemption.user_email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>{new Date(redemption.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pending redemptions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}