# Al-Bayt — family guesthouse by Lake Ram

Static Hebrew and English site at https://www.albayt1.com. HTML, CSS and JavaScript; no framework or runtime server. Generated HTML is committed for the existing static hosting setup.

## Local development

```sh
python3 scripts/build.py
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/ or /en/. Shared facts: `content/property.json`; translated copy: `content/he.json` and `content/en.json`; template: `scripts/build.py`; styling: `css/style.css`; behavior: `js/`. Rebuild after content/template changes. Do not maintain generated pages independently.

## Photos

Original files are preserved. `content/photo-manifest.json` records hashes, dimensions, provenance and known room mapping. Omar confirmed `images/site/room2.jpg` is the shared lobby. Other interiors are not assigned to individual rooms until confirmed. No new Booking/guest/AI images were added.

The baseline repository contained a Booking CDN download workflow: images/site assets have historical Booking-hosted provenance. Their presence in the repository does not establish copyright permission. Before publication, the owner should confirm these are approved property photos or replace them with his originals. The old automatic download/commit workflow has been removed locally; no remote settings changed.

Committed WebP assets need no installation to serve. Regenerate with `python3 scripts/prepare_assets.py` (requires Pillow), then rebuild HTML. This preserves originals and creates 480/960/1280 variants and `review/photo-contact-sheet.jpg`. The selected 960px derivatives total 1,411,026 bytes versus 2,398,194 bytes for their originals (41.2% smaller); this is a file-size comparison, not a page-speed benchmark.

## Rating maintenance

Public Booking and the property admin showed **8.9/10, 104 reviews**, checked 4 October 2026 at 20:01 UTC. This is dated content, not a live feed. After checking the public listing, update score, reviewCount and checkedAt together in property.json, rebuild and test. Suggested owner check: monthly. No automation was created.

After maxAgeDays (60), the page shows a source link instead of a number. Invalid or future data also falls back. Without JavaScript only the source link appears. Rating is omitted from static metadata/structured data. There is no scraping, undocumented API, frontend secret or unverified live integration. Only adopt an official feed/widget after eligibility and public-display rights are established.

## Verification

```sh
python3 scripts/build.py
python3 -m unittest discover -s tests
node --test tests/rating.test.mjs
node --check js/main.js
git diff --check
```

See docs/REVIEW.md for observed browser checks and limits. Preview screenshots in review/ are local and ignored by Git.

## Publishing

Existing repository documentation says Cloudflare Pages deploys from main. A push/merge there may publish production. Work is local on improve/content-and-photo-accuracy; no push/deployment has occurred. Obtain Omar's approval for the preview before publishing. Keep docs/review out of a deployment artifact; robots exclusions are not access controls. Do not modify Booking account content as part of deployment.
