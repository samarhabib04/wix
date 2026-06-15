import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AuthResult {
  user: any;
  profile?: any;
}

export interface AuthError {
  status: number;
  message: string;
}

/**
 * Authenticates a user from the Authorization header
 */
export async function authenticateUser(req: Request): Promise<{ success: true; data: AuthResult } | { success: false; error: AuthError }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      success: false,
      error: {
        status: 401,
        message: 'Authorization header required'
      }
    };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return {
      success: false,
      error: {
        status: 401,
        message: 'Invalid or expired token'
      }
    };
  }

  return {
    success: true,
    data: { user }
  };
}

/**
 * Authenticates a user and verifies admin role
 */
export async function authenticateAdmin(req: Request): Promise<{ success: true; data: AuthResult } | { success: false; error: AuthError }> {
  const authResult = await authenticateUser(req);
  
  if (!authResult.success) {
    return authResult;
  }

  const { user } = authResult.data;

  // Check admin permissions using service role
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || (!profile?.is_admin && profile?.role !== 'admin')) {
    return {
      success: false,
      error: {
        status: 403,
        message: 'Admin access required'
      }
    };
  }

  return {
    success: true,
    data: { user, profile }
  };
}

/**
 * Creates standardized error response
 */
export function createErrorResponse(error: AuthError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      error: error.message,
      status: error.status
    }),
    {
      status: error.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
