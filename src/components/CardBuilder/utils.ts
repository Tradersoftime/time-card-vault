export interface RankDistribution {
  rank: string;
  quantity: number;
  suits: string[];
  eras: string[];
  rarities: string[];
  traderLeverage: number;
  multiplier: number;
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
        trader_value: 'Standard',
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

// Helper to calculate even split quantities across ranks
export function calculateEvenSplitQuantities(totalCards: number, numRanks: number): number[] {
  const baseQuantity = Math.floor(totalCards / numRanks);
  const remainder = totalCards % numRanks;
  
  const quantities: number[] = [];
  for (let i = 0; i < numRanks; i++) {
    quantities.push(baseQuantity + (i < remainder ? 1 : 0));
  }
  
  return quantities;
}

// Helper to get average trader leverage across all rarities
export function getAverageTraderLeverage(): number {
  const total = Object.values(TRADER_LEVERAGE_RANGES).reduce((sum, range) => sum + range.default, 0);
  return Math.round(total / Object.keys(TRADER_LEVERAGE_RANGES).length);
}

export const RANK_OPTIONS = ['Ace', 'King', 'Queen', 'Jack', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
export const SUIT_OPTIONS = SUITS;
export const ERA_OPTIONS = ERAS;
export const RARITY_OPTIONS = RARITIES;
export const STATUS_OPTIONS = ['active', 'unprinted', 'printed', 'retired'];

// Row-based card builder interfaces
export interface RowBasedCardConfig {
  totalCards: number;
  rarityPercentages: Record<string, number>;
  traderNames: string[];
  eras: string[];
  suits: string[];
  tlvMultiplier: number;
  imageCode: string;
  batchId: string | null;
  status: string;
}

// Generate cards from row-based configuration
export function generateCardsFromRows(config: RowBasedCardConfig): GeneratedCard[] {
  const cards: GeneratedCard[] = [];
  
  // Validate configuration
  const validTraderNames = config.traderNames.filter(n => n.trim());
  if (validTraderNames.length === 0 || config.eras.length === 0 || config.suits.length === 0) {
    return cards;
  }
  
  // Calculate cards per rarity
  const rarityCards: Record<string, number> = {};
  let totalAllocated = 0;
  
  RARITY_OPTIONS.forEach((rarity, index) => {
    const percentage = config.rarityPercentages[rarity] || 0;
    let cardCount = Math.round((config.totalCards * percentage) / 100);
    
    // Handle rounding on last rarity
    if (index === RARITY_OPTIONS.length - 1) {
      cardCount = config.totalCards - totalAllocated;
    }
    
    rarityCards[rarity] = Math.max(0, cardCount);
    totalAllocated += cardCount;
  });
  
  // Distribute evenly across ranks
  const rankQuantities = calculateEvenSplitQuantities(config.totalCards, RANK_OPTIONS.length);
  
  // Generate cards for each rarity
  RARITY_OPTIONS.forEach((rarity) => {
    const numCards = rarityCards[rarity];
    if (numCards === 0) return;
    
    const tlvRange = TRADER_LEVERAGE_RANGES[rarity];
    const tlvValues = generateEvenDistribution(tlvRange.min, tlvRange.max, numCards);
    
    // Distribute across trader names, eras, suits, and ranks
    for (let i = 0; i < numCards; i++) {
      const traderName = validTraderNames[i % validTraderNames.length];
      const era = config.eras[i % config.eras.length];
      const suit = config.suits[i % config.suits.length];
      const rank = RANK_OPTIONS[i % RANK_OPTIONS.length];
      const tlv = tlvValues[i];
      const timeValue = tlv * config.tlvMultiplier;
      
      cards.push({
        name: `${rank} ${traderName} of ${suit}`,
        suit,
        rank,
        era,
        rarity,
        time_value: timeValue,
        trader_value: 'Standard',
        image_code: config.imageCode,
        description: `A ${era} era ${rank} featuring ${traderName}`,
        status: config.status,
      });
    }
  });
  
  return cards;
}

// Generate evenly distributed values within a range
function generateEvenDistribution(min: number, max: number, count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [min];
  
  const values: number[] = [];
  const range = max - min;
  const step = range / (count - 1);
  
  for (let i = 0; i < count; i++) {
    values.push(Math.round(min + (step * i)));
  }
  
  return values;
}
