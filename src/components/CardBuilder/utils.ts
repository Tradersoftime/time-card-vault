export interface RankDistribution {
  rank: string;
  quantity: number;
  suits: string[];
  eras: string[];
  rarities: string[];
  traderLeverage: number;
  multiplier: number;
  traderValue: string;
}

export interface RarityDistribution {
  rarity: string;
  quantity: number;
  traderLeverageRange: { min: number; max: number; default: number };
}

export interface CardTemplate {
  baseName: string;
  namePattern: string;
  imageCode: string;
  descriptionPattern: string;
  defaultStatus: string;
  rankDistributions: RankDistribution[];
}

export interface GeneratedCard {
  name: string;
  suit: string;
  rank: string;
  era: string;
  rarity: string;
  time_value: number;
  trader_value: string;
  image_code: string;
  description: string;
  status: string;
}

const SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
const ERAS = ['Prehistoric', 'Ancient', 'Medieval', 'Modern', 'Future'];
const RARITIES = ['Degen', 'Day Trader', 'Investor', 'Market Maker', 'Whale'];

export const TRADER_LEVERAGE_RANGES: Record<string, { min: number; max: number; default: number }> = {
  'Degen': { min: 10, max: 19, default: 15 },
  'Day Trader': { min: 20, max: 29, default: 25 },
  'Investor': { min: 30, max: 39, default: 35 },
  'Market Maker': { min: 40, max: 49, default: 45 },
  'Whale': { min: 50, max: 100, default: 60 },
};

// Helper to evenly distribute items across a quantity
function distributeEvenly<T>(items: T[], quantity: number): T[] {
  if (items.length === 0) return [];
  if (quantity === 0) return [];
  
  const result: T[] = [];
  const itemsPerSlot = Math.floor(quantity / items.length);
  const remainder = quantity % items.length;
  
  for (let i = 0; i < items.length; i++) {
    const count = itemsPerSlot + (i < remainder ? 1 : 0);
    for (let j = 0; j < count; j++) {
      result.push(items[i]);
    }
  }
  
  return result;
}

// Interpolate variables in template string
function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] || match);
}

export function generateCards(template: CardTemplate): GeneratedCard[] {
  const cards: GeneratedCard[] = [];
  
  for (const distribution of template.rankDistributions) {
    if (distribution.quantity === 0) continue;
    
    // Use all options if none selected
    const suits = distribution.suits.length > 0 ? distribution.suits : SUITS;
    const eras = distribution.eras.length > 0 ? distribution.eras : ERAS;
    const rarities = distribution.rarities.length > 0 ? distribution.rarities : RARITIES;
    
    // Calculate combinations
    const totalCombinations = suits.length * eras.length * rarities.length;
    const cardsPerCombination = Math.floor(distribution.quantity / totalCombinations);
    const remainder = distribution.quantity % totalCombinations;
    
    let cardCount = 0;
    
    // Generate cards by cycling through combinations
    for (let i = 0; i < distribution.quantity; i++) {
      const combinationIndex = i % totalCombinations;
      const suitIndex = Math.floor(combinationIndex / (eras.length * rarities.length)) % suits.length;
      const eraIndex = Math.floor(combinationIndex / rarities.length) % eras.length;
      const rarityIndex = combinationIndex % rarities.length;
      
      const suit = suits[suitIndex];
      const era = eras[eraIndex];
      const rarity = rarities[rarityIndex];
      
      const values = {
        rank: distribution.rank,
        baseName: template.baseName,
        suit,
        era,
        rarity,
      };
      
      const timeValue = distribution.traderLeverage * distribution.multiplier;
      
      cards.push({
        name: interpolate(template.namePattern, values),
        suit,
        rank: distribution.rank,
        era,
        rarity,
        time_value: timeValue,
        trader_value: distribution.traderValue,
        image_code: template.imageCode,
        description: interpolate(template.descriptionPattern, values),
        status: template.defaultStatus,
      });
      
      cardCount++;
    }
  }
  
  return cards;
}

export function exportToCSV(cards: GeneratedCard[], filename: string): void {
  const headers = ['name', 'suit', 'rank', 'era', 'rarity', 'time_value', 'trader_value', 'image_code', 'description', 'status'];
  
  const rows = cards.map(card => [
    card.name,
    card.suit,
    card.rank,
    card.era,
    card.rarity,
    card.time_value,
    card.trader_value,
    card.image_code,
    card.description || '',
    card.status,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => {
      const value = String(field);
      return value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const RANK_OPTIONS = ['Ace', 'King', 'Queen', 'Jack', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
export const SUIT_OPTIONS = SUITS;
export const ERA_OPTIONS = ERAS;
export const RARITY_OPTIONS = RARITIES;
export const STATUS_OPTIONS = ['active', 'unprinted', 'printed', 'retired'];
export const TRADER_VALUE_OPTIONS = ['Elite', 'Premium', 'Standard', 'Basic'];
