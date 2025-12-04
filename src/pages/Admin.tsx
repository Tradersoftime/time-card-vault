import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  CreditCard, 
  Gift, 
  Clock, 
  ArrowRight,
  QrCode,
  Hammer,
  Package,
  Activity,
  LifeBuoy
} from "lucide-react";

type Stats = {
  totalUsers: number;
  totalCards: number;
  pendingRedemptions: number;
  pendingSupportTickets: number;
  timeCredited: number;
};

export default function Admin() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalCards: 0, pendingRedemptions: 0, pendingSupportTickets: 0, timeCredited: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      // Fetch basic counts in parallel
      const [usersRes, cardsRes, pendingRes, creditedRes] = await Promise.all([
        supabase.rpc("admin_list_users", { p_limit: 1 }),
        supabase.rpc("admin_list_cards", { p_limit: 1 }),
        supabase.rpc("admin_pending_card_redemptions"),
        supabase.rpc("admin_recent_credited", { p_limit: 100 }),
      ]);

      // Get total users from a separate count query
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get total cards
      const { count: cardCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      // Get pending support tickets
      const { count: supportTicketCount } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      const pendingCount = pendingRes.data?.length ?? 0;
      const creditedData = creditedRes.data as any[] ?? [];
      const totalTime = creditedData.reduce((sum, r) => sum + (r.amount_time ?? 0), 0);

      setStats({
        totalUsers: userCount ?? 0,
        totalCards: cardCount ?? 0,
        pendingRedemptions: pendingCount,
        pendingSupportTickets: supportTicketCount ?? 0,
        timeCredited: totalTime,
      });
    } catch (err) {
      console.error("Failed to load stats", err);
    }
    setLoading(false);
  }

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Active Cards", value: stats.totalCards, icon: CreditCard, color: "text-emerald-400" },
    { label: "Pending Redemptions", value: stats.pendingRedemptions, icon: Gift, color: "text-orange-400" },
    { label: "Open Tickets", value: stats.pendingSupportTickets, icon: LifeBuoy, color: "text-purple-400" },
    { label: "TIME Credited", value: stats.timeCredited.toLocaleString(), icon: Clock, color: "text-primary" },
  ];

  const quickActions = [
    { label: "Review Redemptions", description: "Process pending card redemptions", to: "/admin/redemptions", icon: Gift },
    { label: "Create Cards", description: "Build new card batches", to: "/admin/card-builder", icon: Hammer },
    { label: "Generate QR Codes", description: "Create QR codes for cards", to: "/admin/qr", icon: QrCode },
    { label: "Manage Batches", description: "View and manage print batches", to: "/admin/batch-stats", icon: Package },
    { label: "View Activity", description: "Scan events and credited logs", to: "/admin/activity", icon: Activity },
    { label: "Support Tickets", description: "Handle user support requests", to: "/admin/support", icon: LifeBuoy },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-panel border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {loading ? (
                      <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-muted/50 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="glass-panel border-border/30 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {action.label}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Redemptions Alert */}
      {stats.pendingRedemptions > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Gift className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {stats.pendingRedemptions} pending redemption{stats.pendingRedemptions !== 1 ? "s" : ""} awaiting review
                  </p>
                  <p className="text-sm text-muted-foreground">Review and process card redemption requests</p>
                </div>
              </div>
              <Link
                to="/admin/redemptions"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm whitespace-nowrap"
              >
                Review Now
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Support Tickets Alert */}
      {stats.pendingSupportTickets > 0 && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <LifeBuoy className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {stats.pendingSupportTickets} open support ticket{stats.pendingSupportTickets !== 1 ? "s" : ""} need attention
                  </p>
                  <p className="text-sm text-muted-foreground">Users are waiting for help with their requests</p>
                </div>
              </div>
              <Link
                to="/admin/support"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium text-sm whitespace-nowrap"
              >
                View Tickets
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
