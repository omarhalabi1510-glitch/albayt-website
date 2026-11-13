"""Build the static deployment from the Concept A site in site/, never the repo root.

Cloudflare Pages runs `python3 scripts/build_release.py` and publishes `dist/`.
The Pages Function in functions/ (served at /api/availability) stays beside it.
"""
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT/'site'
ALLOWED = {'.html', '.css', '.js', '.webp', '.avif', '.png', '.jpg', '.svg', '.woff2',
           '.mp4', '.txt', '.xml', '.ico', '.webmanifest'}

def release_files(root=ROOT):
    site = (root/'site').resolve()
    files = []
    for p in sorted(site.rglob('*')):
        if p.is_symlink():
            raise ValueError(f'Refusing symlinked asset: {p.relative_to(site)}')
        if not p.is_file() or p.name.startswith('.'):
            continue
        if p.suffix.lower() not in ALLOWED:
            raise ValueError(f'Unexpected file type in site/: {p.relative_to(site)}')
        files.append(str(p.relative_to(site)))
    for required in ('index.html', 'en/index.html', '404.html'):
        if required not in files:
            raise ValueError(f'Missing {required}')
    return files

def package_release(root=ROOT):
    root = root.resolve()
    files = release_files(root)
    output = root/'dist'
    if output.is_symlink() or (output.exists() and not output.is_dir()):
        raise ValueError('Refusing to replace an unexpected dist path')
    if output.exists():
        backups = root/'.release-backups'
        backups.mkdir(mode=0o700, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
        output.rename(backups/stamp)
    output.mkdir()
    for name in files:
        target = output/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root/'site'/name, target)
    return output

if __name__ == '__main__':
    output = package_release()
    print(f'Prepared {len(release_files())} public files in {output.name}/')
