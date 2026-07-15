/*
 * Wevolv3 — GA4 conversion event tracking
 * Fires clean, named GA4 events for the site's real conversion actions so they
 * can be marked as Key Events in GA4 (Admin > Events > mark as key event).
 *
 * Events sent:
 *   generate_lead    -> contact form submitted successfully (primary conversion)
 *   telegram_click   -> click on a Telegram link (t.me/wevolv3)
 *   email_click      -> click on a mailto: link
 *   lets_talk_click  -> click on a "LET'S TALK" CTA button
 *   calculator_used  -> KOL ROI calculator was run
 *
 * Depends on gtag() already being loaded on the page (G-E7E4GJ0QP9).
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

  function track(eventName, params) {
    try {
      if (typeof window.gtag === 'function') {
        // merge first-touch attribution onto every event
        var merged = Object.assign({}, FT, params || {});
        window.gtag('event', eventName, merged);
      }
    } catch (e) {
      /* never let tracking break the page */
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
      }
    },
    true
  );
})();
