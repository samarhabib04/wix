// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

serve(async (req: Request) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, showcase_id } = await req.json();

    // Validate input
    if (!email || !showcase_id) {
      return new Response(
        JSON.stringify({ error: "Email and showcase_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if showcase exists
    const { data: showcase, error: showcaseError } = await supabase
      .from("showcase_listings")
      .select("id, title")
      .eq("id", showcase_id)
      .single();

    if (showcaseError || !showcase) {
      return new Response(
        JSON.stringify({ error: "Showcase listing not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert email into showcase_email_notifications table
    // Unique constraint will prevent duplicates
    const { data: notificationData, error: insertError } = await supabase
      .from("showcase_email_notifications")
      .insert({
        showcase_id: showcase_id,
        email: email.toLowerCase().trim(),
      })
      .select()
      .single();

    if (insertError) {
      // If it's a unique constraint violation, that's okay - user already registered
      if (insertError.code === "23505") {

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Email already registered",
            already_registered: true 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw insertError;
    }


    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email registered successfully",
        already_registered: false 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in showcase-email-notification:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to register email",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
