import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BatchFilterDropdown } from './BatchFilterDropdown';

export interface BatchFiltersState {
  suits: string[];
  ranks: string[];
  eras: string[];
  rarities: string[];
  statuses: string[];
  timeValueMin: number | null;
  timeValueMax: number | null;
  traderValues: string[];
  claimedStatus: 'all' | 'claimed' | 'unclaimed';
}

interface BatchFiltersProps {
  filters: BatchFiltersState;
  onChange: (filters: BatchFiltersState) => void;
  availableOptions: {
    eras: string[];
    traderValues: string[];
  };
}

const SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
const RANKS = ['Ace', 'King', 'Queen', 'Jack', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const STATUSES = ['Active', 'Inactive'];

export function BatchFilters({ filters, onChange, availableOptions }: BatchFiltersProps) {
  const hasActiveFilters = 
    filters.suits.length > 0 ||
    filters.ranks.length > 0 ||
    filters.eras.length > 0 ||
    filters.rarities.length > 0 ||
    filters.statuses.length > 0 ||
    filters.timeValueMin !== null ||
    filters.timeValueMax !== null ||
    filters.traderValues.length > 0 ||
    filters.claimedStatus !== 'all';

  const clearAllFilters = () => {
    onChange({
      suits: [],
      ranks: [],
      eras: [],
      rarities: [],
      statuses: [],
      timeValueMin: null,
      timeValueMax: null,
      traderValues: [],
      claimedStatus: 'all',
    });
  };

  const removeFilter = (filterKey: keyof BatchFiltersState, value?: string) => {
    if (filterKey === 'timeValueMin' || filterKey === 'timeValueMax') {
      onChange({ ...filters, [filterKey]: null });
    } else if (filterKey === 'claimedStatus') {
      onChange({ ...filters, claimedStatus: 'all' });
    } else if (Array.isArray(filters[filterKey]) && value) {
      onChange({
        ...filters,
        [filterKey]: (filters[filterKey] as string[]).filter(v => v !== value),
      });
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Filters</h4>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="space-y-3">
        {/* Row 1: Multi-select dropdowns */}
        <div className="flex flex-wrap gap-2">
          <BatchFilterDropdown
            label="Suit"
            options={SUITS}
            selected={filters.suits}
            onChange={(suits) => onChange({ ...filters, suits })}
            placeholder="Select suits"
          />
          <BatchFilterDropdown
            label="Rank"
            options={RANKS}
            selected={filters.ranks}
            onChange={(ranks) => onChange({ ...filters, ranks })}
            placeholder="Select ranks"
          />
          <BatchFilterDropdown
            label="Era"
            options={availableOptions.eras}
            selected={filters.eras}
            onChange={(eras) => onChange({ ...filters, eras })}
            placeholder="Select eras"
          />
          <BatchFilterDropdown
            label="Rarity"
            options={RARITIES}
            selected={filters.rarities}
            onChange={(rarities) => onChange({ ...filters, rarities })}
            placeholder="Select rarities"
          />
          <BatchFilterDropdown
            label="Status"
            options={STATUSES}
            selected={filters.statuses}
            onChange={(statuses) => onChange({ ...filters, statuses })}
            placeholder="Select status"
          />
        </div>

        {/* Row 2: Time Value Range and Trader Value */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex items-center gap-2">
            <Label htmlFor="timeMin" className="text-xs whitespace-nowrap">
              Time Value:
            </Label>
            <Input
              id="timeMin"
              type="number"
              placeholder="Min"
              value={filters.timeValueMin ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  timeValueMin: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-20 h-9"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              id="timeMax"
              type="number"
              placeholder="Max"
              value={filters.timeValueMax ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  timeValueMax: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-20 h-9"
            />
          </div>

          <BatchFilterDropdown
            label="Trader Value"
            options={availableOptions.traderValues}
            selected={filters.traderValues}
            onChange={(traderValues) => onChange({ ...filters, traderValues })}
            placeholder="Select trader values"
          />
        </div>

        {/* Row 3: Claimed Status Radio */}
        <div className="flex items-center gap-4">
          <Label className="text-xs">Claimed Status:</Label>
          <RadioGroup
            value={filters.claimedStatus}
            onValueChange={(value) =>
              onChange({ ...filters, claimedStatus: value as 'all' | 'claimed' | 'unclaimed' })
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="claimed-all" />
              <Label htmlFor="claimed-all" className="text-xs font-normal cursor-pointer">
                All
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="claimed" id="claimed-yes" />
              <Label htmlFor="claimed-yes" className="text-xs font-normal cursor-pointer">
                Claimed Only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unclaimed" id="claimed-no" />
              <Label htmlFor="claimed-no" className="text-xs font-normal cursor-pointer">
                Unclaimed Only
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          {filters.suits.map((suit) => (
            <Badge key={suit} variant="secondary" className="gap-1">
              Suit: {suit}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('suits', suit)}
              />
            </Badge>
          ))}
          {filters.ranks.map((rank) => (
            <Badge key={rank} variant="secondary" className="gap-1">
              Rank: {rank}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('ranks', rank)}
              />
            </Badge>
          ))}
          {filters.eras.map((era) => (
            <Badge key={era} variant="secondary" className="gap-1">
              Era: {era}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('eras', era)}
              />
            </Badge>
          ))}
          {filters.rarities.map((rarity) => (
            <Badge key={rarity} variant="secondary" className="gap-1">
              Rarity: {rarity}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('rarities', rarity)}
              />
            </Badge>
          ))}
          {filters.statuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              Status: {status}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('statuses', status)}
              />
            </Badge>
          ))}
          {filters.timeValueMin !== null && (
            <Badge variant="secondary" className="gap-1">
              Min Time: {filters.timeValueMin}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('timeValueMin')}
              />
            </Badge>
          )}
          {filters.timeValueMax !== null && (
            <Badge variant="secondary" className="gap-1">
              Max Time: {filters.timeValueMax}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('timeValueMax')}
              />
            </Badge>
          )}
          {filters.traderValues.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1">
              Trader: {value}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('traderValues', value)}
              />
            </Badge>
          ))}
          {filters.claimedStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.claimedStatus === 'claimed' ? 'Claimed Only' : 'Unclaimed Only'}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeFilter('claimedStatus')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
