import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_OPTIONS } from './utils';

interface TemplateFormProps {
  baseName: string;
  onBaseNameChange: (value: string) => void;
  imageCode: string;
  onImageCodeChange: (value: string) => void;
  namePattern: string;
  onNamePatternChange: (value: string) => void;
  descriptionPattern: string;
  onDescriptionPatternChange: (value: string) => void;
  defaultStatus: string;
  onDefaultStatusChange: (value: string) => void;
}

export function TemplateForm({
  baseName,
  onBaseNameChange,
  imageCode,
  onImageCodeChange,
  namePattern,
  onNamePatternChange,
  descriptionPattern,
  onDescriptionPatternChange,
  defaultStatus,
  onDefaultStatusChange,
}: TemplateFormProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
      <h3 className="text-lg font-semibold">Base Template</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="baseName">Character Name *</Label>
          <Input
            id="baseName"
            value={baseName}
            onChange={(e) => onBaseNameChange(e.target.value)}
            placeholder="e.g., Anubis"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="imageCode">Image Code *</Label>
          <Input
            id="imageCode"
            value={imageCode}
            onChange={(e) => onImageCodeChange(e.target.value)}
            placeholder="e.g., anubis_01"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="namePattern">Naming Pattern *</Label>
        <Input
          id="namePattern"
          value={namePattern}
          onChange={(e) => onNamePatternChange(e.target.value)}
          placeholder="e.g., {rank} {baseName} of {suit}"
        />
        <p className="text-xs text-muted-foreground">
          Variables: {'{rank}'}, {'{baseName}'}, {'{suit}'}, {'{era}'}, {'{rarity}'}
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="descriptionPattern">Description Pattern</Label>
        <Textarea
          id="descriptionPattern"
          value={descriptionPattern}
          onChange={(e) => onDescriptionPatternChange(e.target.value)}
          placeholder="e.g., A {era} era {rank} featuring {baseName}"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Optional: Same variables as naming pattern
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="defaultStatus">Default Status</Label>
        <Select value={defaultStatus} onValueChange={onDefaultStatusChange}>
          <SelectTrigger id="defaultStatus">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
