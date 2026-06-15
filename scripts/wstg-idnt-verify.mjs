#!/usr/bin/env node
/**
 * WSTG-IDNT-01..04 smoke checks (API + repo).
 *
 * Run from repo root:
 *   node --env-file=.env.local scripts/wstg-idnt-verify.mjs
 *
 * Optional (stronger IDNT-04): set WSTG_IDNT_TEST_EMAIL to a real account email;
 * uses WSTG_IDNT_TEST_WRONG_PASSWORD or default wrong password. Never commit secrets.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const summary = [];

function record(id, status, msg) {
  summary.push({ id, status, msg });
  console.log(`${status.padEnd(4)} ${id}: ${msg}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

// --- IDNT-01: role definitions (repo + doc) ---
const rolePath = path.join(root, "lib/security/role-definitions.ts");
const docPath = path.join(root, "docs/security/WSTG-IDNT-01-through-04.md");
try {
  const roleSrc = fs.readFileSync(rolePath, "utf8");
  if (
    roleSrc.includes("REGISTRATION_ROLES") &&
    roleSrc.includes("APPLICATION_ROLES")
  ) {
    record("IDNT-01", "PASS", "role-definitions.ts exports application + registration roles");
  } else {
    record("IDNT-01", "FAIL", "role-definitions.ts missing expected exports");
  }
} catch {
  record("IDNT-01", "FAIL", "could not read lib/security/role-definitions.ts");
}

if (fs.existsSync(docPath)) {
  record("IDNT-01-doc", "PASS", "docs/security/WSTG-IDNT-01-through-04.md present");
} else {
  record("IDNT-01-doc", "FAIL", "security doc missing");
}

async function fetchProfileRow(userId) {
  if (!service) return { ok: false, reason: "no_service_role" };
  const res = await fetch(
    `${url}/rest/v1/user_profiles?id=eq.${userId}&select=role,is_admin,profile_complete`,
    {
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
      },
    }
  );
  const rows = await res.json();
  if (!res.ok) {
    return { ok: false, reason: `rest_${res.status}`, body: rows };
  }
  const row = Array.isArray(rows) ? rows[0] : null;
  return { ok: true, row };
}

// --- IDNT-02 + IDNT-03: signup with malicious admin metadata → DB row must not be admin ---
async function testProvisioningAndRegistrationRole() {
  const email = `wstg-idnt-${Date.now()}@dogquest-wstg.invalid`;
  const password = `Wstg!${Date.now()}Aa9z`;

  const signupRes = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        role: "admin",
        first_name: "W",
        last_name: "STG",
      },
    }),
  });

  const signupJson = await signupRes.json();
  const uid = signupJson?.user?.id;

  if (!uid) {
    record(
      "IDNT-02",
      "SKIP",
      "signup returned no user id (email confirmation or policy). Set SUPABASE_SERVICE_ROLE_KEY and ensure test project allows signup session, or confirm email for this test user."
    );
    record(
      "IDNT-03",
      "SKIP",
      "depends on successful signup user id (same as IDNT-02)"
    );
    return;
  }

  if (!service) {
    record(
      "IDNT-02",
      "SKIP",
      "have user id but no SUPABASE_SERVICE_ROLE_KEY — cannot read user_profiles to verify trigger"
    );
    record("IDNT-03", "SKIP", "same as IDNT-02 (needs service role for REST verify)");
    return;
  }

  const { ok, row, reason, body } = await fetchProfileRow(uid);
  if (!ok) {
    record(
      "IDNT-02",
      "FAIL",
      `could not read profile: ${reason} ${typeof body === "object" ? JSON.stringify(body).slice(0, 200) : ""}`
    );
    record("IDNT-03", "FAIL", "profile read failed");
    return;
  }

  if (!row) {
    record(
      "IDNT-02",
      "FAIL",
      "user_profiles row missing after signup (provisioning gap)"
    );
    record("IDNT-03", "FAIL", "no profile row");
    return;
  }

  if (row.role === "admin" || row.is_admin === true) {
    record(
      "IDNT-02",
      "FAIL",
      `self-signup with metadata admin still got role=${row.role} is_admin=${row.is_admin}`
    );
  } else {
    record(
      "IDNT-02",
      "PASS",
      `metadata admin blocked: role=${row.role} is_admin=${row.is_admin}`
    );
  }

  const provisioned =
    ["buyer", "seller", "business"].includes(row.role) &&
    row.is_admin !== true;
  if (provisioned) {
    record(
      "IDNT-03",
      "PASS",
      `profile exists; least-privilege role=${row.role} profile_complete=${row.profile_complete}`
    );
  } else {
    record(
      "IDNT-03",
      "FAIL",
      `unexpected provisioned state role=${row.role} is_admin=${row.is_admin}`
    );
  }
}

// --- IDNT-04: Supabase password grant errors should not differ between unknown emails ---
async function testEnumerationApi() {
  // Hosted Supabase expects JSON body (form-urlencoded returns bad_json on many projects).
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const tokenUrl = `${url}/auth/v1/token?grant_type=password`;
  const body = (e, p) => JSON.stringify({ email: e, password: p });

  const r1 = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: body(`wstg-none-a-${Date.now()}@invalid.dogquest`, "WrongPass!1Aa"),
  });
  const j1 = await r1.json();

  const r2 = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: body(`wstg-none-b-${Date.now()}@invalid.dogquest`, "OtherWrong!2Bb"),
  });
  const j2 = await r2.json();

  const norm = (j) =>
    JSON.stringify({
      code: j.code ?? null,
      error_code: j.error_code ?? null,
      msg: j.msg ?? j.error_description ?? null,
    });

  const a = norm(j1);
  const b = norm(j2);
  if (a === b) {
    record("IDNT-04-unknown", "PASS", "identical error shape for two unknown emails (API)");
  } else {
    record(
      "IDNT-04-unknown",
      "FAIL",
      `error payloads differ: ${a} vs ${b}`
    );
  }

  const testEmail = process.env.WSTG_IDNT_TEST_EMAIL?.trim();
  const wrongPass =
    process.env.WSTG_IDNT_TEST_WRONG_PASSWORD || "WrongPassword!NotReal99";

  if (testEmail) {
    const r3 = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body: body(testEmail, wrongPass),
    });
    const j3 = await r3.json();
    const c = norm(j3);
    if (c === a) {
      record(
        "IDNT-04-known-wrong",
        "PASS",
        "wrong password for real email matches unknown-user error (API)"
      );
    } else {
      record(
        "IDNT-04-known-wrong",
        "FAIL",
        `real email wrong password differs: ${c} vs ${a}`
      );
    }
  } else {
    record(
      "IDNT-04-known-wrong",
      "SKIP",
      "set WSTG_IDNT_TEST_EMAIL (+ optional WSTG_IDNT_TEST_WRONG_PASSWORD) to test known account"
    );
  }

  record(
    "IDNT-04-ui-note",
    "INFO",
    "Toast copy is client-side; this script only checks Supabase Auth API responses."
  );
}

await testProvisioningAndRegistrationRole();
await testEnumerationApi();

const failed = summary.filter((s) => s.status === "FAIL").length;
const skipped = summary.filter((s) => s.status === "SKIP").length;
console.log("");
console.log(`Done. FAIL=${failed} SKIP=${skipped} (INFO lines do not affect exit code)`);
process.exit(failed > 0 ? 1 : 0);
