# Accessibility checklist (WCAG 2.1 AA)

Test the main flows in light and dark: home, search, listing, sign-in, sign-up, chat, request, review, dashboard, admin.

- [ ] Every page can be used with the keyboard only; focus is always visible and in a sensible order
- [ ] Skip link works; one `h1` per page; headings in order
- [ ] Text contrast at least 4.5 to 1 (3 to 1 for large text) in both themes; orange is never used for small text on white
- [ ] Meaning is never conveyed by colour alone (verified, errors, rented, price verdicts use words and icons)
- [ ] Tap targets are at least 44 px; no hover-only controls
- [ ] Forms: labels, errors announced (`role="alert"`), required fields marked, autocomplete attributes set
- [ ] Images have alt text, or empty alt when decorative; videos are not autoplay
- [ ] Dialogs (confirm, notifications, menus) trap and return focus and close with Escape
- [ ] Reduced motion: system setting removes animations and reveals (test in OS settings)
- [ ] Zoom to 200% and a 320 px wide screen: no loss of content or horizontal scroll (except tables and compare)
- [ ] Screen reader pass (TalkBack on Android and VoiceOver on iOS) of sign-in, search and a listing
- [ ] Automated scan (axe or Lighthouse) shows no serious issues
