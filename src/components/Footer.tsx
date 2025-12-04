import { Link } from 'react-router-dom';
import { CreditCard, Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="glass-panel border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">ToT Cards</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Premium trading card collection platform. Scan, collect, and redeem exclusive cards across eras of history.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="font-semibold">Platform</h4>
            <div className="space-y-2 text-sm">
              <Link to="/" className="block text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/me/cards" className="block text-muted-foreground hover:text-foreground transition-colors">
                My Collection
              </Link>
              <div className="text-muted-foreground">
                Scan Card (Soon)
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-semibold">Support</h4>
            <div className="space-y-2 text-sm">
              <Link to="/help" className="block text-muted-foreground hover:text-foreground transition-colors">
                Help Center
              </Link>
              <div className="text-muted-foreground">
                Card Guide (Soon)
              </div>
              <div className="text-muted-foreground">
                Contact Support (Soon)
              </div>
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h4 className="font-semibold">Connect</h4>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center opacity-50">
                <Twitter className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center opacity-50">
                <Github className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center opacity-50">
                <Mail className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Social links coming soon
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2024 ToT Cards. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with premium design and care
          </p>
        </div>
      </div>
    </footer>
  );
}