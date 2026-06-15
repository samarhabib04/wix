import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  authenticateAdmin,
  authenticateUser,
  createErrorResponse,
} from "../_shared/auth-helpers.ts";
import { corsHeadersForRequest } from "../_shared/cors-headers.ts";

/** Loose UUID v4-style check (hex + dashes). */
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
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

  let body: { userId?: string } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestedRaw = typeof body.userId === "string" ? body.userId.trim() : "";

  const userAuth = await authenticateUser(req);
  if (!userAuth.success) {
    return createErrorResponse(userAuth.error, corsHeaders);
  }

  const callerId = userAuth.data.user.id;
  let targetId: string;

  if (requestedRaw) {
    if (!isUuid(requestedRaw)) {
      return new Response(JSON.stringify({ error: "Invalid userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (requestedRaw !== callerId) {
      const adminAuth = await authenticateAdmin(req);
      if (!adminAuth.success) {
        return createErrorResponse(adminAuth.error, corsHeaders);
      }
      targetId = requestedRaw;
    } else {
      targetId = callerId;
    }
  } else {
    // Self-service: AccountSettings / BuyerSettings / SellerSettings — no userId in body
    targetId = callerId;
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

  const { data: targetProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, is_admin, email")
    .eq("id", targetId)
    .maybeSingle();

  const targetIsAdmin =
    !!targetProfile &&
    (targetProfile.role === "admin" || targetProfile.is_admin === true);

  if (targetIsAdmin) {
    const { data: adminRows, error: adminListError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .or("role.eq.admin,is_admin.eq.true");

    if (!adminListError && adminRows && adminRows.length <= 1) {
      return new Response(
        JSON.stringify({
          error: "Cannot delete the last administrator account",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  const { data: preAuth } = await supabaseAdmin.auth.admin.getUserById(targetId);
  const authUserPresent = !!preAuth?.user;

  const deletedEmail =
    (typeof preAuth?.user?.email === "string" && preAuth.user.email) ||
    (typeof targetProfile?.email === "string" && targetProfile.email) ||
    null;
  const actorEmail =
    typeof userAuth.data.user.email === "string"
      ? userAuth.data.user.email
      : null;
  const deletionSource =
    requestedRaw && requestedRaw !== callerId ? "admin" : "self_service";

  // Delete public profile *before* auth.users. GoTrue often returns
  // "Database error deleting user" when auth delete runs while user_profiles
  // (and triggers/FKs) are still present; profile-first avoids that ordering.
  const { error: profileDelErr } = await supabaseAdmin
    .from("user_profiles")
    .delete()
    .eq("id", targetId);

  if (profileDelErr) {
    console.error(
      "delete-user-account: user_profiles delete failed:",
      profileDelErr,
    );
    return new Response(
      JSON.stringify({
        error:
          profileDelErr.message ||
          "Could not remove user profile (check foreign keys to user_profiles)",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (authUserPresent) {
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(
      targetId,
    );

    if (deleteErr) {
      const { data: verify } = await supabaseAdmin.auth.admin.getUserById(
        targetId,
      );
      if (verify?.user) {
        console.error("delete-user-account auth.admin.deleteUser:", deleteErr);
        return new Response(
          JSON.stringify({
            error:
              deleteErr.message ||
              "Failed to delete auth user (check Authentication logs in Supabase)",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      console.warn(
        "delete-user-account: deleteUser error but auth user removed:",
        deleteErr.message,
      );
    }
  } else {
    console.warn(
      "delete-user-account: no auth.users row; profile row removed only",
      targetId,
    );
  }

  const { error: auditErr } = await supabaseAdmin
    .from("account_deletion_audit")
    .insert({
      deleted_user_id: targetId,
      deleted_email: deletedEmail,
      actor_user_id: callerId,
      actor_email: actorEmail,
      source: deletionSource,
    });

  if (auditErr) {
    console.error("delete-user-account: account_deletion_audit insert failed:", auditErr);
  }

  return new Response(JSON.stringify({ ok: true, deletedId: targetId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
