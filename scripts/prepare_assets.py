"""Create derivative assets without changing any original photograph."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'images/optimized').mkdir(parents=True,exist_ok=True)
(ROOT/'review').mkdir(exist_ok=True)
selected={
 'lake-garden':'images/site/hero.jpg','shared-lobby':'images/site/room2.jpg',
 'breakfast-table':'images/gallery-09.jpg','garden-path':'images/gallery-10.jpg',
 'lake-terrace':'images/site/g01.jpg','lake-daylight':'images/site/g02.jpg',
 'stone-exterior':'images/gallery-07.jpg','winter-garden':'images/gallery-02.jpg',
 'stone-room-interior':'images/site/room1.jpg','wood-room-interior':'images/site/room3.jpg',
 'wood-bedroom':'images/site/room4.jpg'}
manifest=[]
for p in sorted((ROOT/'images').rglob('*')):
 if p.suffix.lower() not in ('.jpg','.jpeg','.png') or 'optimized' in p.parts: continue
 im=Image.open(p); rel=str(p.relative_to(ROOT))
 manifest.append({'original':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'provenance':('Historical Booking CDN download recorded in baseline workflow; reuse permission not independently established' if rel.startswith('images/site/') else 'Existing repository asset at baseline c048e72; original licensing not independently established'),'roomAssignment':'Unverified unless stated below','confirmation':'Owner explicitly identified images/site/room2.jpg as shared lobby on 2026-10-04' if rel=='images/site/room2.jpg' else None})
for key,src in selected.items():
 im=ImageOps.exif_transpose(Image.open(ROOT/src)).convert('RGB')
 for width in (480,960,1280):
  out=im.copy();out.thumbnail((width,round(width*im.height/im.width)))
  out.save(ROOT/f'images/optimized/{key}-{width}.webp','WEBP',quality=82,method=6)
(ROOT/'content/photo-manifest.json').write_text(json.dumps({'baseline':'c048e72','selected':selected,'originals':manifest},ensure_ascii=False,indent=2)+'\n')
# Private local review image: retained source filenames make owner confirmation easy.
files=[ROOT/x for x in selected.values()];sheet=Image.new('RGB',(960,((len(files)+2)//3)*250),'#f7f3ec');d=ImageDraw.Draw(sheet)
for i,p in enumerate(files):
 im=Image.open(p); im.thumbnail((304,210));x=i%3*320;y=i//3*250;sheet.paste(im,(x,y));d.text((x+5,y+213),f'{i+1:02d}  {p.name}',fill='#26221d')
sheet.save(ROOT/'review/photo-contact-sheet.jpg')
