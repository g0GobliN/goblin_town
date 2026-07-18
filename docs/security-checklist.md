# Security checklist for g0.monster

What's already done in the repo (no action needed):

- [x] Security headers: X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy
- [x] Content-Security-Policy header (public/_headers) — locked to self + Google Fonts,
      Firestore/Firebase Auth, and Cloudflare Insights
- [x] Firestore rules: read-only public data, create-only comments/doodles with
      key whitelists and size caps, deny-by-default (firestore.rules, firestore-doodles.rules)
- [x] Admin API verifies Firebase ID tokens against ADMIN_EMAIL / ADMIN_UID
- [x] /admin and /api/* are noindex; secrets are gitignored
- [x] npm audit: 0 vulnerabilities (checked 2026-07-18)

## Do once in dashboards (≈15 minutes total)

### Accounts (most important)

- [ ] Cloudflare account → enable 2FA (authenticator app)
- [ ] GitHub account → enable 2FA
- [ ] Google account (Firebase) → enable 2-Step Verification

### Cloudflare dashboard → g0.monster zone

- [ ] **SSL/TLS → Overview**: set mode to **Full (strict)**
- [ ] **SSL/TLS → Edge Certificates**: turn on **Always Use HTTPS**
- [ ] **SSL/TLS → Edge Certificates**: enable **HSTS** (max-age 6 months; only after
      confirming https works everywhere — it's hard to undo)
- [ ] **Security → Bots**: turn on **Bot Fight Mode**
- [ ] **Security → WAF → Rate limiting rules**: add a rule —
      if URI path starts with `/api/` and rate > 20 requests / 1 minute per IP → Block
- [ ] **Notifications**: add an email alert for traffic spikes / origin errors

### Firebase console (both projects: main + doodle)

- [ ] Confirm the deployed Firestore rules match `firestore.rules` /
      `firestore-doodles.rules` in this repo
- [ ] Firestore → set a budget alert (Google Cloud → Billing) so doodle spam
      can't silently run up a bill
- [ ] Periodically: Firestore → Import/Export → export a backup of blogs/projects

## Ongoing habits

- [ ] Enable Dependabot alerts on the GitHub repo (Settings → Security)
- [ ] Run `npm audit` after adding dependencies
- [ ] If doodle/comment spam appears: add Cloudflare Turnstile to the submit flows
      and tighten the rate-limit rule
