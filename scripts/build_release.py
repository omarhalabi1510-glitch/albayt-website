"""Build a static deployment from an explicit file allowlist, never the repo root."""
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_FILES = (
    'index.html', 'en/index.html', '404.html', 'css/style.css',
    'js/main.js', 'js/rating.js', 'images/logo.png', 'robots.txt', 'sitemap.xml',
)

def release_files(root=ROOT):
    manifest = json.loads((root/'content/photo-manifest.json').read_text())
    files = set(BASE_FILES)
    for key in manifest['selected']:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', key):
            raise ValueError('Invalid image asset key')
        files.update(f'images/optimized/{key}-{width}.webp' for width in (480, 960, 1280))
    return sorted(files)

def package_release(root=ROOT):
    root = root.resolve()
    files = release_files(root)
    # Validate every source before touching an existing output. Never follow a
    # symlink that could unexpectedly include an unrelated local file.
    for name in files:
        source = root/name
        if not source.is_file() or source.resolve() != source:
            raise ValueError(f'Missing or symlinked release asset: {name}')
    output = root/'dist'
    if output.is_symlink() or (output.exists() and not output.is_dir()):
        raise ValueError('Refusing to replace an unexpected dist path')
    if output.exists():
        backups = root/'.release-backups'
        if backups.is_symlink():
            raise ValueError('Refusing a symlinked backup directory')
        backups.mkdir(mode=0o700, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
        output.rename(backups/stamp)
    output.mkdir()
    for name in files:
        target = output/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root/name, target)
    return output

if __name__ == '__main__':
    subprocess.run([sys.executable, str(ROOT/'scripts/build.py')], check=True)
    output = package_release()
    print(f'Prepared {len(release_files())} public files in {output.name}/')
