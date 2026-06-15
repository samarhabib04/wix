#!/usr/bin/env node
/** Print a short header for screenshots / pentest evidence (WSTG ATHZ-02..04, CLNT-07). */
const iso = new Date().toISOString();
console.log("");
console.log("================================================================");
console.log("  Dog Quest — WSTG ATHZ-02, ATHZ-03, ATHZ-04 + CLNT-07 (automated)");
console.log("  Repo: dog-quest-nextjs  |  " + iso);
console.log("  Command: npm run wstg:athz:evidence");
console.log("  Optional: WSTG_ATHZ_EMAIL, WSTG_ATHZ_PASSWORD, WSTG_ATHZ_OTHER_USER_ID");
console.log("================================================================");
console.log("");
