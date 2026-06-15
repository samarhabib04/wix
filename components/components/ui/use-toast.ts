
// Import directly from the hooks file to avoid circular dependency
import { useToast as useToastHook, toast as toastFunction, ToastProps } from "@/hooks/use-toast";

// Re-export with different names to avoid naming conflicts
export const useToast = useToastHook;
export const toast = toastFunction;
export type { ToastProps };
