import {freshRating} from './rating.js';
const topbar = document.querySelector('#topbar');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const setMenu = open => { menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); solid(); };
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } });
const solid = () => topbar.classList.toggle('solid', scrollY > 40 || menu.getAttribute('aria-expanded') === 'true');
addEventListener('scroll', solid, {passive:true}); menu.addEventListener('click',solid); solid();

let rating;
try {rating = JSON.parse(document.querySelector('#rating-data').textContent);} catch { /* Keep the static source link. */ }
function renderRating() {
  if (!rating) return;
  document.querySelectorAll('[data-rating]').forEach(container => {
    container.replaceChildren();
    const link = document.createElement('a');
    link.href = rating.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    if (freshRating(rating)) {
      const score = document.createElement('bdi'); score.className = 'score'; score.textContent = rating.score.toFixed(1);
      const words = document.createElement('span'); words.className = 'rating-copy';
      const description = document.createElement('span'); description.textContent = `${rating.labels.ratingOut} · ${rating.labels.ratingBased.replace('{count}', rating.reviewCount)}`;
      const time = document.createElement('time'); time.dateTime = rating.checkedAt;
      const date = new Intl.DateTimeFormat(rating.locale, {year:'numeric',month:'short',day:'numeric',timeZone:'Europe/Berlin'}).format(new Date(rating.checkedAt));
      time.textContent = rating.labels.ratingChecked.replace('{date}', date);
      words.append(description,time); link.append(score,words);
    } else {link.textContent = rating.labels.ratingCurrent + ' ↗';}
    container.append(link);
  });
}
renderRating();
// Recheck an already-open page when returning to it, and hourly.
addEventListener('pageshow',renderRating);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderRating();});
setInterval(renderRating,3600000);

const dialog = document.querySelector('#lightbox');
const photos = [...document.querySelectorAll('[data-gallery]')];
const photo = dialog.querySelector('img');
const caption = dialog.querySelector('#photo-caption');
const counter = dialog.querySelector('#photo-counter');
let index = 0, trigger;
function showPhoto(next) {
  index = (next + photos.length) % photos.length;
  photo.src = photos[index].href;
  photo.alt = photos[index].querySelector('img').alt;
  caption.textContent = photo.alt;
  counter.textContent = counter.dataset.label.replace('{n}',index+1).replace('{total}',photos.length);
}
photos.forEach((link,i)=>link.addEventListener('click', event => {
  if (typeof dialog.showModal !== 'function') return;
  event.preventDefault(); trigger=link; showPhoto(i); dialog.showModal(); document.body.classList.add('modal-open');
}));
dialog.querySelector('.lb-close').addEventListener('click',()=>dialog.close());
dialog.querySelectorAll('[data-photo-step]').forEach(button=>button.addEventListener('click',()=>showPhoto(index+Number(button.dataset.photoStep))));
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'||event.key==='ArrowLeft') {event.preventDefault();const rtl=document.documentElement.dir==='rtl';showPhoto(index+(event.key==='ArrowRight'?(rtl?-1:1):(rtl?1:-1)));}
});
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open'); photo.removeAttribute('src'); trigger?.focus();});
