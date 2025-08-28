// src/components/Navbar.tsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Sun, Moon, LogOut, User, CreditCard, Shield, QrCode, Cog } from "lucide-react";

export function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        // Fail closed: hide admin links on error
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass-panel border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 interactive">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">TOT Cards</span>
          </Link>

          {/* Left nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`interactive text-sm font-medium transition-colors ${
                isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Home
            </Link>

            {user && (
              <Link
                to="/me/cards"
                className={`interactive text-sm font-medium transition-colors ${
                  isActive("/me/cards")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Collection
              </Link>
            )}

            {/* Admin-only links */}
            {user && isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`interactive text-sm font-medium transition-colors flex items-center gap-1 ${
                    isActive("/admin")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Admin Panel"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>

                <Link
                  to="/admin/cards"
                  className={`interactive text-sm font-medium transition-colors flex items-center gap-1 ${
                    isActive("/admin/cards")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Card Management"
                >
                  <Cog className="h-4 w-4" />
                  Card Management
                </Link>

                <Link
                  to="/admin/qr"
                  className={`interactive text-sm font-medium transition-colors flex items-center gap-1 ${
                    isActive("/admin/qr")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="QR Tools"
                >
                  <QrCode className="h-4 w-4" />
                  QR Tools
                </Link>
              </>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Theme toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="interactive">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Auth */}
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="interactive">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Link to="/auth/login">
                <Button variant="hero" size="sm" className="interactive">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
