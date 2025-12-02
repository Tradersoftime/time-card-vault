import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { RefreshCw, MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';

type Ticket = {
  id: string;
  user_id: string;
  user_email: string;
  category: string;
  subject: string;
  message: string;
  page_url: string | null;
  card_id: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
  closed: 'bg-muted text-muted-foreground',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Clock className="h-3 w-3" />,
  in_progress: <RefreshCw className="h-3 w-3" />,
  resolved: <CheckCircle className="h-3 w-3" />,
  closed: <XCircle className="h-3 w-3" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  card_issue: 'Card Issue',
  redemption: 'Redemption',
  account: 'Account',
  bug: 'Bug Report',
  general: 'General',
};

export default function AdminSupport() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['admin-support-tickets', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      
      if (notes !== undefined) {
        updates.admin_notes = notes;
      }
      
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success('Ticket updated');
      setSelectedTicket(null);
    },
    onError: () => {
      toast.error('Failed to update ticket');
    },
  });

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateTicket.mutate({ id: ticketId, status: newStatus });
  };

  const handleSaveNotes = () => {
    if (!selectedTicket) return;
    updateTicket.mutate({
      id: selectedTicket.id,
      status: selectedTicket.status,
      notes: adminNotes,
    });
  };

  const openCount = tickets?.filter((t) => t.status === 'open').length || 0;
  const inProgressCount = tickets?.filter((t) => t.status === 'in_progress').length || 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">
            {openCount} open, {inProgressCount} in progress
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : !tickets?.length ? (
            <p className="text-muted-foreground py-8 text-center">No tickets found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[ticket.status]}>
                        {STATUS_ICONS[ticket.status]}
                        <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {CATEGORY_LABELS[ticket.category] || ticket.category}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.user_email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setAdminNotes(ticket.admin_notes || '');
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{selectedTicket.user_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">
                    {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Page URL</p>
                  <p className="font-medium truncate text-xs">
                    {selectedTicket.page_url || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Message</p>
                <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Status</p>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(val) => handleStatusChange(selectedTicket.id, val)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this ticket..."
                  rows={3}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleSaveNotes}
                  disabled={updateTicket.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
