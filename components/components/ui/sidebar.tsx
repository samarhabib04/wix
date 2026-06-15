
import * as React from "react";
import { cn } from "@/lib/utils";

const SidebarContext = React.createContext<{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  collapsedWidth: number;
  toggleCollapsed?: () => void;  // Added toggleCollapsed as optional
}>({
  collapsed: false,
  setCollapsed: () => {},
  collapsedWidth: 0,
});

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsedWidth?: number;
  collapsible?: boolean;
}

export function SidebarProvider({
  children,
  collapsed: controlledCollapsed,
  onCollapsedChange: setControlledCollapsed,
  defaultCollapsed = false,
  collapsedWidth = 0,
  collapsible = true,
  ...props
}: SidebarProviderProps) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(defaultCollapsed);

  const collapsed = controlledCollapsed ?? uncontrolledCollapsed;
  const setCollapsed = setControlledCollapsed ?? setUncontrolledCollapsed;

  const toggleCollapsed = React.useCallback(() => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  }, [collapsed, setCollapsed, collapsible]);

  const context = {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    collapsedWidth,
  };

  return (
    <SidebarContext.Provider value={context} {...props}>
      {children}
    </SidebarContext.Provider>
  );
}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { collapsible?: boolean }
>(({ className, collapsible, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col overflow-y-auto border-r bg-sidebar-background text-sidebar-foreground h-screen",
        className
      )}
      {...props}
    />
  );
});
Sidebar.displayName = "Sidebar";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-14 items-center border-b px-6", className)}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("flex-1 overflow-auto py-2", className)} {...props} />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center border-t p-4", className)}
      {...props}
    />
  );
});
SidebarFooter.displayName = "SidebarFooter";

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className
      )}
      onClick={toggleCollapsed}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="h-4 w-4"
      >
        {collapsed ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
          />
        )}
      </svg>
      <span className="sr-only">
        {collapsed ? "Expand sidebar" : "Collapse sidebar"}
      </span>
    </button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ className, open, defaultOpen, onOpenChange, ...props }, ref) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? true
  );

  const isOpen = open ?? uncontrolledOpen;
  const setIsOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <div
      ref={ref}
      data-state={isOpen ? "open" : "closed"}
      className={cn("flex flex-col py-2", className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-10 items-center px-6", className)}
      {...props}
    />
  );
});
SidebarGroupHeader.displayName = "SidebarGroupHeader";

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("text-xs font-medium text-sidebar-foreground/60", className)}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-1 overflow-auto pb-1.5 pt-2.5", className)}
      {...props}
    />
  );
});
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1 px-2", className)}
      {...props}
    />
  );
});
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("", className)} {...props} />;
});
SidebarMenuItem.displayName = "SidebarMenuItem";

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button";
  return (
    <Comp
      ref={asChild ? undefined : (ref as any)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupHeader,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
};
