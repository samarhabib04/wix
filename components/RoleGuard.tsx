import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole, isValidRole } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";
import { useRef, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface RoleGuardProps {
  allowedRoles: UserRole['role'][];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  allowedRoles, 
  redirectTo = "/auth/login",
  children 
}) => {
  const router = useRouter();
  const { user, role, isLoading, isEmailVerified, isSigningOut } = useAuth();
  const toastShownRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const [maxWaitTimeReached, setMaxWaitTimeReached] = useState(false);

  useEffect(() => {
    // Maximum wait time of 3 seconds - prevent infinite loading
    const timeoutId = setTimeout(() => {
      setMaxWaitTimeReached(true);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);
  
  // Show loading state while checking authentication or signing out (max 3 seconds)
  if ((isLoading || isSigningOut) && !maxWaitTimeReached) {
    toastShownRef.current = false;
    hasRedirectedRef.current = false;
    return <LoadingSpinner fullPage label="Loading..." />;
  }

  logger.debug("RoleGuard check", { 
    userId: user?.id, 
    role, 
    emailVerified: isEmailVerified, 
    allowedRoles 
  });

  // Handle redirects with useEffect to avoid rendering issues
  useEffect(() => {
    if (hasRedirectedRef.current) return;

    // Wait for auth to load (max 3 seconds)
    if (isLoading && !maxWaitTimeReached) return;

    // If user is not authenticated, redirect to login
    if (!user && maxWaitTimeReached) {
      logger.debug("User not authenticated, redirecting to login");
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast({
          title: "Authentication required",
          description: "Please log in to access this page",
          variant: "destructive",
        });
      }
      hasRedirectedRef.current = true;
      router.replace(redirectTo);
      return;
    }

    // If user's email is not verified, redirect to login
    if (user && !isEmailVerified) {
      logger.debug("User email not verified, redirecting to login");
      toast({
        title: "Email verification required",
        description: "Please verify your email address to access this page",
        variant: "destructive",
      });
      hasRedirectedRef.current = true;
      router.replace(redirectTo);
      return;
    }

    // If user doesn't have the required role, redirect to appropriate dashboard
    if (role && isValidRole(role) && !allowedRoles.includes(role)) {
      logger.debug(`User role ${role} not allowed, redirecting`);
      
      // Show specific message ONLY for admin routes - silent redirect for cross-dashboard access
      const isAdminRoute = allowedRoles.includes('admin');
      if (isAdminRoute) {
        toast({
          title: "Unauthorized access",
          description: "Unauthorized access.",
          variant: "destructive",
        });
      }
      
      // Redirect based on role - if trying to access admin routes, always redirect to home
      let redirectPath = "/";
      if (!isAdminRoute) {
        if (role === "buyer") redirectPath = "/my-buyer-dashboard";
        else if (role === "seller") redirectPath = "/my-seller-dashboard";
        else if (role === "business") redirectPath = "/my-business-dashboard";
        else if (role === "admin") redirectPath = "/admin-dashboard";
      }
      
      hasRedirectedRef.current = true;
      router.replace(redirectPath);
      return;
    }
  }, [user, isEmailVerified, role, allowedRoles, redirectTo, router, isLoading, maxWaitTimeReached]);

  // If redirecting, show loading briefly
  if (hasRedirectedRef.current) {
    return <LoadingSpinner fullPage label="Redirecting..." />;
  }

  // If user has the required role or max wait reached, render the children
  logger.debug("User authorized, rendering content");
  return children ? <>{children}</> : null;
};

export default RoleGuard;
