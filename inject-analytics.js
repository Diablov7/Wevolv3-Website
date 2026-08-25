/*
 * Injects the PostHog snippet into every served HTML page, at build time.
 *
 * Why a build step instead of pasting the snippet into each file:
 * PostHog shipped on 2026-08-16 inside index.html only. GA4 sits in 54 files,
 * PostHog sat in 1, so PostHog measured the homepage and nothing else. Between
 * 2026-08-17 and 2026-08-19 that produced 7 pageviews, all on "/", and a bounce
 * rate of 83% that was an artifact of the install: a visitor moving from the
 * homepage to a service page simply left the dataset, so every session looked
 * like a single page. Organic search lands on the service pages and the blog,
 * which is exactly where the tag was missing.
 *
 * Pasting the snippet 47 times would work once and drift forever: the project
 * key, the api_host and the init options would live in 47 places. Here the
 * snippet has one definition and the build writes it everywhere, the same way
 * strip-internal.js edits the publish output without touching the repository.
 *
 * Runs AFTER generate-news.js so the generated /crypto-news-today/ pages are
 * covered too, and BEFORE strip-internal.js, which deletes this file from the
 * deploy.
 *
 * Idempotent: a file that already calls posthog.init is left alone, so the
 * inline copy in index.html (if it is ever restored) never double-fires.
 */
const fs = require("fs");
const path = require("path");

const PROJECT_KEY = "phc_xBJMSbNpTkqS9HMCkCmedgNShMxEnPXXCCkdXM5cbGDx";
const API_HOST = "https://us.i.posthog.com";

// Directories to walk. Anything not listed here is never touched.
const ROOTS = [".", "crypto-news-today", "for-funds"];

// Pages that must not receive the tag.
//   google*.html      - Google Search Console verification file. Its body is
//                       matched byte for byte; one extra script and the
//                       property loses verification.
//   dev-carousel      - internal preview harness, not linked from the site.
//   social-banner     - image template opened locally to screenshot, not a page.
const SKIP_FILES = new Set(["dev-carousel.html", "social-banner.html"]);
const SKIP_PREFIX = ["google"];

// Directories that hold HTML but are not our pages.
const SKIP_DIRS = new Set(["studio", "node_modules"]);

const MARKER = "<!-- PostHog (injected at build time by inject-analytics.js) -->";

const SNIPPET = `${MARKER}
<script>
!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="Sn Cn init Hn Un Gn Yi zn Kn qn capture Vn kn calculateEventProperties es register register_once register_for_session unregister unregister_for_session os Bn ss getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync ls identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset us shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty rs Xn createPersonProfile setInternalOrTestUser ns $n vs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Jn debug tr At getPageViewId captureTraceFeedback captureTraceMetric Ln".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${PROJECT_KEY}', {
api_host: '${API_HOST}',
defaults: '2026-05-30',
person_profiles: 'identified_only'
})
</script>
`;

const skipName = (name) =>
  SKIP_FILES.has(name) || SKIP_PREFIX.some((p) => name.startsWith(p));

let injected = 0;
let already = 0;
const problems = [];

const collect = (dir) => {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Only "." recurses, and only into the roots we asked for. Dot
      // directories (.git, .claude worktrees) are never site content.
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".html")) continue;
    if (skipName(entry.name)) continue;
    out.push(full);
  }
  return out;
};

console.log("inject-analytics: adding the PostHog tag to the publish output");

const files = ROOTS.filter((d) => !SKIP_DIRS.has(d)).flatMap(collect);

for (const file of files) {
  let html;
  try {
    html = fs.readFileSync(file, "utf8");
  } catch (e) {
    problems.push(`${file}: unreadable (${e.message})`);
    continue;
  }

  if (html.includes("posthog.init")) {
    already++;
    continue;
  }

  // Inject as the last thing in <head> so the tag loads before body content
  // and never lands inside another element.
  const close = html.search(/<\/head\s*>/i);
  if (close === -1) {
    problems.push(`${file}: no </head>, not injected`);
    continue;
  }

  const patched = html.slice(0, close) + SNIPPET + html.slice(close);
  try {
    fs.writeFileSync(file, patched);
    injected++;
  } catch (e) {
    problems.push(`${file}: write failed (${e.message})`);
  }
}

console.log(
  `inject-analytics: ${injected} pages tagged, ${already} already had it, ` +
    `${files.length} scanned`
);

for (const p of problems) console.log("  WARN", p);

// A page that silently loses analytics is worse than a failed build: the
// numbers still look plausible. Any page we meant to tag and could not is
// treated as a build error.
if (problems.length) {
  console.error(
    `inject-analytics: ${problems.length} page(s) could not be tagged`
  );
  process.exit(1);
}
