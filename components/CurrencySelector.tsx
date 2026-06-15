
import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCIES } from '@/services/currencyService';

const CurrencySelector: React.FC = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{CURRENCIES[currency].symbol}</span>
          <span className="text-xs">{currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setCurrency('EUR')}
          className={currency === 'EUR' ? 'bg-muted' : ''}
        >
          <div className="flex items-center justify-between w-full">
            <span>🇪🇺 Euro (EUR)</span>
            <span className="ml-2">€</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setCurrency('GBP')}
          className={currency === 'GBP' ? 'bg-muted' : ''}
        >
          <div className="flex items-center justify-between w-full">
            <span>🇬🇧 British Pound (GBP)</span>
            <span className="ml-2">£</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CurrencySelector;
