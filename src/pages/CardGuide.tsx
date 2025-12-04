import { CreditCard } from 'lucide-react';
import cardGuide from '@/assets/card-guide.png';

export default function CardGuide() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Card Guide</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Learn about all the elements that make up your ToT trading cards.
          </p>
        </div>

        {/* Card Guide Image */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex justify-center">
            <img 
              src={cardGuide} 
              alt="Card Guide - Explaining all elements of a trading card including rank, suit, trader name, TLV, rarity, era, abilities, and QR code"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
