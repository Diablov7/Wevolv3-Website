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

  function track(eventName, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params || {});
      }
    } catch (e) {
      /* never let tracking break the page */
    }
  }

  // Expose so page-level handlers (e.g. contact form success) can fire events.
  window.wevolv3Track = track;

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
