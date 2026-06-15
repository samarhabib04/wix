'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface MobileFiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onReset: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Mobile filter sheet with clear Close (X) and Apply actions — not only backdrop tap. */
export function MobileFiltersDrawer({
  open,
  onOpenChange,
  trigger,
  onReset,
  title = 'Filters',
  children,
}: MobileFiltersDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="flex max-h-[92vh] flex-col">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between border-b border-gray-200 pb-3 text-left">
          <DrawerTitle className="font-berkshire text-xl text-brand-dark-green">
            {title}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          {children}
        </div>

        <DrawerFooter className="shrink-0 gap-2 border-t border-gray-200 bg-white pt-4">
          <DrawerClose asChild>
            <Button
              type="button"
              className="w-full bg-brand-dark-green hover:bg-brand-soft-green"
            >
              Apply filters
            </Button>
          </DrawerClose>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
          >
            Reset filters
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
