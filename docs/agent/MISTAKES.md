# Mistakes and lessons: CameywareBuildMonitor

## Rules (read before every task)

1. A page behind Cloudflare Access links its manifest itself with crossOrigin use-credentials; never Next manifest.ts

## Log

### 2026-11-26: A manifest behind Cloudflare Access needs crossorigin=use-credentials
- **Symptom:** Next manifest.ts rendered <link rel=manifest> without crossorigin
- **Root cause:** Browsers fetch a manifest without cookies unless the link says use-credentials; Next adds it only when VERCEL_ENV is preview; Access answers a cookieless request with its login page
- **Fix:** app.webmanifest as a force-static route, linked in the layout with crossOrigin=use-credentials
- **Rule:** A page behind Cloudflare Access links its manifest itself with crossOrigin use-credentials; never Next manifest.ts (Rule 1)
