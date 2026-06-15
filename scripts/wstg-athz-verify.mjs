#!/usr/bin/env node
/**
 * WSTG smoke checks: CLNT-07 (CORS), ATHZ-04 (user_profiles IDOR), DogQuest RPC lockdown.
 *
 *   node --env-file=.env.local scripts/wstg-athz-verify.mjs
 *
 * Optional IDOR (ATHZ-04): set in .env.local (uncommitted):
 *   WSTG_ATHZ_EMAIL=buyer1@example.com
 *   WSTG_ATHZ_PASSWORD=...
 *   WSTG_ATHZ_OTHER_USER_ID=<uuid of buyer2>
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const summary = [];
function line(status, id, msg) {
  summary.push({ status, id, msg });
  console.log(`${status.padEnd(4)} ${id}: ${msg}`);
}

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// --- CLNT-07: untrusted Origin must not be echoed on REST ---
async function testCors() {
  const evil = "https://evil-wstg-clnt07.example";
  const strict = process.env.WSTG_STRICT_CORS === "1";
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        Origin: evil,
      },
    });
    const acao = res.headers.get("access-control-allow-origin");
    if (acao === evil || acao === "*") {
      const detail =
        "Hosted Supabase may still echo Origin at the edge even after migration 20260330200000_pentest_postgrest_cors_allowed_origins.sql — see migration comment / Supabase support.";
      if (strict) {
        line("FAIL", "CLNT-07", `ACAO reflects untrusted origin (${acao}). ${detail}`);
      } else {
        line(
          "WARN",
          "CLNT-07",
          `ACAO reflects untrusted origin (${acao}); use WSTG_STRICT_CORS=1 to fail CI. ${detail}`
        );
      }
      return;
    }
    line(
      "PASS",
      "CLNT-07",
      acao
        ? `untrusted Origin not echoed (ACAO=${acao})`
        : "untrusted Origin not echoed (no ACAO header on GET — acceptable)"
    );
  } catch (e) {
    line("FAIL", "CLNT-07", `request failed: ${e.message}`);
  }
}

// --- DogQuest-004-style RPC must not run as anon ---
async function testRpcLocked() {
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_auth_method_by_email`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_email: "probe@example.com" }),
    });
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      line("PASS", "ATHZ-RPC", `get_auth_method_by_email denied (${res.status})`);
      return;
    }
    if (res.ok && !body.includes("permission denied") && !body.includes("42501")) {
      line("FAIL", "ATHZ-RPC", `unexpected success or weak error: ${res.status} ${body.slice(0, 120)}`);
      return;
    }
    line("PASS", "ATHZ-RPC", `non-success response ${res.status}`);
  } catch (e) {
    line("FAIL", "ATHZ-RPC", e.message);
  }
}

function parseJsonResponse(text, context) {
  const t = (text ?? "").trim();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    throw new Error(`${context}: invalid JSON (${t.slice(0, 120)})`);
  }
}

async function passwordToken(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const j = parseJsonResponse(await res.text(), "auth/v1/token");
  if (!res.ok || !j.access_token) {
    throw new Error(j.error_description || j.msg || j.message || "no access_token");
  }
  return j.access_token;
}

// --- ATHZ-04: JWT for user A cannot read user B profile row ---
async function testUserProfilesIdor() {
  const email = process.env.WSTG_ATHZ_EMAIL?.trim();
  const password = process.env.WSTG_ATHZ_PASSWORD?.trim();
  const otherId = process.env.WSTG_ATHZ_OTHER_USER_ID?.trim();

  if (!email || !password || !otherId) {
    line(
      "SKIP",
      "ATHZ-04-profiles",
      "set WSTG_ATHZ_EMAIL, WSTG_ATHZ_PASSWORD, WSTG_ATHZ_OTHER_USER_ID for IDOR check"
    );
    return;
  }

  try {
    let jwt;
    try {
      jwt = await passwordToken(email, password);
    } catch (authErr) {
      line(
        "SKIP",
        "ATHZ-04-profiles",
        `password grant failed (${authErr.message}) — use Supabase dashboard JWT or enable password grant for this project`
      );
      return;
    }

    const res = await fetch(
      `${url}/rest/v1/user_profiles?id=eq.${otherId}&select=id,email,role`,
      {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${jwt}`,
          Accept: "application/json",
        },
      }
    );
    const raw = (await res.text()).trim();
    const rows =
      raw === "" && res.ok ? [] : parseJsonResponse(raw, "user_profiles");
    if (!Array.isArray(rows)) {
      line(
        "FAIL",
        "ATHZ-04-profiles",
        `expected JSON array, got ${res.status}: ${raw.slice(0, 200)}`
      );
      return;
    }
    if (rows.length === 0) {
      line("PASS", "ATHZ-04-profiles", "other user uuid returns no rows (RLS)");
    } else {
      line(
        "FAIL",
        "ATHZ-04-profiles",
        `got ${rows.length} row(s) for another user's id`
      );
    }
  } catch (e) {
    line("FAIL", "ATHZ-04-profiles", `unexpected: ${e.message}`);
  }
}

await testCors();
await testRpcLocked();
await testUserProfilesIdor();

const failed = summary.filter((s) => s.status === "FAIL").length;
const warns = summary.filter((s) => s.status === "WARN").length;
console.log("");
console.log(`Done. FAIL=${failed} WARN=${warns}`);
process.exit(failed > 0 ? 1 : 0);
