'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SuspensionMessageProps {
  suspensionReason?: string | null;
  suspendedAt?: string | null;
}

export default function SuspensionMessage({ 
  suspensionReason, 
  suspendedAt 
}: SuspensionMessageProps) {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      window.location.replace('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Account Suspended
          </CardTitle>
          <CardDescription className="mt-2">
            Your account has been suspended and you cannot access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suspensionReason && (
            <div className="rounded-lg bg-gray-100 p-4">
              <p className="text-sm font-medium text-gray-900 mb-1">Reason:</p>
              <p className="text-sm text-gray-700">{suspensionReason}</p>
            </div>
          )}
          
          {suspendedAt && (
            <p className="text-xs text-gray-500 text-center">
              Suspended on: {new Date(suspendedAt).toLocaleDateString()}
            </p>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 text-center mb-4">
              If you believe this is an error, please contact our support team for assistance.
            </p>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
