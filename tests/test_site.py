import hashlib, json, unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs

ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self,path):
        super().__init__();self.nodes=[];self.feed(path.read_text())
    def handle_starttag(self,tag,attrs):self.nodes.append((tag,dict(attrs)))

class SiteTests(unittest.TestCase):
    def test_links_assets_and_image_labels(self):
        for relative in ['index.html','en/index.html']:
            page=Page(ROOT/relative);ids=[a['id'] for _,a in page.nodes if 'id' in a]
            self.assertEqual(len(ids),len(set(ids)))
            for tag,a in page.nodes:
                if tag=='img':self.assertIn('alt',a)
                for key in ['href','src']:
                    if key not in a:continue
                    u=urlsplit(a[key])
                    if u.scheme or u.netloc:continue
                    if u.path:
                        target=ROOT/u.path.lstrip('/') if u.path.startswith('/') else (ROOT/relative).parent/u.path
                        if target.is_dir():target=target/'index.html'
                        self.assertTrue(target.exists(),str(target))
                    elif u.fragment:self.assertIn(u.fragment,ids)
                if a.get('target')=='_blank':self.assertIn('noopener',a.get('rel',''))
                if a.get('href','').startswith('https://wa.me/'):
                    self.assertEqual(urlsplit(a['href']).path,'/972506497575')
                    self.assertTrue(parse_qs(urlsplit(a['href']).query).get('text'))
    def test_language_and_room_parity(self):
        he=json.loads((ROOT/'content/he.json').read_text());en=json.loads((ROOT/'content/en.json').read_text())
        self.assertEqual(he.keys(),en.keys())
        self.assertEqual([x[0] for x in he['gallery']],[x[0] for x in en['gallery']])
        for lang,relative in [('he','index.html'),('en','en/index.html')]:
            page=Page(ROOT/relative)
            rooms=[a['data-room-id'] for _,a in page.nodes if 'data-room-id' in a]
            self.assertEqual(rooms,['329199201','329199202','329199203','329199204'])
            self.assertEqual(next(a for tag,a in page.nodes if tag=='html')['lang'],lang)
            source=(ROOT/relative).read_text()
            self.assertNotIn('aggregateRating',source)
            self.assertNotIn('8.7',source)
            self.assertNotIn('Pool View',source)
    def test_original_photographs_unchanged(self):
        manifest=json.loads((ROOT/'content/photo-manifest.json').read_text())
        for item in manifest['originals']:
            self.assertEqual(hashlib.sha256((ROOT/item['original']).read_bytes()).hexdigest(),item['sha256'])
        self.assertEqual(manifest['selected']['shared-lobby'],'images/site/room2.jpg')

if __name__=='__main__':unittest.main()
