import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { User, Mail, Clock, CreditCard, Activity, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

interface UserDetailModalProps {
  user: {
    user_id: string;
    email: string;
    created_at: string;
    email_confirmed_at?: string;
    last_sign_in_at?: string;
    is_blocked: boolean;
    block_reason?: string;
    blocked_at?: string;
    blocked_by_email?: string;
    total_cards_owned: number;
    pending_redemptions: number;
    credited_redemptions: number;
    total_scans: number;
    last_activity?: string;
    total_time_credited: number;
    total_time_owned: number;
  };
  onClose: () => void;
  onUserUpdated: () => void;
}

interface UserCard {
  card_id: string;
  name: string;
  suit: string;
  rank: string;
  era: string;
  rarity: string;
  image_url: string;
  claimed_at: string;
  redemption_status: string;
}

interface ScanEvent {
  created_at: string;
  code: string;
  outcome: string;
}

export function UserDetailModal({ user, onClose, onUserUpdated }: UserDetailModalProps) {
  const { toast } = useToast();
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserDetails();
    }
  }, [user]);

  const loadUserDetails = async () => {
    setIsLoading(true);
    try {
      // Load user's cards
      const { data: cardsData, error: cardsError } = await supabase
        .rpc('user_card_collection')
        .eq('user_id', user.user_id);

      // Load scan events for this user (admin function needed)
      const { data: scansData, error: scansError } = await supabase
        .rpc('admin_scan_events', { p_limit: 50 })
        .eq('user_id', user.user_id);

      if (cardsError) {
        console.error('Error loading user cards:', cardsError);
      } else {
        setUserCards(cardsData || []);
      }

      if (scansError) {
        console.error('Error loading scan events:', scansError);
      } else {
        setScanEvents(scansData || []);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!blockReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for blocking this user',
        variant: 'destructive'
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_block_user_by_email', {
        p_email: user.email,
        p_reason: blockReason.trim()
      });

      if (error) throw error;

      toast({
        title: 'User Blocked',
        description: `${user.email} has been blocked`
      });

      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to block user',
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_unblock_user_by_email', {
        p_email: user.email
      });

      if (error) throw error;

      toast({
        title: 'User Unblocked',
        description: `${user.email} has been unblocked`
      });

      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'credited':
        return <Badge variant="default">Credited</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'claimed':
        return <Badge className="bg-green-100 text-green-800">Claimed</Badge>;
      case 'already_owner':
        return <Badge variant="secondary">Already Owned</Badge>;
      case 'not_found':
        return <Badge variant="destructive">Not Found</Badge>;
      case 'owned_by_other':
        return <Badge variant="outline">Owned by Other</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details: {user.email}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6">
            {/* User Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Account Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={user.is_blocked ? "destructive" : "default"}>
                      {user.is_blocked ? 'Blocked' : 'Active'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verified:</span>
                    <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                      {user.email_confirmed_at ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="text-sm">
                      {format(new Date(user.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sign In:</span>
                    <span className="text-sm">
                      {user.last_sign_in_at 
                        ? format(new Date(user.last_sign_in_at), 'MMM dd, yyyy HH:mm')
                        : 'Never'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cards Owned:</span>
                    <span className="font-medium">{user.total_cards_owned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credited Redemptions:</span>
                    <span className="font-medium">{user.credited_redemptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Redemptions:</span>
                    <span className="font-medium">{user.pending_redemptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Scans:</span>
                    <span className="font-medium">{user.total_scans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Token Credited:</span>
                    <span className="font-medium">{user.total_time_credited || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Token Owned:</span>
                    <span className="font-medium">{user.total_time_owned || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Activity:</span>
                    <span className="text-sm">
                      {user.last_activity 
                        ? formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })
                        : 'Never'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Block Status */}
            {user.is_blocked && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    Block Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blocked At:</span>
                    <span>
                      {user.blocked_at 
                        ? format(new Date(user.blocked_at), 'MMM dd, yyyy HH:mm')
                        : 'Unknown'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blocked By:</span>
                    <span>{user.blocked_by_email || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="mt-1 text-sm bg-white p-2 rounded border">
                      {user.block_reason || 'No reason provided'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Tabs */}
            <Tabs defaultValue="cards" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cards">User Cards ({userCards.length})</TabsTrigger>
                <TabsTrigger value="activity">Scan Activity ({scanEvents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="cards" className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : userCards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userCards.map((card) => (
                      <Card key={card.card_id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            {card.image_url && (
                              <img
                                src={card.image_url}
                                alt={card.name}
                                className="w-16 h-20 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{card.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {card.era} • {card.suit} {card.rank}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Claimed {formatDistanceToNow(new Date(card.claimed_at), { addSuffix: true })}
                              </p>
                              <div className="mt-2">
                                {getStatusBadge(card.redemption_status)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    This user has no cards yet
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : scanEvents.length > 0 ? (
                  <div className="space-y-3">
                    {scanEvents.map((event, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-mono text-sm">{event.code}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                              </p>
                            </div>
                            <div>
                              {getOutcomeBadge(event.outcome)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No scan activity recorded
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.is_blocked ? (
                  <Button 
                    onClick={handleUnblockUser}
                    disabled={isActionLoading}
                    className="w-full"
                  >
                    {isActionLoading ? 'Unblocking...' : 'Unblock User'}
                  </Button>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Block Reason (required)
                      </label>
                      <Textarea
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Enter reason for blocking this user..."
                        className="mb-3"
                      />
                    </div>
                    <Button 
                      onClick={handleBlockUser}
                      disabled={isActionLoading || !blockReason.trim()}
                      variant="destructive"
                      className="w-full"
                    >
                      {isActionLoading ? 'Blocking...' : 'Block User'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}