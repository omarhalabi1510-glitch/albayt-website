import {addDays, dayState, isMonthFull, monthGrid} from './availability.js';

const root = document.querySelector('#stay-calendar');
const source = document.querySelector('#calendar-data');
if (root && source) renderCalendar();

async function renderCalendar() {
  let config;
  try {config = JSON.parse(source.textContent);} catch {return;}
  const loading = el('div', 'calendar-sheet');
  loading.append(note(config.labels.calendarLoading));
  root.replaceChildren(loading);
  root.setAttribute('aria-busy', 'true');
  let data;
  try {
    // Same-origin path first (production, or the local preview proxy in serve.mjs);
    // the absolute URL is only a fallback for hosts that serve the pages without the API.
    data = await load('/api/availability').catch(() => load(config.api));
    if (!data.units || config.units.some(unit => !data.units.some(item => item.id === unit.id))) throw new Error('incomplete');
  } catch {
    fallback(config);
    return;
  }
  const units = config.units.map(unit => ({
    ...unit,
    bookedNights: data.units.find(item => item.id === unit.id).bookedNights,
  }));
  const [year, month] = data.today.split('-').map(Number);
  const view = {year, month, selected: null};
  const limit = data.until.slice(0, 7);
  draw();

  function draw() {
    const key = `${view.year}-${String(view.month).padStart(2, '0')}`;
    const full = isMonthFull(view.year, view.month, data.today, data.until, units);
    const rtl = document.documentElement.dir === 'rtl';
    const sheet = el('div', 'calendar-sheet' + (full ? ' is-month-full' : ''));
    const nav = el('div', 'calendar-nav');
    const prev = button(rtl ? '›' : '‹', config.labels.calendarPrev, () => shift(-1));
    const next = button(rtl ? '‹' : '›', config.labels.calendarNext, () => shift(1));
    prev.disabled = key <= data.today.slice(0, 7);
    next.disabled = key >= limit;
    const title = el('h3');
    title.textContent = monthName(view.year, view.month, config.locale);
    nav.append(prev, title, next);
    sheet.append(nav, legend());
    if (full) {
      const banner = el('p', 'month-full');
      banner.textContent = config.labels.calendarMonthFull;
      sheet.append(banner);
    }
    // A labelled group of buttons (no role="grid": the live markup had no rows/gridcells).
    // Every day button carries its full date in aria-label; weekday headers are visual only.
    const grid = el('div', 'calendar-grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', title.textContent);
    grid.addEventListener('keydown', event => move(event, grid));
    for (const name of config.labels.calendarWeekdays) {
      const cell = el('div', 'dow');
      cell.setAttribute('aria-hidden', 'true');
      cell.textContent = name;
      grid.append(cell);
    }
    for (const iso of monthGrid(view.year, view.month)) grid.append(iso ? dayButton(iso, full) : el('span', 'day is-pad'));
    sheet.append(grid);
    if (view.selected) sheet.append(detail(view.selected));
    sheet.append(standingNote());
    root.replaceChildren(sheet);
    root.removeAttribute('aria-busy');
  }

  function dayButton(iso, full) {
    const state = dayState(iso, data.today, data.until, units);
    const control = el('button', `day is-${state}` + (iso === data.today ? ' is-today' : '') + (iso === view.selected ? ' is-selected' : ''));
    control.type = 'button';
    control.dataset.date = iso;
    const number = el('span', 'day-num');
    number.textContent = String(Number(iso.slice(-2)));
    control.append(number);
    const meaning = {free: config.labels.calendarLegendFree, partial: config.labels.calendarLegendPartial, sold: config.labels.calendarLegendBooked}[state] || '';
    const described = [iso === data.today ? config.labels.calendarToday : '', longDate(iso), meaning].filter(Boolean).join(', ');
    control.setAttribute('aria-label', described);
    control.setAttribute('aria-pressed', String(iso === view.selected));
    if (state === 'past' || state === 'beyond') control.disabled = true;
    else control.addEventListener('click', () => {view.selected = iso; draw(); root.querySelector(`[data-date="${iso}"]`)?.focus();});
    if (full && state === 'sold') control.classList.add('is-in-full-month');
    return control;
  }

  function detail(iso) {
    const state = dayState(iso, data.today, data.until, units);
    const panel = el('div', 'day-panel');
    panel.tabIndex = -1;
    const heading = el('h4');
    heading.id = 'night-heading';
    heading.textContent = longDate(iso);
    panel.setAttribute('aria-labelledby', 'night-heading');
    const caption = el('p', 'units-caption');
    caption.textContent = config.labels.calendarUnits;
    const list = el('ul', 'unit-list');
    const free = [];
    for (const unit of units) {
      const open = !unit.bookedNights.includes(iso);
      if (open) free.push(unit.name);
      const item = el('li');
      const name = el('button', 'unit-name');
      name.type = 'button';
      name.textContent = unit.name;
      name.setAttribute('aria-expanded', 'false');
      const status = el('span', open ? 'free' : 'booked');
      status.textContent = open ? config.labels.calendarFree : config.labels.calendarBooked;
      item.append(name, status);
      if (unit.photos?.length) item.append(roomPreview(unit, name));
      list.append(item);
    }
    const advice = el('p', 'calendar-note');
    advice.textContent = config.labels.calendarNoBook;
    const actions = el('div', 'calendar-actions');
    const message = (state === 'sold' ? config.labels.calendarAskSold : config.labels.calendarAsk)
      .replace('{date}', longDate(iso))
      .replace('{units}', free.join(', '));
    const whatsapp = el('a', 'btn btn-wa');
    whatsapp.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener noreferrer';
    whatsapp.textContent = config.labels.calendarWhatsapp;
    const booking = el('a', 'text-link');
    const url = new URL(config.bookingUrl);
    url.searchParams.set('checkin', iso);
    url.searchParams.set('checkout', addDays(iso, 1));
    booking.href = url.toString();
    booking.target = '_blank';
    booking.rel = 'noopener noreferrer';
    booking.textContent = config.labels.calendarBooking;
    actions.append(whatsapp, booking);
    panel.append(heading, caption, list, advice, actions);
    return panel;
  }

  function roomPreview(unit, name) {
    const preview = el('div', 'room-preview');
    const photos = unit.photos;
    let index = 0;
    const img = el('img');
    img.alt = unit.name;
    img.decoding = 'async';
    const show = () => { img.src = photos[index]; };
    show();
    preview.append(img);
    if (photos.length > 1) {
      const nav = el('div', 'room-preview-nav');
      const prev = button('‹', config.photoPrev, event => step(event, -1));
      const next = button('›', config.photoNext, event => step(event, 1));
      const count = el('span');
      const paint = () => { count.textContent = `${index + 1} / ${photos.length}`; };
      function step(event, delta) {
        event.stopPropagation();
        event.preventDefault();
        index = (index + delta + photos.length) % photos.length;
        show();
        paint();
      }
      paint();
      nav.append(prev, count, next);
      preview.append(nav);
    }
    name.addEventListener('click', event => {
      if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
      event.stopPropagation();
      const open = !preview.classList.contains('is-open');
      root.querySelectorAll('.room-preview.is-open').forEach(node => node.classList.remove('is-open'));
      root.querySelectorAll('.unit-name[aria-expanded="true"]').forEach(node => node.setAttribute('aria-expanded', 'false'));
      if (open) preview.classList.add('is-open');
      name.setAttribute('aria-expanded', String(open));
    });
    return preview;
  }

  function legend() {
    const list = el('ul', 'calendar-legend');
    list.append(
      sample('swatch-free', config.labels.calendarLegendFree),
      sample('swatch-partial', config.labels.calendarLegendPartial),
      sample('swatch-sold', config.labels.calendarLegendBooked),
    );
    return list;
  }

  function standingNote() {
    const block = el('p', 'calendar-note calendar-standing');
    const checked = new Intl.DateTimeFormat(config.locale, {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Jerusalem'}).format(new Date(data.checkedAt));
    const [before, after] = config.labels.calendarChecked.split('{date}');
    block.append(document.createTextNode(before));
    const time = el('time');
    time.dateTime = data.checkedAt;
    time.textContent = checked;
    block.append(time);
    if (after) block.append(document.createTextNode(after));
    return block;
  }

  function shift(delta) {
    const date = new Date(Date.UTC(view.year, view.month - 1 + delta, 1));
    view.year = date.getUTCFullYear();
    view.month = date.getUTCMonth() + 1;
    view.selected = null;
    draw();
    root.querySelectorAll('.month-step')[delta > 0 ? 1 : 0]?.focus();
  }

  function move(event, grid) {
    const horizontal = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const vertical = event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : 0;
    if (!horizontal && !vertical) return;
    const cells = [...grid.querySelectorAll('.day')];
    const index = cells.indexOf(document.activeElement);
    if (index < 0) return;
    const step = vertical || horizontal * (document.documentElement.dir === 'rtl' ? -1 : 1);
    let next = index + step;
    while (cells[next] && cells[next].tagName !== 'BUTTON') next += Math.sign(step);
    if (!cells[next] || cells[next].disabled) return;
    event.preventDefault();
    cells[next].focus();
  }
}

async function load(url) {
  const response = await fetch(url, {headers: {accept: 'application/json'}});
  if (!response.ok) throw new Error('unavailable');
  return response.json();
}

function fallback(config) {
  const sheet = el('div', 'calendar-sheet');
  const copy = note(config.labels.calendarUnavailable);
  const actions = el('div', 'calendar-actions');
  const booking = el('a', 'text-link');
  booking.href = config.bookingUrl;
  booking.target = '_blank';
  booking.rel = 'noopener noreferrer';
  booking.textContent = config.labels.calendarBooking;
  actions.append(booking);
  sheet.append(copy, actions);
  root.replaceChildren(sheet);
  root.removeAttribute('aria-busy');
}

function sample(kind, text) {
  const item = el('li');
  const mark = el('i', kind);
  mark.setAttribute('aria-hidden', 'true');
  item.append(mark, document.createTextNode(text));
  return item;
}

function note(text) {
  const paragraph = el('p', 'calendar-note');
  paragraph.textContent = text;
  return paragraph;
}

function button(glyph, label, onClick) {
  const control = el('button', 'month-step');
  control.type = 'button';
  control.textContent = glyph;
  control.setAttribute('aria-label', label);
  control.addEventListener('click', onClick);
  return control;
}

function monthName(year, month, locale) {
  return new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function longDate(iso, locale = JSON.parse(source.textContent).locale) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
