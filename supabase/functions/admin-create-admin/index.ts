import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  authenticateAdmin,
  createErrorResponse,
} from "../_shared/auth-helpers.ts";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminAuth = await authenticateAdmin(req);
  if (!adminAuth.success) {
    return createErrorResponse(adminAuth.error, corsHeaders);
  }

  let body: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    userId?: string;
    action?: "create" | "promote";
  } = {};

  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const action = body.action === "promote" ? "promote" : "create";

  if (action === "promote") {
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, role, is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (lookupErr || !existing) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.role === "admin" || existing.is_admin === true) {
      return new Response(
        JSON.stringify({ error: "User is already an administrator" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from("user_profiles")
      .update({
        role: "admin",
        is_admin: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateErr) {
      console.error("admin-create-admin promote:", updateErr);
      return new Response(
        JSON.stringify({ error: updateErr.message || "Failed to promote user" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        action: "promote",
        userId,
        email: existing.email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = typeof body.firstName === "string"
    ? body.firstName.trim()
    : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "A valid email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!password || password.length < 8) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 8 characters" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, role, is_admin, first_name, last_name")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    if (
      existingProfile.role === "admin" || existingProfile.is_admin === true
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "ALREADY_ADMIN",
          error: "This email already belongs to an administrator.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const displayName = [existingProfile.first_name, existingProfile.last_name]
      .filter((s) => typeof s === "string" && s.trim())
      .join(" ")
      .trim();

    return new Response(
      JSON.stringify({
        ok: false,
        code: "USER_EXISTS",
        message: "This email is already registered on the platform.",
        existingUser: {
          userId: existingProfile.id,
          email: existingProfile.email ?? email,
          role: existingProfile.role ?? "buyer",
          displayName: displayName || null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (createError) {
    const msg = createError.message ?? "Failed to create user";
    const status = msg.toLowerCase().includes("already") ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "User created but no ID returned" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: userId,
        email,
        role: "admin",
        is_admin: true,
        auth_method: "email_password",
        profile_complete: true,
        newsletter_opt_in: false,
        first_name: firstName,
        last_name: lastName,
        phone: "",
        county: "",
        business_name: "",
        seller_id: "",
        dbe_id: "",
        avatar_url: null,
        status: "active",
        is_suspended: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("admin-create-admin profile:", profileError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return new Response(
      JSON.stringify({
        error: profileError.message || "Failed to create admin profile",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      action: "create",
      userId,
      email,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
