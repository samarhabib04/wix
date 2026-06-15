
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { isPasswordProtectionEnabled } from "@/config/environment";

interface PasswordProtectionProps {
  children: React.ReactNode;
}

const PasswordProtection: React.FC<PasswordProtectionProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if password protection is enabled for this environment
    const passwordProtectionEnabled = isPasswordProtectionEnabled();
    
    if (!passwordProtectionEnabled) {
      // Skip password protection for development/staging
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // Verify session token with backend
    const verifySession = async () => {
      const sessionToken = sessionStorage.getItem('dq_session_token');
      
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-session', {
          body: { sessionToken }
        });

        if (error) {
          console.error('Session verification error:', error);
          sessionStorage.removeItem('dq_session_token');
          setIsLoading(false);
          return;
        }

        if (data?.valid) {
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem('dq_session_token');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        sessionStorage.removeItem('dq_session_token');
      }
      
      setIsLoading(false);
    };

    verifySession();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-access-code', {
        body: { password }
      });

      if (error) {
        throw error;
      }

      if (data?.valid) {
        // Store session token from backend
        if (data.sessionToken) {
          sessionStorage.setItem('dq_session_token', data.sessionToken);
        }
        setIsAuthenticated(true);
        toast({
          title: "Access granted",
          description: "Welcome to Dog Quest!",
        });
      } else if (data?.rateLimited) {
        toast({
          variant: "destructive",
          title: "Too many attempts",
          description: data.error || "Please try again later.",
        });
        setPassword('');
      } else {
        toast({
          variant: "destructive",
          title: "Access denied",
          description: "Incorrect password. Please try again.",
        });
        setPassword('');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dq_session_token');
    setIsAuthenticated(false);
    setPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#344C3D] to-[#738A6E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="relative">
        {children}
        {/* Hidden logout button for testing - remove in production */}
        {isPasswordProtectionEnabled() && (
          <button
            onClick={handleLogout}
            className="fixed bottom-4 right-4 opacity-10 hover:opacity-100 transition-opacity text-xs bg-gray-200 px-2 py-1 rounded"
            style={{ zIndex: 9999 }}
          >
            Logout
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-soft-green flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Dog Quest Logo */}
        <div className="mb-8">
          <img
            src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/home-page/DogQuest-home-logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZDM1YWQwOS05Mjk3LTRlZTktYjM2Yi1hZDUyMmE1YmRhNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJob21lLXBhZ2UvRG9nUXVlc3QtaG9tZS1sb2dvLnBuZyIsImlhdCI6MTc1MTIyOTE2MSwiZXhwIjoyMzgxOTQ5MTYxfQ.CB0DuWcxhs9d1CMRB36TIHP9PfMMV71sfFaw75vwT_Y"
            alt="Dog Quest Logo"
            className="w-auto h-32 mx-auto mb-4 object-contain"
          />
        </div>

        {/* Coming Soon Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#344C3D] mb-3">Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            We're putting the finishing touches on Ireland's premier dog community platform. 
            Enter the access code below to preview our site.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter access code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-center"
              autoFocus
              disabled={isValidating}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white"
            disabled={!password || isValidating}
          >
            {isValidating ? 'Validating...' : 'Enter Site'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Your trusted companion in finding the perfect dog
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordProtection;
