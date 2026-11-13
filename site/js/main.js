import {freshRating} from './rating.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const rtl = document.documentElement.dir === 'rtl';
const vt = fn => (document.startViewTransition && !reduce.matches) ? document.startViewTransition(fn) : (fn(), null);

// --- Header + menu -----------------------------------------------------------
const topbar = document.querySelector('#topbar');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const solid = () => topbar.toggleAttribute('data-solid', scrollY > 40 || menu.getAttribute('aria-expanded') === 'true');
// The menu toggle only exists visually under 1100px; close the panel if the viewport grows past it.
matchMedia('(min-width: 1100px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
const setMenu = open => { menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); solid(); };
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } });
addEventListener('scroll', solid, {passive: true}); solid();

// --- Guest rating (dated, hidden when stale) ---------------------------------
let rating;
try { rating = JSON.parse(document.querySelector('#rating-data').textContent); } catch { /* keep static link */ }
function renderRating() {
  if (!rating) return;
  document.querySelectorAll('[data-rating]').forEach(container => {
    const link = document.createElement('a');
    link.href = rating.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    if (freshRating(rating)) {
      const score = document.createElement('bdi'); score.className = 'score'; score.textContent = rating.score.toFixed(1);
      const words = document.createElement('span'); words.className = 'rating-copy';
      const description = document.createElement('span');
      description.textContent = `${rating.labels.ratingOut}, ${rating.labels.ratingBased.replace('{count}', rating.reviewCount)}`;
      const time = document.createElement('time'); time.dateTime = rating.checkedAt;
      const date = new Intl.DateTimeFormat(rating.locale, {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem'}).format(new Date(rating.checkedAt));
      time.textContent = rating.labels.ratingChecked.replace('{date}', date);
      words.append(description, time); link.append(score, words);
    } else link.textContent = rating.labels.ratingCurrent;
    container.replaceChildren(link);
  });
}
renderRating();
addEventListener('pageshow', renderRating);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderRating(); });
setInterval(renderRating, 3600000);

// --- Room photo carousels (native scroll-snap) -------------------------------
for (const box of document.querySelectorAll('[data-carousel]')) {
  const track = box.querySelector('.track');
  const slides = [...track.children];
  const count = box.querySelector('.count');
  const index = () => Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
  const paint = () => { count.textContent = `${index() + 1} / ${slides.length}`; };
  const go = step => {
    const i = Math.max(0, Math.min(slides.length - 1, index() + step));
    track.scrollTo({left: (rtl ? -1 : 1) * i * track.clientWidth, behavior: reduce.matches ? 'auto' : 'smooth'});
  };
  box.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => go(Number(b.dataset.step))));
  track.addEventListener('scroll', paint, {passive: true});
  track.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); go((e.key === 'ArrowLeft') === rtl ? 1 : -1);
  });
  paint();
}

// --- Lightbox: <dialog> + View Transition morph -------------------------------
const dialog = document.querySelector('#lightbox');
const big = dialog.querySelector('img');
const caption = dialog.querySelector('#photo-caption');
const counter = dialog.querySelector('#photo-counter');
let list = [], at = 0, opener = null;
const thumbOf = link => link.querySelector('img');
function fill(i) {
  at = (i + list.length) % list.length;
  const link = list[at], thumb = thumbOf(link);
  big.src = thumb.currentSrc || thumb.src;
  big.alt = thumb.alt;
  caption.textContent = thumb.alt;
  counter.textContent = counter.dataset.label.replace('{n}', at + 1).replace('{total}', list.length);
  const hi = new Image(); hi.src = link.href;
  hi.decode().then(() => { if (list[at] === link) big.src = hi.src; }).catch(() => {});
}
document.addEventListener('click', event => {
  const link = event.target.closest('[data-gallery]');
  if (!link || typeof dialog.showModal !== 'function') return;
  event.preventDefault();
  list = [...document.querySelectorAll('[data-gallery]')].filter(a => !a.closest('[hidden]'));
  opener = link;
  const thumb = thumbOf(link);
  thumb.style.viewTransitionName = 'photo';
  vt(() => { thumb.style.viewTransitionName = ''; big.style.viewTransitionName = 'photo'; fill(list.indexOf(link)); dialog.showModal(); });
});
function close() {
  const thumb = thumbOf(list[at]);
  const t = vt(() => { big.style.viewTransitionName = ''; if (!thumb.closest('[hidden]')) thumb.style.viewTransitionName = 'photo'; dialog.close(); });
  (t ? t.finished : Promise.resolve()).finally(() => { thumb.style.viewTransitionName = ''; });
}
dialog.querySelector('.lb-close').addEventListener('click', close);
dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
// Clicks on the transparent dialog area beside the photo also close it (closedby="any" covers the backdrop natively).
dialog.addEventListener('click', e => { if (e.target === dialog && dialog.open) close(); });
dialog.querySelectorAll('[data-photo-step]').forEach(b => b.addEventListener('click', () => fill(at + Number(b.dataset.photoStep))));
dialog.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); fill(at + ((e.key === 'ArrowLeft') === rtl ? 1 : -1)); } });
dialog.addEventListener('close', () => { big.style.viewTransitionName = ''; opener?.focus(); });

// --- Film poster: attach only when the film nears the viewport ---------------
// Chrome does not paint a poster assigned later to an existing preload="none" <video>, so the
// element is replaced by a clone that carries the poster from the start (keeps it out of the LCP window).
const film = document.querySelector('video[data-poster]');
if (film) {
  const attach = () => { const v = film.cloneNode(true); v.poster = v.dataset.poster; v.removeAttribute('data-poster'); film.replaceWith(v); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); attach(); } }, {rootMargin: '600px 0px'});
    io.observe(film);
  } else attach();
}
