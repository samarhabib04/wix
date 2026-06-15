'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function AdminAuthDiagnosticsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const results: any = {};

    try {
      // Test 1: Check if analyze_signup_fraud function exists
      const { data: fraudFunction, error: fraudError } = await supabase
        .rpc('analyze_signup_fraud', {
          email_address: 'test@example.com',
          phone_number: '+1234567890',
          first_name: 'Test',
          last_name: 'User'
        });

      results.fraudFunction = {
        exists: !fraudError,
        error: fraudError?.message,
        result: fraudFunction
      };

      // Test 2: Check if user_profiles table has fraud_flags column
      const { data: profileSchema, error: schemaError } = await supabase
        .from('user_profiles')
        .select('fraud_flags')
        .limit(1);

      results.fraudColumn = {
        exists: !schemaError,
        error: schemaError?.message
      };

      // Test 3: Check if we can create a test user (simulation)
      results.userCreation = {
        note: "This would test user creation but requires admin privileges"
      };

      // Test 4: Check authentication status
      const { data: authUser } = await supabase.auth.getUser();
      results.currentUser = {
        authenticated: !!authUser.user,
        isAdmin: false // Will check this separately
      };

      // Test 5: Check if current user is admin
      const { data: isAdmin } = await supabase.rpc('is_current_user_admin');
      results.currentUser.isAdmin = isAdmin;

      setDiagnostics(results);
      toast.success("Diagnostics completed");
    } catch (error: any) {
      toast.error(`Diagnostics failed: ${error.message}`);
      setDiagnostics({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatus = (condition: boolean, error?: string) => {
    if (error) {
      return (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Failed</span>
          <Badge variant="destructive" className="text-xs">{error}</Badge>
        </div>
      );
    }
    
    return condition ? (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-green-600">OK</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-destructive">Failed</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auth Diagnostics</h1>
        <p className="text-muted-foreground">Verify authentication system health and signup functions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            System Diagnostics
          </CardTitle>
          <CardDescription>
            Run comprehensive checks on the authentication system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runDiagnostics} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Running Diagnostics..." : "Run Auth Diagnostics"}
          </Button>

          {diagnostics && (
            <div className="space-y-4 mt-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold">Fraud Detection Function</h3>
                <div className="flex items-center justify-between">
                  <span>analyze_signup_fraud exists:</span>
                  {renderStatus(diagnostics.fraudFunction?.exists, diagnostics.fraudFunction?.error)}
                </div>
                {diagnostics.fraudFunction?.result && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Function returned: {JSON.stringify(diagnostics.fraudFunction.result, null, 2)}
                  </div>
                )}
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold">Database Schema</h3>
                <div className="flex items-center justify-between">
                  <span>fraud_flags column exists:</span>
                  {renderStatus(diagnostics.fraudColumn?.exists, diagnostics.fraudColumn?.error)}
                </div>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-semibold">Current User Status</h3>
                <div className="flex items-center justify-between">
                  <span>User authenticated:</span>
                  {renderStatus(diagnostics.currentUser?.authenticated)}
                </div>
                <div className="flex items-center justify-between">
                  <span>User is admin:</span>
                  {renderStatus(diagnostics.currentUser?.isAdmin)}
                </div>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold">User Creation</h3>
                <div className="text-sm text-muted-foreground">
                  {diagnostics.userCreation?.note}
                </div>
              </div>

              {diagnostics.error && (
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-destructive">System Error</h3>
                  <div className="text-sm text-destructive">
                    {diagnostics.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




























