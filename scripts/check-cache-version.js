#!/usr/bin/env node
// Fails (exit 1) if any Service-Worker-cached file (sw.js's own APP_SHELL list) changed
// without CACHE_NAME in sw.js also changing — the exact "stale cache" failure mode the
// prior audit reproduced (see sw.js's own comment and CLAUDE.md's "Bump CACHE_NAME" rule).
// Pure Node + git, no dependencies, so it stays runnable with this project's no-build-step
// setup. Run manually (`npm run check:cache`) before a deploy, or via the committed
// .githooks/pre-commit hook once `git config core.hooksPath .githooks` has been run.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function extractCacheName(source) {
  const m = source.match(/const\s+CACHE_NAME\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : null;
}

function extractAppShell(source) {
  const m = source.match(/const\s+APP_SHELL\s*=\s*\[([\s\S]*?)\];/);
  if (!m) return [];
  return [...m[1].matchAll(/["']([^"']+)["']/g)]
    .map(x => x[1].replace(/^\.\//, ""))
    .filter(f => f && f !== "/");
}

const swPath = path.join(__dirname, "..", "sw.js");
const currentSource = fs.readFileSync(swPath, "utf8");
const currentCacheName = extractCacheName(currentSource);
const appShell = extractAppShell(currentSource);

if (!currentCacheName) {
  console.error("check-cache-version: could not find CACHE_NAME in sw.js — check the file wasn't corrupted.");
  process.exit(1);
}

let headSource;
try {
  headSource = sh("git show HEAD:sw.js");
} catch (e) {
  console.log("check-cache-version: no committed sw.js yet (first commit) — skipping.");
  process.exit(0);
}
const headCacheName = extractCacheName(headSource);

let changed;
try {
  const unstaged = sh("git diff --name-only HEAD").split("\n");
  const staged = sh("git diff --name-only --cached HEAD").split("\n");
  changed = new Set([...unstaged, ...staged].filter(Boolean));
} catch (e) {
  changed = new Set();
}

const changedShellFiles = appShell.filter(f => changed.has(f));

if (changedShellFiles.length && currentCacheName === headCacheName) {
  console.error("\n✗ Service Worker cache check failed\n");
  console.error("These cached files changed:");
  changedShellFiles.forEach(f => console.error("  - " + f));
  console.error(`\nbut CACHE_NAME in sw.js is still "${currentCacheName}" (unchanged from the last commit).`);
  console.error("Bump CACHE_NAME in sw.js before committing/deploying, or installed PWA users will keep running the old cached bundle.\n");
  process.exit(1);
}

console.log(
  "check-cache-version: OK" +
    (changedShellFiles.length ? ` (CACHE_NAME bumped to "${currentCacheName}")` : " (no cached assets changed)")
);
