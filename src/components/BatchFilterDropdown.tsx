import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface BatchFilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function BatchFilterDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}: BatchFilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[140px]"
        >
          <span className="truncate">
            {selected.length > 0
              ? `${label} (${selected.length})`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1 text-xs"
            >
              {selected.length === options.length ? 'Deselect All' : 'Select All'}
            </Button>
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="flex-1 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {options.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option}
                className="flex items-center space-x-2 py-2 px-2 hover:bg-muted/50 rounded cursor-pointer"
                onClick={() => handleToggle(option)}
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => handleToggle(option)}
                />
                <span className="text-sm flex-1">{option}</span>
                {selected.includes(option) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
