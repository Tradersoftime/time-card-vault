import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Download, Database, Link, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

export const AdminDataExport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Export QR URLs with their claim links
  const exportQRUrls = async () => {
    setLoading("qr-urls");
    try {
      const { data: cards, error } = await supabase
        .from("cards")
        .select("code, claim_token, name, era, suit, rank, current_target")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const shortUrl = import.meta.env.PUBLIC_SHORT_CLAIM_BASE_URL || "https://tot.cards/c/";
      const longUrl = import.meta.env.PUBLIC_CLAIM_BASE_URL || "https://tot.cards/claim?token=";

      const exportData = cards?.map(card => ({
        code: card.code,
        name: card.name || "",
        era: card.era || "",
        suit: card.suit || "",
        rank: card.rank || "",
        short_claim_url: `${shortUrl}${card.claim_token}`,
        long_claim_url: `${longUrl}${card.claim_token}`,
        redirect_target: card.current_target || "",
        character_savings: (longUrl.length + card.claim_token.length) - (shortUrl.length + card.claim_token.length)
      })) || [];

      const csv = Papa.unparse(exportData);
      downloadCSV(csv, "qr-claim-urls");
      
      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} QR claim URLs`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export QR URLs",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  // Export complete card database
  const exportCardDatabase = async () => {
    setLoading("database");
    try {
      const { data: cards, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const csv = Papa.unparse(cards || []);
      downloadCSV(csv, "cards-database-backup");
      
      toast({
        title: "Export Complete",
        description: `Exported ${cards?.length || 0} card records`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export card database",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  // Export redirect mappings
  const exportRedirectMappings = async () => {
    setLoading("redirects");
    try {
      const { data: cards, error } = await supabase
        .from("cards")
        .select("code, name, current_target, status, is_active")
        .neq("current_target", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const exportData = cards?.map(card => ({
        code: card.code,
        name: card.name || "",
        redirect_url: card.current_target,
        status: card.status,
        is_active: card.is_active,
        scan_url: `https://tot.cards/r/${card.code}`
      })) || [];

      const csv = Papa.unparse(exportData);
      downloadCSV(csv, "redirect-mappings");
      
      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} redirect mappings`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export redirect mappings",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  // Export user data summary (for backup purposes)
  const exportUserSummary = async () => {
    setLoading("users");
    try {
      const { data: userStats, error } = await supabase.rpc("admin_list_users", {
        p_limit: 10000
      });

      if (error) throw error;

      const csv = Papa.unparse(userStats || []);
      downloadCSV(csv, "user-statistics-backup");
      
      toast({
        title: "Export Complete", 
        description: `Exported ${userStats?.length || 0} user records`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export user data",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  // Helper function to download CSV
  const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const urlStats = {
    longFormat: "https://tot.cards/claim?token=ABC123...",
    shortFormat: "https://tot.cards/c/ABC123...",
    charactersSaved: 15,
    percentageReduction: "~33%"
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Export & Backup
        </CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Export your card data, QR mappings, and system backups for redundancy and emergency recovery.</div>
          <div className="bg-muted/50 p-2 rounded-md mt-2">
            <div className="font-medium mb-1">URL Optimization Active:</div>
            <div className="text-xs space-y-1">
              <div>• Old format: <code className="text-xs bg-background px-1 rounded">{urlStats.longFormat}</code></div>
              <div>• New format: <code className="text-xs bg-background px-1 rounded">{urlStats.shortFormat}</code></div>
              <div>• Savings: <strong>{urlStats.charactersSaved} characters ({urlStats.percentageReduction} shorter)</strong></div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* QR URLs Export */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Link className="h-4 w-4" />
              QR Claim URLs
            </h4>
            <p className="text-sm text-muted-foreground">
              Export all card claim URLs in both short and long formats with character savings data.
            </p>
            <Button 
              onClick={exportQRUrls} 
              disabled={loading === "qr-urls"}
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading === "qr-urls" ? "Exporting..." : "Export QR URLs"}
            </Button>
          </div>

          {/* Redirect Mappings */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Redirect Mappings
            </h4>
            <p className="text-sm text-muted-foreground">
              Export card codes and their current redirect targets for external management.
            </p>
            <Button 
              onClick={exportRedirectMappings} 
              disabled={loading === "redirects"}
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading === "redirects" ? "Exporting..." : "Export Redirects"}
            </Button>
          </div>

          {/* Complete Database Backup */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Complete Database
            </h4>
            <p className="text-sm text-muted-foreground">
              Full backup of all card data including metadata, tokens, and configuration.
            </p>
            <Button 
              onClick={exportCardDatabase} 
              disabled={loading === "database"}
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading === "database" ? "Exporting..." : "Export Database"}
            </Button>
          </div>

          {/* User Statistics */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              User Statistics
            </h4>
            <p className="text-sm text-muted-foreground">
              Export user data summary for analytics and backup purposes.
            </p>
            <Button 
              onClick={exportUserSummary} 
              disabled={loading === "users"}
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading === "users" ? "Exporting..." : "Export Users"}
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 p-3 rounded-lg text-xs text-muted-foreground">
          <strong>Backup Strategy:</strong> These exports ensure you can reconstruct your QR system on any platform. 
          Keep the QR URLs export safe - it contains the exact claim links printed on your physical cards.
        </div>
      </CardContent>
    </Card>
  );
};