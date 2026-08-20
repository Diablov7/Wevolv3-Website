/*
 * Remove internal files from the DEPLOY, not from the repository.
 *
 * netlify.toml sets publish = ".", so the whole repo root is served. Strategy
 * documents, commit scripts and project sources were publicly downloadable and
 * indexable (robots.txt carries no Disallow). Redirect rules did not stop it:
 * the same block list deployed twice, once in netlify.toml and once in
 * _redirects with the ! force suffix, was counted by Netlify ("62 redirect
 * rules processed") and still the origin answered 200. Deleting the files is
 * the guarantee that a rule was not.
 *
 * Netlify builds from a fresh clone, so this only affects the build workspace.
 * The repository keeps every file.
 *
 * netlify/ is deliberately untouched here: Netlify bundles the serverless
 * functions from that directory AFTER this command runs, so removing it now
 * would ship a site with no functions.
 */
const fs = require("fs");
const path = require("path");

const DIRS = ["docs", "wevolv3"];

// Extensions that are never site content when they sit in the repo root.
const EXT = new Set([".md", ".sh", ".lock"]);

// Exact names that carry no extension rule but are still internal.
const NAMES = new Set([
  "COMMIT_MSG.txt",
  "generate-news.js",
  "generate-sitemap.js",
  "generate-llms-full.js",
  "sync-news.js",
  "inject-analytics.js",
  "license",
]);

// Anything the live site actually serves. Guard rail: if a name lands here and
// in the block list, it stays.
const KEEP = new Set([
  "robots.txt", "llms.txt", "llms-full.txt", "sitemap.xml", "manifest.json",
  "favicon.ico", "_redirects", "_headers",
  // Held back on purpose, not because they are site content:
  //   netlify.toml  - Netlify re-reads it for headers and redirects after build
  //   package*.json - function bundling runs later and may resolve deps here
  // Both are low value to an attacker; netlify.toml already answers 404.
  "netlify.toml", "package.json", "package-lock.json",
]);

let removed = 0;
const drop = (p) => {
  try {
    fs.rmSync(p, { recursive: true, force: true });
    removed++;
    console.log("  stripped", p);
  } catch (e) {
    console.log("  skipped ", p, e.message);
  }
};

console.log("strip-internal: removing internal files from the deploy");

for (const d of DIRS) {
  if (fs.existsSync(d) && fs.statSync(d).isDirectory()) drop(d);
}

for (const name of fs.readdirSync(".")) {
  if (KEEP.has(name)) continue;
  const full = path.join(".", name);
  let st;
  try { st = fs.statSync(full); } catch { continue; }
  if (!st.isFile()) continue;
  if (name.startsWith(".")) continue;                 // Netlify already blocks dotfiles
  const ext = path.extname(name).toLowerCase();
  if (EXT.has(ext) || NAMES.has(name) || !ext) drop(full);
}

console.log(`strip-internal: ${removed} entries removed from the publish output`);

// This script is itself internal. It runs last, so it goes too.
try { fs.rmSync(__filename, { force: true }); } catch {}
