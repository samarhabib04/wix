'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  validateHealthCodeRealtime,
  type HealthCodeType,
  type ListingCodeOwnerType,
} from '@/lib/utils/code-validation';

interface HealthCodeInputProps {
  value?: string;
  onChange: (value: string) => void;
  codeType: HealthCodeType;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  excludeListingId?: string;
  excludeListingType?: ListingCodeOwnerType;
}

export const HealthCodeInput: React.FC<HealthCodeInputProps> = ({
  value = '',
  onChange,
  codeType,
  placeholder = 'Enter code...',
  id,
  disabled = false,
  onValidationChange,
  excludeListingId,
  excludeListingType,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationState, setValidationState] = useState<
    'idle' | 'valid' | 'invalid' | 'reused' | 'format-invalid'
  >('idle');
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedValueRef = useRef<string>('');

  const formatRegex = /^[A-Z0-9]{12}$/;
  const isValidFormat = formatRegex.test(value);

  const validationContext =
    excludeListingId && excludeListingType
      ? { excludeListingId, excludeListingType }
      : undefined;

  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!value || value.trim() === '') {
      setValidationState('idle');
      onValidationChange?.(false);
      return;
    }

    if (!isValidFormat) {
      setValidationState('format-invalid');
      onValidationChange?.(false);
      return;
    }

    if (value === lastValidatedValueRef.current) {
      return;
    }

    setIsValidating(true);
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await validateHealthCodeRealtime(value, codeType, validationContext);
        if (result.isReused) {
          setValidationState('reused');
          onValidationChange?.(false);
        } else if (result.isValid) {
          setValidationState('valid');
          onValidationChange?.(true);
        } else {
          setValidationState('invalid');
          onValidationChange?.(false);
        }
        lastValidatedValueRef.current = value;
      } catch (error) {
        console.error('Error validating health code:', error);
        setValidationState('invalid');
        onValidationChange?.(false);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value, codeType, isValidFormat, onValidationChange, excludeListingId, excludeListingType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().replace(/\s/g, '');
    const limitedValue = newValue.slice(0, 12);
    onChange(limitedValue);

    if (limitedValue !== lastValidatedValueRef.current) {
      setValidationState('idle');
    }
  };

  const handleBlur = () => {
    if (isValidFormat && value !== lastValidatedValueRef.current) {
      setIsValidating(true);
      validateHealthCodeRealtime(value, codeType, validationContext)
        .then((result) => {
          if (result.isReused) {
            setValidationState('reused');
            onValidationChange?.(false);
          } else if (result.isValid) {
            setValidationState('valid');
            onValidationChange?.(true);
          } else {
            setValidationState('invalid');
            onValidationChange?.(false);
          }
          lastValidatedValueRef.current = value;
        })
        .catch((error) => {
          console.error('Error validating health code:', error);
          setValidationState('invalid');
          onValidationChange?.(false);
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  };

  const getInputClassName = () => {
    if (validationState === 'valid') {
      return 'border-green-500 focus:border-green-500 focus:ring-green-500';
    }
    if (
      validationState === 'invalid' ||
      validationState === 'reused' ||
      validationState === 'format-invalid'
    ) {
      return 'border-red-500 focus:border-red-500 focus:ring-red-500';
    }
    return '';
  };

  const showValidationIcon = value && value.length > 0 && !isValidating;
  const showLoadingIcon = isValidating;

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={12}
        className={cn('font-mono pr-10', getInputClassName())}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {showLoadingIcon && (
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        )}
        {showValidationIcon && validationState === 'valid' && (
          <Check className="h-4 w-4 text-green-500" />
        )}
        {showValidationIcon &&
          (validationState === 'invalid' ||
            validationState === 'reused' ||
            validationState === 'format-invalid') && (
            <X className="h-4 w-4 text-red-500" />
          )}
      </div>
      {validationState === 'format-invalid' && value.length === 12 && (
        <p className="text-xs text-red-500 mt-1">
          Code must be exactly 12 alphanumeric characters
        </p>
      )}
      {validationState === 'reused' && isValidFormat && (
        <p className="text-xs text-red-500 mt-1">
          This code is already used on another live ad. Each code can only be used once.
        </p>
      )}
      {validationState === 'invalid' && isValidFormat && (
        <p className="text-xs text-red-500 mt-1">
          Code not found in database. Please check with your vet.
        </p>
      )}
    </div>
  );
};
