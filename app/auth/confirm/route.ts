import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // For recovery flow, always redirect to reset-password
      if (type === 'recovery' || next.includes('reset-password')) {
        return NextResponse.redirect(new URL('/auth/reset-password', request.url));
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If code exchange failed or no code, check for token_hash (email OTP flow)
  const tokenHash = searchParams.get('token_hash');
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash: tokenHash,
    });

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/reset-password', request.url));
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Fallback: redirect to error or login page
  return NextResponse.redirect(
    new URL('/auth/login?error=auth_callback_error', request.url)
  );
}
