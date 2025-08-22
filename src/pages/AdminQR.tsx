import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Download, ArrowLeft, Copy } from "lucide-react";
import QRCode from "qrcode";

export default function AdminQR() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [qrText, setQrText] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check admin status
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { 
        if (mounted) setIsAdmin(false); 
        return; 
      }
      
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      
      if (!mounted) return;
      setIsAdmin(!!data);
    })();
    return () => { mounted = false; };
  }, []);

  const generateQR = async () => {
    if (!qrText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to generate QR code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(qrText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-${Date.now()}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded",
      description: "QR code saved to downloads",
    });
  };

  const copyToClipboard = async () => {
    if (!qrText) return;
    
    try {
      await navigator.clipboard.writeText(qrText);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <Card className="glass-panel max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You don't have admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold text-foreground">QR Code Generator</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <QrCode className="h-5 w-5" />
                Generate QR Code
              </CardTitle>
              <CardDescription>
                Enter any text, URL, or code to generate a QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qr-text" className="text-foreground">Text or URL</Label>
                <Input
                  id="qr-text"
                  placeholder="Enter text, URL, or card code..."
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  className="glass-panel text-foreground"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={generateQR}
                  disabled={loading || !qrText.trim()}
                  className="flex-1"
                >
                  {loading ? "Generating..." : "Generate QR"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  disabled={!qrText}
                  className="glass-panel"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Preview */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-foreground">QR Code Preview</CardTitle>
              <CardDescription>
                {qrDataUrl ? "Right-click to save or use download button" : "Generate a QR code to see preview"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrDataUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img
                      src={qrDataUrl}
                      alt="Generated QR Code"
                      className="max-w-full h-auto"
                      style={{ maxWidth: '300px' }}
                    />
                  </div>
                  <Button
                    onClick={downloadQR}
                    variant="outline"
                    className="w-full glass-panel"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>QR code will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common QR code templates for admin use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => setQrText(`${window.location.origin}/claim`)}
                className="glass-panel text-left justify-start"
              >
                Claim Page URL
              </Button>
              <Button
                variant="outline"
                onClick={() => setQrText(`${window.location.origin}/scan`)}
                className="glass-panel text-left justify-start"
              >
                Scan Page URL
              </Button>
              <Button
                variant="outline"
                onClick={() => setQrText(`${window.location.origin}/redeem`)}
                className="glass-panel text-left justify-start"
              >
                Redeem Page URL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}