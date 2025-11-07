import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, User, Send, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  card_id: string;
  card_code: string;
  card_name: string;
  user_id: string;
  user_email: string;
  action: string;
  previous_owner_id: string | null;
  previous_owner_email: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface CardActivityTimelineProps {
  cardId: string;
}

const actionIcons: Record<string, any> = {
  claimed: User,
  released: Send,
  redemption_submitted: ArrowRight,
  redemption_pending: Clock,
  redemption_credited: CheckCircle,
  redemption_rejected: XCircle,
};

const actionColors: Record<string, string> = {
  claimed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  released: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  redemption_submitted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  redemption_pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  redemption_credited: "bg-green-500/10 text-green-500 border-green-500/20",
  redemption_rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const actionLabels: Record<string, string> = {
  claimed: "Claimed",
  released: "Released to Wild",
  redemption_submitted: "Submitted for TIME",
  redemption_pending: "Redemption Pending",
  redemption_credited: "TIME Credited",
  redemption_rejected: "Redemption Rejected",
};

export function CardActivityTimeline({ cardId }: CardActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [cardId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('admin_card_activity_log', {
        p_card_id: cardId,
        p_limit: 50
      });

      if (fetchError) throw fetchError;
      setActivities(data || []);
    } catch (err: any) {
      console.error('Error loading activity:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Card Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Card Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">Error loading activity: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Card Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No activity recorded yet</div>
        </CardContent>
      </Card>
    );
  }

  // Get current owner from the most recent claimed action
  const currentOwner = activities.find(a => a.action === 'claimed' && !activities.some(later => 
    later.action === 'released' && later.created_at > a.created_at
  ));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Card Activity Timeline</CardTitle>
          {currentOwner && (
            <Badge variant="outline" className="text-xs">
              Owner: {currentOwner.user_email}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = actionIcons[activity.action] || Clock;
            const colorClass = actionColors[activity.action] || "bg-muted text-muted-foreground border-border";
            const label = actionLabels[activity.action] || activity.action;

            return (
              <div key={activity.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full border ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < activities.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        by {activity.user_email}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Metadata */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs space-y-1">
                      {activity.metadata.credited_amount && (
                        <div>
                          <span className="text-muted-foreground">Amount:</span>{' '}
                          <span className="font-mono">{activity.metadata.credited_amount} TIME</span>
                        </div>
                      )}
                      {activity.metadata.admin_notes && (
                        <div>
                          <span className="text-muted-foreground">Note:</span>{' '}
                          <span>{activity.metadata.admin_notes}</span>
                        </div>
                      )}
                      {activity.metadata.claim_source && (
                        <div>
                          <span className="text-muted-foreground">Source:</span>{' '}
                          <span className="capitalize">{activity.metadata.claim_source}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Previous owner info for releases */}
                  {activity.action === 'released' && activity.previous_owner_email && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Released by {activity.previous_owner_email}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
