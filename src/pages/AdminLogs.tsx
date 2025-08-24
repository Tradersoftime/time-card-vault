import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, RefreshCw, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LogEntry {
  id: string;
  created_at: string;
  event_type: string;
  data: any;
  processed: boolean;
}

interface ScanEvent {
  id: string;
  created_at: string;
  code: string;
  outcome: string;
  source: string;
  card_id?: string;
  user_id: string;
}

interface RedemptionLog {
  id: string;
  submitted_at: string;
  status: string;
  user_id: string;
  credited_amount?: number;
  credited_at?: string;
  admin_notes?: string;
}

export default function AdminLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookLogs, setWebhookLogs] = useState<LogEntry[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [redemptionLogs, setRedemptionLogs] = useState<RedemptionLog[]>([]);
  
  const [activeTab, setActiveTab] = useState<'webhook' | 'scan' | 'redemption'>('webhook');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const adminStatus = !!data;
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast({
        title: "Error",
        description: "Failed to verify admin status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      await Promise.all([
        loadWebhookLogs(),
        loadScanEvents(),
        loadRedemptionLogs()
      ]);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: "Error",
        description: "Failed to load logs",
        variant: "destructive",
      });
    }
  };

  const loadWebhookLogs = async () => {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    setWebhookLogs(data || []);
  };

  const loadScanEvents = async () => {
    const { data, error } = await supabase
      .from('scan_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    setScanEvents(data || []);
  };

  const loadRedemptionLogs = async () => {
    const { data, error } = await supabase
      .from('redemptions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    setRedemptionLogs(data || []);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLogs();
      toast({
        title: "Success",
        description: "Logs refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh logs",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'success': 'default',
      'pending': 'secondary',
      'failed': 'destructive',
      'error': 'destructive',
      'approved': 'default',
      'rejected': 'destructive',
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="glass-panel">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Please log in to access admin logs.</p>
            <Button onClick={() => navigate('/login')} variant="hero">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="glass-panel">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Access denied. Admin privileges required.</p>
            <Button onClick={() => navigate('/')} variant="hero">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredWebhookLogs = webhookLogs.filter(log =>
    log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredScanEvents = scanEvents.filter(event =>
    event.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.outcome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRedemptionLogs = redemptionLogs.filter(log =>
    log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_id.includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-xl p-6 glow-effect">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                Admin Logs
              </h1>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="hero"
              size="sm"
            >
              {refreshing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'webhook' ? 'hero' : 'ghost'}
              onClick={() => setActiveTab('webhook')}
              size="sm"
            >
              Webhook Logs ({filteredWebhookLogs.length})
            </Button>
            <Button
              variant={activeTab === 'scan' ? 'hero' : 'ghost'}
              onClick={() => setActiveTab('scan')}
              size="sm"
            >
              Scan Events ({filteredScanEvents.length})
            </Button>
            <Button
              variant={activeTab === 'redemption' ? 'hero' : 'ghost'}
              onClick={() => setActiveTab('redemption')}
              size="sm"
            >
              Redemption Logs ({filteredRedemptionLogs.length})
            </Button>
          </div>
        </div>

        {/* Webhook Logs */}
        {activeTab === 'webhook' && (
          <div className="space-y-4">
            {filteredWebhookLogs.length === 0 ? (
              <Card className="glass-panel">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No webhook logs found.</p>
                </CardContent>
              </Card>
            ) : (
              filteredWebhookLogs.map((log) => (
                <Card key={log.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{log.event_type}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.processed ? 'processed' : 'pending')}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-muted/30 p-3 rounded overflow-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Scan Events */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {filteredScanEvents.length === 0 ? (
              <Card className="glass-panel">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No scan events found.</p>
                </CardContent>
              </Card>
            ) : (
              filteredScanEvents.map((event) => (
                <Card key={event.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Code: {event.code}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(event.outcome)}
                        <Badge variant="secondary">{event.source}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">User ID:</span>
                        <p className="text-muted-foreground font-mono">{event.user_id}</p>
                      </div>
                      {event.card_id && (
                        <div>
                          <span className="font-medium">Card ID:</span>
                          <p className="text-muted-foreground font-mono">{event.card_id}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Redemption Logs */}
        {activeTab === 'redemption' && (
          <div className="space-y-4">
            {filteredRedemptionLogs.length === 0 ? (
              <Card className="glass-panel">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No redemption logs found.</p>
                </CardContent>
              </Card>
            ) : (
              filteredRedemptionLogs.map((log) => (
                <Card key={log.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Redemption</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.submitted_at)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">User ID:</span>
                        <p className="text-muted-foreground font-mono">{log.user_id}</p>
                      </div>
                      {log.credited_amount && (
                        <div>
                          <span className="font-medium">Credited Amount:</span>
                          <p className="text-muted-foreground">${log.credited_amount}</p>
                        </div>
                      )}
                      {log.credited_at && (
                        <div>
                          <span className="font-medium">Credited At:</span>
                          <p className="text-muted-foreground">{formatDate(log.credited_at)}</p>
                        </div>
                      )}
                      {log.admin_notes && (
                        <div className="col-span-2">
                          <span className="font-medium">Admin Notes:</span>
                          <p className="text-muted-foreground mt-1">{log.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}