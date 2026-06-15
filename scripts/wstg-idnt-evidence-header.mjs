#!/usr/bin/env node
/** Print a short header for screenshots / pentest evidence attachments (WSTG IDNT-01..04). */
const iso = new Date().toISOString();
console.log("");
console.log("================================================================");
console.log("  Dog Quest — WSTG IDNT-01 through IDNT-04 (automated)");
console.log("  Repo: dog-quest-nextjs  |  " + iso);
console.log("  Command: npm run wstg:idnt:evidence");
console.log("  Optional: WSTG_IDNT_TEST_EMAIL + WSTG_IDNT_TEST_WRONG_PASSWORD");
console.log("================================================================");
console.log("");
