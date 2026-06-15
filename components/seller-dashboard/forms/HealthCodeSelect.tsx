'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllActiveCodes, type HealthCodeType } from '@/lib/utils/code-validation';
import type { HealthCode } from '@/lib/utils/code-validation';

interface HealthCodeSelectProps {
  value?: string;
  onChange: (value: string) => void;
  codeType: HealthCodeType;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

export const HealthCodeSelect: React.FC<HealthCodeSelectProps> = ({
  value,
  onChange,
  codeType,
  placeholder = 'Select code...',
  id,
  disabled = false,
}) => {
  const [codes, setCodes] = useState<HealthCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        setIsLoading(true);
        const activeCodes = await getAllActiveCodes(codeType);
        setCodes(activeCodes);
      } catch (error) {
        console.error(`Error fetching ${codeType} codes:`, error);
        setCodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCodes();
  }, [codeType]);

  const selectedCode = codes.find((code) => code.code === value);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? '' : selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-mono h-10"
          disabled={disabled || isLoading}
        >
          {selectedCode ? (
            <span>{selectedCode.code}</span>
          ) : (
            <span className="text-muted-foreground">
              {isLoading ? 'Loading codes...' : placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 max-h-[400px] flex flex-col" align="start">
        <Command className="flex flex-col h-full max-h-[400px]">
          <CommandInput placeholder={`Search ${codeType} codes...`} className="h-9 flex-shrink-0" />
          <CommandList className="flex-1 overflow-y-auto min-h-0">
            <CommandEmpty>
              {isLoading
                ? 'Loading codes...'
                : `No ${codeType} codes found.`}
            </CommandEmpty>
            <CommandGroup>
              {codes.map((code) => (
                <CommandItem
                  key={code.id}
                  value={code.code}
                  onSelect={() => handleSelect(code.code)}
                  className="font-mono"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === code.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{code.code}</span>
                    {code.description && (
                      <span className="text-xs text-gray-500 mt-0.5">
                        {code.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
