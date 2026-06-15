
'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  loading: boolean;
}

interface SubscriptionContextType {
  subscription: SubscriptionData;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    loading: false,
  });

  const mounted = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserRef = useRef<string | null>(null);

  const refreshSubscription = async () => {
    // Only proceed if we have a user and component is mounted
    if (!mounted.current || !user?.id) {
      return;
    }

    try {
      setSubscription(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      // Double-check we still have the same user and component is mounted
      if (!mounted.current || !user?.id || currentUserRef.current !== user.id) {
        return;
      }

      if (error) {
        setSubscription(prev => ({ 
          ...prev, 
          loading: false,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null
        }));
        return;
      }

      setSubscription({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier || null,
        subscription_end: data.subscription_end || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      if (mounted.current && user?.id && currentUserRef.current === user.id) {
        setSubscription(prev => ({ 
          ...prev, 
          loading: false,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null
        }));
      }
    }
  };

  // Handle user authentication changes
  useEffect(() => {
    // Clear any existing timeouts and intervals
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (user?.id) {
      // User is authenticated
      currentUserRef.current = user.id;
      
      // Refresh subscription after a short delay
      refreshTimeoutRef.current = setTimeout(() => {
        if (mounted.current && user?.id && currentUserRef.current === user.id) {
          refreshSubscription();
        }
      }, 500);

      // Set up auto-refresh interval only for subscription pages
      intervalRef.current = setInterval(() => {
        if (mounted.current && user?.id && currentUserRef.current === user.id && 
            window.location.pathname.includes('/subscription')) {
          refreshSubscription();
        }
      }, 30000);
    } else {
      // User is not authenticated, clear subscription data immediately
      currentUserRef.current = null;
      setSubscription({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        loading: false,
      });
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
      currentUserRef.current = null;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ subscription, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
