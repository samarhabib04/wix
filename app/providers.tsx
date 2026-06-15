'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConversationsProvider } from "@/hooks/use-conversations";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ReactNode, useState } from "react";
import { BoostRealtimeSync } from "@/components/BoostRealtimeSync";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BoostRealtimeSync />
      <AuthProvider>
        <ConversationsProvider>
        <CurrencyProvider>
          <CartProvider>
            {children}
            <Toaster />
            <SonnerToaster />
          </CartProvider>
        </CurrencyProvider>
        </ConversationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

