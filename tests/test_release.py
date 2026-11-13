import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

class References(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.paths=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        self.paths.extend(a[k] for k in ('src', 'href', 'poster', 'data-poster') if a.get(k))
        for k in ('srcset', 'data-srcset'):
            self.paths.extend(x.strip().split()[0] for x in (a.get(k) or '').split(',') if x.strip())

class ReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(['python3',str(ROOT/'scripts/build_release.py')], check=True, capture_output=True)
        cls.output=ROOT/'dist'

    def test_no_development_files_are_packaged(self):
        for forbidden in ['README.md','content/property.json','scripts/build.py','tests/test_site.py','.git/config','functions/api/availability.js']:
            self.assertFalse((self.output/forbidden).exists(),forbidden)

    def test_pages_and_local_references_exist(self):
        for name in ['index.html','en/index.html','404.html']:
            for ref in References((self.output/name).read_text()).paths:
                url=urlsplit(ref)
                if url.scheme or url.netloc or not url.path or ref.startswith('#'):continue
                target=self.output/url.path.lstrip('/') if url.path.startswith('/') else (self.output/name).parent/url.path
                if target.is_dir():target=target/'index.html'
                self.assertTrue(target.is_file(),f'{name}: {ref}')

    def test_calendar_uses_same_origin_api_without_tokens(self):
        cal=(self.output/'js/calendar.js').read_text()
        self.assertIn("'/api/availability'",cal)
        for p in self.output.rglob('*'):
            if p.suffix in ('.html','.js'):
                text=p.read_text()
                self.assertNotRegex(text,r'ical\.booking\.com/v1/export\?t=[0-9a-f-]{36}')
                self.assertNotIn('127.0.0.1',text)

if __name__=='__main__':
    unittest.main()
