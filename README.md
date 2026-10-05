# Al-Bayt website

Static Hebrew and English guesthouse website: https://www.albayt1.com/.

## Build and preview

```sh
python3 scripts/build_release.py
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

Only `dist/` is a deployment artifact. Never deploy the repository root.
The release builder copies an explicit allowlist: the two guest pages, a 404
page, CSS, JavaScript, logo, selected optimized photos, robots.txt and sitemap.
Source JSON, original photos, documentation, scripts, tests, local screenshots,
Git files and release backups are excluded. A rebuild moves the old output
into ignored `.release-backups/` rather than deleting it.

Edit shared facts in `content/property.json` and translated copy in
`content/he.json` and `content/en.json`. Rebuild after content/template changes.
The photo manifest contains asset names, dimensions and integrity hashes for
build tooling; it is not needed by visitors. To regenerate optimized images,
run `python3 scripts/prepare_assets.py` with Pillow installed, then rebuild.

The guest rating is manually verified and dated. Update score, reviewCount and
checkedAt together after checking the source. An expired, future or invalid
rating displays a source link. There is no automatic remote data collection.

## Validation

```sh
python3 -m unittest discover -s tests
node --test tests/rating.test.mjs
node --check js/main.js
git diff --check
```

## Cloudflare Pages release

The existing project must use build command `python3 scripts/build_release.py`
and build output directory `dist` before publishing this change. The repository
root remains the build root, not the output directory. These settings are not
changed by running the build locally. Do not assume that a push alone switches
the hosting output directory.

Use the existing authenticated Pages project and verify both languages, rating,
assets, and HTTP 404 responses for excluded development paths after deployment.
A top-level 404.html disables Pages' automatic SPA fallback for missing files.
Website exclusions do not remove older public Git commits, deployment versions,
third-party copies or search caches. No history rewrite is part of this change.
