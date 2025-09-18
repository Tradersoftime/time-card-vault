import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface SortableTableHeaderProps {
  label: string;
  active?: boolean;
  direction?: 'asc' | 'desc';
  onClick?: () => void;
  className?: string;
}

export function SortableTableHeader({ 
  label, 
  active = false, 
  direction = 'asc', 
  onClick,
  className 
}: SortableTableHeaderProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getSortIcon = () => {
    if (!active) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    return direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        active && "bg-muted/30",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-medium",
          active && "text-primary"
        )}>
          {label}
        </span>
        {getSortIcon()}
      </div>
    </TableHead>
  );
}