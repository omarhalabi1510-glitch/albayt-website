"""Build the two existing static pages from shared facts and translated copy."""
import json, html
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
facts=json.loads((ROOT/'content/property.json').read_text())
esc=lambda x:html.escape(str(x),quote=True)
manifest=json.loads((ROOT/'content/photo-manifest.json').read_text())
dimensions={item['original']:(item['width'],item['height']) for item in manifest['originals']}
def image(key,alt,cls='',hero=False):
 w,h=dimensions[manifest['selected'][key]]
 variants={min(480,w):480,min(960,w):960,min(1280,w):1280}
 srcset=', '.join(f'/images/optimized/{key}-{file_width}.webp {actual_width}w' for actual_width,file_width in variants.items())
 sizes='100vw' if hero else '(max-width: 600px) 100vw, 50vw'
 loading='fetchpriority="high"' if hero else 'loading="lazy" decoding="async"'
 return f'<img class="{cls}" src="/images/optimized/{key}-960.webp" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{esc(alt)}" {loading}>'

def build(lang):
 t=json.loads((ROOT/f'content/{lang}.json').read_text());h=lambda k:esc(t[k])
 wa=lambda msg:'https://wa.me/'+facts['whatsapp']+'?text='+quote(msg)
 booking=facts['bookingUrl'].replace('.en-gb.html','.he.html') if lang=='he' else facts['bookingUrl']
 external='target="_blank" rel="noopener noreferrer"'
 url=facts['website']+('/en/' if lang=='en' else '/')
 nav=''.join(f'<a href="#{id}">{esc(label)}</a>' for id,label in zip(['rooms','shared','breakfast','gallery','reviews','plan'],t['nav']))
 rooms=[]
 for n,room in enumerate(facts['rooms']):
  name=t['roomNames'][n];beds=' · '.join(f'{count} {t["bedNames"][kind][0 if count==1 else 1]}' for kind,count in room['beds'].items())
  message=t['roomMessage'].format(room=name,id=room['id'])
  rooms.append(f'''<article class="room" data-room-id="{room['id']}"><div class="room-body"><span class="room-number" aria-hidden="true">0{n+1}</span><h3>{esc(name)}</h3><p class="capacity">{esc(t['guests'].format(n=room['capacity']))}</p><p class="bed-list">{esc(beds)}</p><div class="room-ctas"><a class="btn btn-wa small" href="{esc(wa(message))}" {external}>{h('availability')}</a><a class="link-book" href="{booking}#RD{room['id']}" {external}>{h('bookingPhotos')} ↗</a></div></div></article>''')
 gallery=''.join(f'''<figure><a class="gallery-link" href="/images/optimized/{key}-1280.webp" data-gallery="{i}" aria-label="{h('openPhoto')}: {esc(alt)}">{image(key,alt)}</a><figcaption>{esc(alt)}</figcaption></figure>''' for i,(key,alt) in enumerate(t['gallery']))
 schema={'@context':'https://schema.org','@type':'LodgingBusiness','name':facts['propertyName'],'url':facts['website'],'image':facts['website']+'/images/optimized/lake-garden-1280.webp','telephone':facts['phone'],'address':{'@type':'PostalAddress','addressLocality':'Mas’ade','postalCode':'1243500','addressCountry':'IL'},'sameAs':[facts['bookingUrl']]}
 rating={**{key:facts['rating'][key] for key in ('score','reviewCount','checkedAt','maxAgeDays')},'sourceUrl':booking,'locale':'he-IL' if lang=='he' else 'en-GB','labels':{k:t[k] for k in ['ratingBased','ratingChecked','ratingOut','ratingCurrent']}}
 s=f'''<!doctype html>
<html lang="{lang}" dir="{t['dir']}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{h('title')}</title><meta name="description" content="{h('description')}">
<link rel="canonical" href="{url}"><link rel="alternate" hreflang="he" href="https://www.albayt1.com/"><link rel="alternate" hreflang="en" href="https://www.albayt1.com/en/"><link rel="alternate" hreflang="x-default" href="https://www.albayt1.com/">
<meta property="og:title" content="{h('title')}"><meta property="og:description" content="{h('description')}"><meta property="og:type" content="website"><meta property="og:url" content="{url}"><meta property="og:image" content="https://www.albayt1.com/images/optimized/lake-garden-1280.webp"><meta property="og:locale" content="{'he_IL' if lang=='he' else 'en_GB'}">
<link rel="icon" href="/images/logo.png"><link rel="stylesheet" href="/css/style.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Assistant:wght@400;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script>
<script id="rating-data" type="application/json">{json.dumps(rating,ensure_ascii=False)}</script><script type="module" src="/js/main.js"></script>
</head><body>
<a class="skip-link" href="#main">{h('skip')}</a>
<header class="topbar" id="topbar"><a class="brand" href="#top"><img src="/images/logo.png" alt="" width="44" height="34"><span>{h('brand')}</span></a><button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">{h('menu')} ☰</button><nav class="nav" id="main-nav" aria-label="{h('menu')}">{nav}</nav><div class="topbar-actions"><a class="lang" href="{t['otherPath']}" lang="{'en' if lang=='he' else 'he'}">{h('other')}</a><a class="btn btn-wa small header-contact" href="{esc(wa(t['message']))}" {external}>WhatsApp ↗</a></div></header>
<main id="main"><section class="hero" id="top">{image('lake-garden',t['heroAlt'],'hero-img',True)}<div class="hero-veil"></div><div class="hero-inner"><p class="hero-kicker">{h('kicker')}</p><p class="hero-brand">{h('brand')} <span lang="en">{'Al-Bayt' if lang=='he' else ''}</span></p><h1>{h('heading')}</h1><p class="hero-sub">{h('sub')}</p><div class="hero-ctas"><a class="btn btn-wa" href="{esc(wa(t['message']))}" {external}>{h('availability')}</a><a class="btn btn-ghost" href="#rooms">{h('explore')} ↓</a></div><div class="trust" data-rating><a href="{booking}" {external}>{h('ratingCurrent')} ↗</a></div></div></section>
<section class="intro"><div class="wrap intro-grid"><div class="intro-text"><p class="eyebrow">Al-Bayt</p><h2>{h('introTitle')}</h2><p>{h('intro')}</p></div><ul class="intro-facts">{''.join('<li>'+esc(x)+'</li>' for x in t['facts'])}</ul></div></section>
<section class="film" id="film" aria-labelledby="film-title"><div class="wrap film-inner"><h2 class="section-h" id="film-title">{h('filmTitle')}</h2><p class="section-sub">{h('filmLead')}</p><figure class="film-frame"><video controls playsinline preload="metadata" poster="/images/zimmer-he-explainer-poster.jpg" width="1080" height="1920" aria-label="{h('filmLabel')}"><source src="/videos/zimmer-he-explainer.mp4" type="video/mp4"></video></figure></div></section>
<section class="rooms" id="rooms"><div class="wrap"><h2 class="section-h">{h('roomsTitle')}</h2><p class="section-sub">{h('roomsIntro')}</p><div class="room-grid">{''.join(rooms)}</div><p class="room-note">{h('roomNote')}</p><p class="price-note">{h('rates')}</p></div></section>
<section class="split" id="shared"><figure>{image('shared-lobby',t['sharedCaption'])}<figcaption>{h('sharedCaption')}</figcaption></figure><div class="split-body"><p class="eyebrow">{esc(t['nav'][1])}</p><h2 class="section-h">{h('sharedTitle')}</h2><p>{h('sharedText')}</p><p class="clarification">{h('noPool')}</p></div></section>
<section class="split reverse" id="breakfast">{image('breakfast-table',t['breakfastAlt'])}<div class="split-body"><p class="eyebrow">{esc(t['nav'][2])}</p><h2 class="section-h">{h('breakfastTitle')}</h2><p>{h('breakfastText')}</p><a class="text-link" href="{esc(wa(t['message']))}" {external}>{h('availability')} ↗</a></div></section>
<section class="gallery" id="gallery"><div class="wrap"><h2 class="section-h">{h('galleryTitle')}</h2><p class="section-sub">{h('galleryIntro')}</p><div class="g-grid" id="ggrid">{gallery}</div></div></section>
<section class="area"><div class="wrap area-summary"><h2 class="section-h">{h('areaTitle')}</h2><p>{h('areaText')}</p></div></section>
<section class="reviews" id="reviews"><div class="wrap"><h2 class="section-h">{h('ratingTitle')}</h2><p class="section-sub">{h('ratingLead')}</p><div class="rev-badge" data-rating><a href="{booking}" {external}>{h('ratingCurrent')} ↗</a></div></div></section>
<section id="plan" class="plan"><div class="wrap"><h2 class="section-h">{h('planTitle')}</h2><div class="policy-grid"><article><h3>{h('checkIn')} / {h('checkOut')}</h3><dl><dt>{h('checkIn')}</dt><dd><bdi>{facts['policies']['checkIn']}</bdi></dd><dt>{h('checkOut')}</dt><dd><bdi>{facts['policies']['checkOut']}</bdi></dd></dl><p>{h('arrival')}</p></article>{''.join(f'<article><h3>{h(title)}</h3><p>{h(body)}</p></article>' for title,body in [('childrenTitle','children'),('houseTitle','house'),('termsTitle','terms')])}</div></div></section>
<section class="contact" id="contact"><div class="wrap contact-grid"><div><h2 class="section-h">{h('contactTitle')}</h2><p class="addr">{h('address')}</p><p>{h('contactNote')}</p><a class="btn btn-wa" href="{esc(wa(t['message']))}" {external}>{h('availability')}</a></div><ul class="c-list"><li><a href="tel:{facts['phone']}">{h('phoneLabel')} · <bdi>{facts['phone']}</bdi></a></li><li><a href="mailto:{facts['email']}">{h('emailLabel')} · <bdi>{facts['email']}</bdi></a></li><li><a href="{facts['mapUrl']}" {external}>{h('mapLabel')} ↗</a></li><li><a href="{booking}" {external}>{h('booking')} ↗</a></li><li><a href="https://www.facebook.com/albayt12" {external}>Facebook ↗</a></li></ul></div></section>
</main><footer class="footer"><p>© 2026 Al-Bayt · {h('footer')}</p><a href="{t['otherPath']}" lang="{'en' if lang=='he' else 'he'}">{h('other')}</a></footer>
<dialog class="lightbox" id="lightbox" aria-label="{h('galleryTitle')}"><div class="lightbox-inner"><button class="lb-close" type="button" aria-label="{h('close')}">×</button><img alt=""><p id="photo-caption"></p><div class="lb-nav"><button type="button" data-photo-step="-1">{h('previous')}</button><span id="photo-counter" data-label="{h('photoOf')}" aria-live="polite"></span><button type="button" data-photo-step="1">{h('next')}</button></div></div></dialog>
</body></html>'''
 target=ROOT/('index.html' if lang=='he' else 'en/index.html');target.parent.mkdir(exist_ok=True);target.write_text(s)
for language in ('he','en'):build(language)
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.albayt1.com/</loc></url><url><loc>https://www.albayt1.com/en/</loc></url></urlset>\n')
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://www.albayt1.com/sitemap.xml\n')
