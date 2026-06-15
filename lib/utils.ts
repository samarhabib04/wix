import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced debugging helper for Supabase operations with more detailed client info
export async function logSupabaseOperation(operation: string, result: any, error?: any) {
  const timestamp = new Date().toISOString();
  const success = !error;
  
  // Basic device detection (only in browser)
  let deviceInfo: any = {};
  if (typeof window !== 'undefined') {
    const isMobile = window.innerWidth < 768;
    deviceInfo = {
      width: window.innerWidth,
      height: window.innerHeight,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile,
      connectionType: (navigator as any).connection ? (navigator as any).connection.effectiveType : 'unknown'
    };
  }
  
  if (!success) {
    console.error('Error:', error);
    if (error?.message) {
      console.error('Message:', error.message);
    }
    if (error?.code) {
      console.error('Code:', error.code);
    }
    if (error?.details) {
      console.error('Details:', error.details);
    }
  }
  
  return { success, result, error, deviceInfo };
}
































