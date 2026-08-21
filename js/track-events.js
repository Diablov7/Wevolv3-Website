/*
 * Wevolv3 — conversion event tracking (GA4 + PostHog)
 * Fires clean, named events for the site's real conversion actions so they can
 * be marked as Key Events in GA4 (Admin > Events > mark as key event) and used
 * as conversions in PostHog (Data management > Events).
 *
 * Events sent:
 *   generate_lead        -> contact form submitted successfully (primary conversion)
 *   qualify_lead         -> same submit, carrying the project type
 *   telegram_click       -> click on a Telegram link (t.me/wevolv3)
 *   email_click          -> click on a mailto: link
 *   lets_talk_click      -> click on a "LET'S TALK" CTA button
 *   calculator_used      -> KOL ROI calculator was run
 *   calculator_share     -> calculator result shared
 *   adoption_check_run   -> adoption check executed
 *   adoption_check_unlock / adoption_check_share
 *
 * Both destinations get the SAME event name and the same properties, so the two
 * tools can be compared line by line instead of arguing.
 *
 * Destinations are optional and independent: gtag() comes from the GA4 tag
 * (G-E7E4GJ0QP9) and posthog from the snippet that inject-analytics.js writes
 * into every page at build time. If either is missing or blocked, the other
 * still fires and the page never breaks.
 */
(function () {
  'use strict';

  // ── First-touch attribution ────────────────────────────────────────────
  // Capture the utm_* (and referrer) of the visitor's FIRST landing and keep it
  // for 30 days. Every conversion event then carries the real source, so a lead
  // that arrived from an X/Telegram post is no longer bucketed as "direct".
  var FT_KEY = 'wv3_first_touch';
  function firstTouch() {
    try {
      var saved = localStorage.getItem(FT_KEY);
      if (saved) { var o = JSON.parse(saved); if (o && (Date.now() - (o.t || 0)) < 30 * 864e5) return o.v; }
      var q = new URLSearchParams(location.search);
      var v = {
        ft_source: q.get('utm_source') || undefined,
        ft_medium: q.get('utm_medium') || undefined,
        ft_campaign: q.get('utm_campaign') || undefined,
        ft_content: q.get('utm_content') || undefined,
        ft_landing: location.pathname || undefined,
        ft_referrer: (document.referrer || '').slice(0, 200) || undefined
      };
      // only persist if there is a real signal (a utm or an external referrer)
      if (v.ft_source || (v.ft_referrer && v.ft_referrer.indexOf(location.host) === -1)) {
        localStorage.setItem(FT_KEY, JSON.stringify({ t: Date.now(), v: v }));
      }
      return v;
    } catch (e) { return {}; }
  }
  var FT = firstTouch();

  // Attach first-touch attribution to every PostHog event on the page, pageviews
  // included. Without this PostHog buckets a visit from an X or Telegram post as
  // "direct", exactly the blind spot the GA4 side already works around.
  try {
    if (window.posthog && typeof window.posthog.register === 'function') {
      var superProps = {};
      for (var k in FT) {
        if (Object.prototype.hasOwnProperty.call(FT, k) && FT[k] !== undefined) {
          superProps[k] = FT[k];
        }
      }
      if (Object.keys(superProps).length) window.posthog.register(superProps);
    }
  } catch (e) {
    /* attribution is a nice-to-have; never let it break the page */
  }

  function track(eventName, params) {
    // merge first-touch attribution onto every event
    var merged = Object.assign({}, FT, params || {});

    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, merged);
      }
    } catch (e) {
      /* never let tracking break the page */
    }

    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        // sendBeacon so the event survives the navigation that an outbound
        // click (mailto:, t.me) starts immediately after this handler returns.
        window.posthog.capture(eventName, merged, { transport: 'sendBeacon' });
      }
    } catch (e) {
      /* same contract as above: tracking never breaks the page */
    }
  }

  // Expose so page-level handlers (e.g. contact form success) can fire events.
  window.wevolv3Track = track;
  window.wevolv3FirstTouch = FT;

  // Delegated click tracking — survives dynamically injected links (blog, etc.)
  document.addEventListener(
    'click',
    function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('a, button') : null;
      if (!el) return;

      var href = (el.getAttribute && el.getAttribute('href')) || '';
      var cls = (el.className && el.className.toString()) || '';

      if (/^mailto:/i.test(href)) {
        track('email_click', { link_url: href, transport_type: 'beacon' });
        return;
      }
      if (/(^https?:)?\/\/t\.me\//i.test(href) || /t\.me\/wevolv3/i.test(href)) {
        track('telegram_click', { link_url: href, transport_type: 'beacon' });
        return;
      }
      if (/lets-talk/i.test(cls)) {
        track('lets_talk_click', {
          link_text: (el.textContent || '').trim().slice(0, 60),
          transport_type: 'beacon'
        });
        return;
      }
      // Any other route to the contact page is intent too: 81 links point there
      // and only 25 of them carry the lets-talk-btn class, so without this the
      // funnel loses most of the clicks that lead to the form.
      if (/(^|\/)contact\.html(\?|#|$)/i.test(href) || /^\/contact(\/|\?|#|$)/i.test(href)) {
        track('contact_click', {
          link_text: (el.textContent || '').trim().slice(0, 60),
          from_page: location.pathname,
          transport_type: 'beacon'
        });
      }
    },
    true
  );

  // ── Form start ─────────────────────────────────────────────────────────
  // The step that explains the drop-off: arriving at the form is a pageview,
  // submitting is generate_lead, and everyone who gave up in between was
  // invisible. Fires once per page, on the first real interaction with a field.
  var formStarted = {};
  document.addEventListener(
    'focusin',
    function (ev) {
      var field = ev.target;
      if (!field || !field.closest) return;
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName || '')) return;
      if (field.type === 'submit' || field.type === 'hidden') return;

      var form = field.closest('form');
      if (!form) return;

      var id = form.getAttribute('id') || form.getAttribute('name') || 'form';
      if (formStarted[id]) return;
      formStarted[id] = true;

      track('form_start', { form_id: id, page: location.pathname });
    },
    true
  );
})();
