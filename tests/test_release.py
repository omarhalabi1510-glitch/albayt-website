import importlib.util
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

def mask_dated_additions(html):
    html=re.sub(r'<section class="film" id="film".*?</section>\n','',html,flags=re.S)
    html=re.sub(r'<section class="availability" id="availability".*?</section>\n','',html,flags=re.S)
    html=re.sub(r'<script id="calendar-data" type="application/json">.*?</script>','',html)
    html=html.replace('<script type="module" src="/js/calendar.js"></script>','')
    html=re.sub(r'"score": [\d.]+, "reviewCount": \d+, "checkedAt": "[^"]+", "maxAgeDays": \d+',
                '"score": 0, "reviewCount": 0, "checkedAt": "", "maxAgeDays": 0',html)
    return html
spec = importlib.util.spec_from_file_location('build_release', ROOT/'scripts/build_release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class References(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.paths=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        self.paths.extend(a[k] for k in ('src', 'href') if k in a)
        self.paths.extend(x.strip().split()[0] for x in a.get('srcset','').split(',') if x.strip())

class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(['python3',str(ROOT/'scripts/build_release.py')], check=True, capture_output=True)
        cls.output=ROOT/'dist'

    def test_only_explicit_public_files_are_packaged(self):
        actual={str(p.relative_to(self.output)) for p in self.output.rglob('*') if p.is_file()}
        self.assertEqual(actual,set(release.release_files()))
        for forbidden in ['README.md','docs/REVIEW.md','content/property.json','content/photo-manifest.json','content/he.json','content/en.json','scripts/build.py','tests/test_site.py','.git/config','review/photo-contact-sheet.jpg']:
            self.assertFalse((self.output/forbidden).exists(),forbidden)

    def test_all_page_and_module_dependencies_are_in_release(self):
        for name in ['index.html','en/index.html','404.html']:
            for ref in References((self.output/name).read_text()).paths:
                url=urlsplit(ref)
                if url.scheme or url.netloc or not url.path:continue
                target=self.output/url.path.lstrip('/') if url.path.startswith('/') else (self.output/name).parent/url.path
                if target.is_dir():target=target/'index.html'
                self.assertTrue(target.is_file(),ref)
        self.assertTrue((self.output/'js/rating.js').is_file())
        self.assertTrue((self.output/'js/calendar.js').is_file())
        self.assertTrue((self.output/'js/availability.js').is_file())
        self.assertNotRegex((self.output/'js/main.js').read_text(),r'fetch\s*\(')
        self.assertNotRegex((self.output/'js/calendar.js').read_text(),r'ical\.booking\.com/v1/export\?t=[0-9a-f-]{36}')

    def test_only_consumed_rating_fields_are_inlined(self):
        facts=json.loads((ROOT/'content/property.json').read_text())['rating']
        for name in ['index.html','en/index.html']:
            text=(self.output/name).read_text()
            data=json.loads(re.search(r'<script id="rating-data" type="application/json">(.*?)</script>',text).group(1))
            self.assertEqual(set(data),{'score','reviewCount','checkedAt','maxAgeDays','sourceUrl','locale','labels'})
            self.assertEqual(set(data['labels']),{'ratingBased','ratingChecked','ratingOut','ratingCurrent'})
            self.assertEqual((data['score'],data['reviewCount'],data['maxAgeDays']),(facts['score'],facts['reviewCount'],facts['maxAgeDays']))
            self.assertEqual(facts['score'],9.0)
            self.assertEqual(facts['maxAgeDays'],14)
            self.assertNotIn('8.9',text)

    def test_calendar_follows_the_film_without_export_tokens(self):
        for name in ['index.html','en/index.html']:
            text=(self.output/name).read_text()
            film=text.index('id="film"')
            calendar=text.index('id="availability"')
            rooms=text.index('id="rooms"')
            self.assertLess(film,calendar)
            self.assertLess(calendar,rooms)
            section=re.search(r'<section class="availability" id="availability".*?</section>',text).group(0)
            for forbidden in ['ical.booking.com','export?t=','Pool View','pool view','מפואר','luxury','₪']:
                self.assertNotIn(forbidden,section)
                self.assertNotIn(forbidden,text)
            self.assertIn('calendarMonthFull',text)
            if name=='index.html':
                for phrase in ['כל המתחם פנוי','חלק מהמתחם פנוי','כל המתחם תפוס']:
                    self.assertIn(phrase,text)
            else:
                for phrase in ['The whole property is free','Part of the property is free','The whole property is booked']:
                    self.assertIn(phrase,text)
            self.assertNotIn('autoplay',text)
            data=json.loads(re.search(r'<script id="calendar-data" type="application/json">(.*?)</script>',text).group(1))
            photos={unit['id']:unit['photos'] for unit in data['units']}
            self.assertEqual(list(photos), ['329199201','329199202','329199203','329199204'])
            self.assertEqual(photos['329199201'], ['/images/optimized/wood-bedroom-960.webp','/images/optimized/wood-room-interior-960.webp','/images/optimized/room-201-windows-960.webp'])
            self.assertNotIn('stone-room-interior', ''.join(photos['329199201']))
            self.assertIn('/images/optimized/stone-room-interior-960.webp', photos['329199204'])
            self.assertIn('/images/optimized/room-202-sitting-960.webp', photos['329199202'])
            for paths in photos.values():
                self.assertGreaterEqual(len(paths), 1)
                for path in paths:
                    self.assertTrue((self.output/path.lstrip('/')).is_file(), path)
                    self.assertNotRegex(path, r'pool|jacuzzi|luxury|tv|wifi', re.I)

    def test_page_behavior_and_content_match_published_baseline(self):
        for name in ['index.html','en/index.html']:
            old=subprocess.check_output(['git','show',f'f70b9f9:{name}'],cwd=ROOT,text=True)
            # The only HTML difference is removing an unused rating metadata key.
            old=old.replace(', "source": "Booking.com"','')
            new=(self.output/name).read_text()
            film=re.search(r'<section class="film" id="film".*?</section>\n',new)
            self.assertIsNotNone(film)
            self.assertIn('<video controls playsinline preload="metadata" poster="/images/zimmer-he-explainer-poster.jpg"',film.group(0))
            self.assertNotIn('autoplay',film.group(0))
            self.assertEqual(mask_dated_additions(old),mask_dated_additions(new))

    def test_rebuild_preserves_but_does_not_republish_old_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            for name in release.release_files()+['content/photo-manifest.json']:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
            old=root/'dist/docs';old.mkdir(parents=True)
            (old/'internal.txt').write_text('private sentinel')
            release.package_release(root)
            self.assertFalse((root/'dist/docs/internal.txt').exists())
            copies=list((root/'.release-backups').glob('*/docs/internal.txt'))
            self.assertEqual(len(copies),1)
            self.assertEqual(copies[0].read_text(),'private sentinel')

    def test_symlinked_output_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            for name in release.release_files()+['content/photo-manifest.json']:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
            (root/'dist').symlink_to(root/'content',target_is_directory=True)
            with self.assertRaises(ValueError):release.package_release(root)
            self.assertTrue((root/'content/photo-manifest.json').exists())

if __name__=='__main__':unittest.main()
