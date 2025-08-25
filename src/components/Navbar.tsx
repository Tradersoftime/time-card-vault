// src/components/Navbar.tsx
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, LogOut, User, CreditCard, Shield, ScanLine, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { if (mounted) setIsAdmin(false); return; }
      const { data } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (mounted) setIsAdmin(!!data);
    })();
    return () => { mounted = false; };
  }, [user]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = () => {
    signOut();
    setIsMobileMenuOpen(false);
  };

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

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`interactive text-sm font-medium transition-colors ${
                isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Home
            </Link>

            {user && (
              <>
                <Link
                  to="/scan"
                  className={`interactive text-sm font-medium transition-colors flex items-center gap-1 ${
                    isActive('/scan') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ScanLine className="h-4 w-4" />
                  Scan
                </Link>

                <Link
                  to="/me/cards"
                  className={`interactive text-sm font-medium transition-colors ${
                    isActive('/me/cards') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  My Collection
                </Link>
              </>
            )}

            {user && isAdmin && (
              <Link
                to="/admin"
                className={`interactive text-sm font-medium transition-colors flex items-center space-x-1 ${
                  isActive('/admin') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="interactive">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Desktop User Menu */}
            {user ? (
              <div className="hidden md:flex items-center space-x-3">
                <div className="hidden lg:flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="interactive">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline ml-2">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Link to="/auth/login" className="hidden md:block">
                <Button variant="hero" size="sm" className="interactive">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="interactive"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-primary/20">
            <div className="flex flex-col space-y-4">
              {/* Mobile Navigation Links */}
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Home</span>
              </Link>

              {user && (
                <>
                  <Link
                    to="/scan"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/scan') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }`}
                  >
                    <ScanLine className="h-4 w-4" />
                    <span>Scan Cards</span>
                  </Link>

                  <Link
                    to="/me/cards"
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/me/cards') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>My Collection</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin') 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                </>
              )}

              {/* Mobile User Section */}
              <div className="pt-4 border-t border-primary/20">
                {user ? (
                  <>
                    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth/login" 
                    className="flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-medium text-sm glow-primary"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
