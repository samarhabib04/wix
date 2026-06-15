import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2 } from 'lucide-react';

interface InlineEditableTextProps {
  value: string | number;
  onSave: (value: string | number) => Promise<void>;
  multiline?: boolean;
  type?: 'text' | 'number';
  className?: string;
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onSave,
  multiline = false,
  type = 'text',
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      setEditValue(value); // Reset on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className={`group flex items-center gap-2 ${className}`}>
        <span className="flex-1">{value}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {multiline ? (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-h-[60px]"
          autoFocus
        />
      ) : (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          autoFocus
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isSaving}
        className="h-6 w-6 p-0 text-brand-light-green hover:text-brand-dark-green"
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={isSaving}
        className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
