
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[9999] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Custom tooltip component that works for both mobile and desktop
const IconTooltip = ({
  children,
  content,
  className,
  contentClassName
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) => {
  const [open, setOpen] = React.useState(false);

  // Handle click outside to close the tooltip
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if tooltip is open and if the click is outside of tooltip content
      if (open) {
        setOpen(false);
      }
    };

    // Add event listener when tooltip is open
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener when component unmounts or tooltip closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild onClick={() => setOpen(prev => !prev)}>
          <div className={cn("inline-block cursor-pointer", className)}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          className={cn("max-w-[200px] text-center bg-white border border-gray-100 shadow-md z-[9999]", contentClassName)}
          side="top"
          align="center"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, IconTooltip }
