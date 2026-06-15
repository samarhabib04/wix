import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option {
  value: string;
  label: string;
}

interface InlineEditableSelectProps {
  value: string;
  options: Option[];
  onSave: (value: string) => Promise<void>;
  className?: string;
}

export const InlineEditableSelect: React.FC<InlineEditableSelectProps> = ({
  value,
  options,
  onSave,
  className = ''
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleValueChange = async (newValue: string) => {
    if (newValue === value) return;

    setIsSaving(true);
    try {
      await onSave(newValue);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      disabled={isSaving}
    >
      <SelectTrigger className={`w-auto min-w-[120px] ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
