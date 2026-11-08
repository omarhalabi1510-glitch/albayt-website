const UNIT_IDS = ['329199201', '329199202', '329199203', '329199204'];
const EXPORT_PREFIX = 'https://ical.booking.com/v1/export?t=';

export function addDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function addMonthsISO(iso, months) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day)).toISOString().slice(0, 10);
}

export function civilDate(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function fieldDate(body, name) {
  const match = body.match(new RegExp('^' + name + '(?:;[^:\\n]*)?:(\\d{8})', 'm'));
  if (!match) return null;
  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function parseIcal(text) {
  const unfolded = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
  const nights = new Set();
  for (const chunk of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const body = chunk.split('END:VEVENT')[0];
    if (/^STATUS:CANCELLED\b/m.test(body)) continue;
    const start = fieldDate(body, 'DTSTART');
    if (!start) continue;
    const end = fieldDate(body, 'DTEND');
    const stop = end && end > start ? end : addDays(start, 1);
    for (let day = start; day < stop; day = addDays(day, 1)) nights.add(day);
  }
  return [...nights].sort();
}

export function nightsInMonth(year, month) {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nights = [];
  for (let day = 1; day <= count; day += 1) {
    nights.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return nights;
}

export function monthGrid(year, month) {
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells = Array(lead).fill(null).concat(nightsInMonth(year, month));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function dayState(iso, today, until, units) {
  if (iso < today) return 'past';
  if (iso > until) return 'beyond';
  const sold = units.every(unit => unit.bookedNights.includes(iso));
  return sold ? 'sold' : 'open';
}

export function isMonthFull(year, month, today, until, units) {
  const nights = nightsInMonth(year, month).filter(iso => iso >= today);
  if (!nights.length || nights.some(iso => iso > until)) return false;
  return nights.every(iso => dayState(iso, today, until, units) === 'sold');
}

export async function loadAvailability(env, fetchImpl = fetch, now = new Date()) {
  const today = civilDate('Asia/Jerusalem', now);
  const until = addMonthsISO(today, 18);
  const units = await Promise.all(UNIT_IDS.map(async id => {
    const url = env?.['ICAL_' + id];
    if (typeof url !== 'string' || !url.startsWith(EXPORT_PREFIX) || url.length > 160) {
      throw new Error('unconfigured');
    }
    const response = await fetchImpl(url, {
      headers: {accept: 'text/calendar'},
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('upstream');
    const bookedNights = parseIcal(await response.text()).filter(iso => iso >= today && iso <= until);
    return {id, bookedNights};
  }));
  return {checkedAt: now.toISOString(), timeZone: 'Asia/Jerusalem', today, until, units};
}
