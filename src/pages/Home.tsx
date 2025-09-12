import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreditCard, Scan, Sparkles, Monitor } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/lovable-uploads/4ca94ec6-031f-41b1-a293-f2059cda8cd1.png)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95"></div>
        <div className="relative container mx-auto px-4 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 glass-panel px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Premium Trading Cards</span>
              </div>
              <div className="mb-0">
                <img 
                  src="/lovable-uploads/a9b256ac-b242-4242-a766-6c5c851c39d9.png" 
                  alt="Traders of Time Logo" 
                  className="h-80 md:h-96 lg:h-[28rem] mx-auto"
                />
              </div>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Scan, collect, and redeem exclusive trading cards. 
                Build your premium collection across eras of history.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {user ? (
                <>
                  <Link to="/me/cards">
                    <Button variant="hero" size="lg" className="w-full sm:w-auto">
                      <CreditCard className="mr-2 h-5 w-5" />
                      My Collection
                    </Button>
                  </Link>
                  {isMobile ? (
                    <Link to="/quick-scan">
                      <Button variant="glass" size="lg" className="w-full sm:w-auto">
                        <Scan className="mr-2 h-5 w-5" />
                        Scan Card
                      </Button>
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Button variant="glass" size="lg" className="w-full sm:w-auto opacity-50" disabled>
                        <Monitor className="mr-2 h-5 w-5" />
                        Scanning on Desktop
                      </Button>
                      <p className="text-xs text-muted-foreground text-center max-w-48">
                        Use your phone to scan QR codes
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Link to="/auth/login">
                    <Button variant="hero" size="lg" className="w-full sm:w-auto">
                      Get Started
                    </Button>
                  </Link>
                  {isMobile ? (
                    <Button variant="glass" size="lg" className="w-full sm:w-auto">
                      <Scan className="mr-2 h-5 w-5" />
                      Learn More
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Button variant="glass" size="lg" className="w-full sm:w-auto">
                        <Monitor className="mr-2 h-5 w-5" />
                        Learn More
                      </Button>
                      <p className="text-xs text-muted-foreground text-center max-w-48">
                        Scanning requires a mobile device
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It <span className="gradient-text">Works</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Scan QR Code</h3>
              <p className="text-muted-foreground">
                Use your phone to scan the QR code on your physical trading card.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Claim Your Card</h3>
              <p className="text-muted-foreground">
                Add the card to your digital collection and view its stats and rarity.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Build Collection</h3>
              <p className="text-muted-foreground">
                Collect cards across different eras and unlock exclusive rewards.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}