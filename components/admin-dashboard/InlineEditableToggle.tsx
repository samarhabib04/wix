import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface InlineEditableToggleProps {
  value: boolean;
  label: string;
  onSave: (value: boolean) => Promise<void>;
  className?: string;
  /** Unique id for label/switch pairing (required when multiple toggles share the same page). */
  toggleId: string;
}

export const InlineEditableToggle: React.FC<InlineEditableToggleProps> = ({
  value,
  label,
  onSave,
  className = '',
  toggleId,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleToggle = async (newValue: boolean) => {
    if (newValue === localValue || isSaving) return;

    const previous = localValue;
    setLocalValue(newValue);
    setIsSaving(true);
    try {
      await onSave(newValue);
    } catch (error) {
      setLocalValue(previous);
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch
        id={toggleId}
        checked={localValue}
        onCheckedChange={handleToggle}
        disabled={isSaving}
      />
      <Label htmlFor={toggleId} className="text-sm">
        {label}
      </Label>
    </div>
  );
};
