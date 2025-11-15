import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

type BatchStats = {
  batch_id: string | null;
  batch_name: string;
  total_cards: number;
  avg_time_value: number;
  rarity_breakdown: Record<string, number>;
  suit_breakdown: Record<string, number>;
  era_breakdown: Record<string, number>;
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AdminBatchStats() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchStats, setBatchStats] = useState<BatchStats[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.user.id)
      .maybeSingle();

    setIsAdmin(!!data);
    if (data) {
      await loadStats();
    }
    setLoading(false);
  }

  async function loadStats() {
    setLoading(true);

    // Load all cards and batches
    const [cardsRes, batchesRes] = await Promise.all([
      supabase.from("cards").select("*").is("deleted_at", null),
      supabase.from("print_batches").select("*").order("sort_order"),
    ]);

    if (cardsRes.error || batchesRes.error) {
      console.error("Error loading data:", cardsRes.error || batchesRes.error);
      setLoading(false);
      return;
    }

    const cards = cardsRes.data || [];
    const batches = batchesRes.data || [];

    // Create batch lookup
    const batchMap = new Map(batches.map((b) => [b.id, b.name]));

    // Group cards by batch
    const grouped = new Map<string | null, any[]>();
    cards.forEach((card) => {
      const key = card.print_batch_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(card);
    });

    // Calculate stats for each batch
    const stats: BatchStats[] = [];

    grouped.forEach((cards, batchId) => {
      const batchName = batchId ? batchMap.get(batchId) || "Unknown Batch" : "Unassigned";

      // Calculate totals
      const total_cards = cards.length;
      const avg_time_value = cards.reduce((sum, c) => sum + (c.time_value || 0), 0) / total_cards;

      // Rarity breakdown
      const rarity_breakdown: Record<string, number> = {};
      cards.forEach((c) => {
        const rarity = c.rarity || "Unknown";
        rarity_breakdown[rarity] = (rarity_breakdown[rarity] || 0) + 1;
      });

      // Suit breakdown
      const suit_breakdown: Record<string, number> = {};
      cards.forEach((c) => {
        const suit = c.suit || "Unknown";
        suit_breakdown[suit] = (suit_breakdown[suit] || 0) + 1;
      });

      // Era breakdown
      const era_breakdown: Record<string, number> = {};
      cards.forEach((c) => {
        const era = c.era || "Unknown";
        era_breakdown[era] = (era_breakdown[era] || 0) + 1;
      });

      stats.push({
        batch_id: batchId,
        batch_name: batchName,
        total_cards,
        avg_time_value: Math.round(avg_time_value * 100) / 100,
        rarity_breakdown,
        suit_breakdown,
        era_breakdown,
      });
    });

    // Sort by total cards descending
    stats.sort((a, b) => b.total_cards - a.total_cards);

    setBatchStats(stats);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Access denied. Admin only.</p>
      </div>
    );
  }

  // Prepare chart data
  const batchDistributionData = batchStats.map((b) => ({
    name: b.batch_name,
    cards: b.total_cards,
    avgTime: b.avg_time_value,
  }));

  // Global rarity breakdown
  const globalRarityData: Record<string, number> = {};
  batchStats.forEach((b) => {
    Object.entries(b.rarity_breakdown).forEach(([rarity, count]) => {
      globalRarityData[rarity] = (globalRarityData[rarity] || 0) + count;
    });
  });
  const rarityChartData = Object.entries(globalRarityData).map(([name, value]) => ({
    name,
    value,
  }));

  // Global suit breakdown
  const globalSuitData: Record<string, number> = {};
  batchStats.forEach((b) => {
    Object.entries(b.suit_breakdown).forEach(([suit, count]) => {
      globalSuitData[suit] = (globalSuitData[suit] || 0) + count;
    });
  });
  const suitChartData = Object.entries(globalSuitData).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Statistics Dashboard</h1>
          <p className="text-muted-foreground">Card distribution, time values, and rarity breakdowns</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{batchStats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {batchStats.reduce((sum, b) => sum + b.total_cards, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(
                batchStats.reduce((sum, b) => sum + b.avg_time_value * b.total_cards, 0) /
                  batchStats.reduce((sum, b) => sum + b.total_cards, 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rarity Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rarityChartData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Card Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Card Distribution Across Batches</CardTitle>
          <CardDescription>Number of cards and average time value per batch</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={batchDistributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="cards" fill="hsl(var(--chart-1))" name="Total Cards" />
              <Bar dataKey="avgTime" fill="hsl(var(--chart-2))" name="Avg Time Value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rarity and Suit Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Rarity Distribution</CardTitle>
            <CardDescription>Card count by rarity across all batches</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rarityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--chart-1))"
                  dataKey="value"
                >
                  {rarityChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Suit Distribution</CardTitle>
            <CardDescription>Card count by suit across all batches</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={suitChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--chart-2))"
                  dataKey="value"
                >
                  {suitChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Batch Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
          <CardDescription>Detailed statistics for each batch</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-6">
              {batchStats.map((batch, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{batch.batch_name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {batch.total_cards} cards • Avg: {batch.avg_time_value} TIME
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2 text-muted-foreground">Rarities</h4>
                      {Object.entries(batch.rarity_breakdown).map(([rarity, count]) => (
                        <div key={rarity} className="flex justify-between">
                          <span>{rarity}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 text-muted-foreground">Suits</h4>
                      {Object.entries(batch.suit_breakdown).map(([suit, count]) => (
                        <div key={suit} className="flex justify-between">
                          <span>{suit}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 text-muted-foreground">Eras</h4>
                      {Object.entries(batch.era_breakdown).map(([era, count]) => (
                        <div key={era} className="flex justify-between">
                          <span>{era}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
