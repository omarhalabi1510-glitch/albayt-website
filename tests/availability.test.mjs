import test from 'node:test';
import assert from 'node:assert/strict';
import {dayState, isMonthFull, loadAvailability, monthGrid, nightsInMonth, parseIcal} from '../js/availability.js';

const ids = ['329199201', '329199202', '329199203', '329199204'];
const closed = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261224
DTEND;VALUE=DATE:20261226
SUMMARY:CLOSED - Not available
END:VEVENT
BEGIN:VEVENT
STATUS:CANCELLED
DTSTART;VALUE=DATE:20261201
DTEND;VALUE=DATE:20261203
SUMMARY:Ada Guest should not leak
END:VEVENT
END:VCALENDAR`;

test('booked nights are inclusive of the start and exclusive of the end', () => {
  assert.deepEqual(parseIcal(closed), ['2026-12-24', '2026-12-25']);
  assert.equal(JSON.stringify(parseIcal(closed)).includes('Guest'), false);
});

test('folded lines and a missing end still block the stay night', () => {
  const folded = 'BEGIN:VEVENT\nDTSTART;VALUE=DATE:\n 20261112\nSUMMARY:CLOSED\nEND:VEVENT\n';
  assert.deepEqual(parseIcal(folded), ['2026-11-12']);
});

test('a month is full only when every remaining night has no free unit', () => {
  const january = nightsInMonth(2028, 1);
  const units = ids.map(id => ({id, bookedNights: january}));
  assert.equal(isMonthFull(2028, 1, '2026-11-08', '2028-05-08', units), true);
  const oneFree = units.map((unit, index) => index === 0 ? {...unit, bookedNights: january.filter(iso => iso !== '2028-01-15')} : unit);
  assert.equal(isMonthFull(2028, 1, '2026-11-08', '2028-05-08', oneFree), false);
  assert.equal(dayState('2028-01-15', '2026-11-08', '2028-05-08', oneFree), 'open');
  assert.equal(dayState('2028-01-16', '2026-11-08', '2028-05-08', oneFree), 'sold');
});

test('past nights and an incomplete horizon do not make a month look fully booked', () => {
  const november = nightsInMonth(2026, 11).filter(iso => iso >= '2026-11-20');
  const units = ids.map(id => ({id, bookedNights: november}));
  assert.equal(isMonthFull(2026, 11, '2026-11-20', '2028-05-08', units), true);
  assert.equal(dayState('2026-11-08', '2026-11-20', '2028-05-08', units), 'past');
  const may = ids.map(id => ({id, bookedNights: nightsInMonth(2028, 5)}));
  assert.equal(isMonthFull(2028, 5, '2026-11-08', '2028-05-08', may), false);
  assert.equal(monthGrid(2026, 11)[0], '2026-11-01');
});

test('availability loading refuses anything except the Booking export prefix', async () => {
  const seen = [];
  const env = Object.fromEntries(ids.map(id => [`ICAL_${id}`, `https://ical.booking.com/v1/export?t=${id}`]));
  env.ICAL_329199204 = 'https://example.invalid/secret';
  await assert.rejects(() => loadAvailability(env, async url => {seen.push(url); return {ok: true, text: async () => closed};}, new Date('2026-11-08T12:00:00Z')));
  assert.equal(seen.includes('https://example.invalid/secret'), false);
});

test('a good load returns booked nights and no export url', async () => {
  const env = Object.fromEntries(ids.map(id => [`ICAL_${id}`, `https://ical.booking.com/v1/export?t=${id}`]));
  const data = await loadAvailability(env, async () => ({ok: true, text: async () => closed}), new Date('2026-11-08T12:00:00Z'));
  assert.equal(data.today, '2026-11-08');
  assert.deepEqual(data.units[0].bookedNights, ['2026-12-24', '2026-12-25']);
  assert.equal(JSON.stringify(data).includes('export?t='), false);
  assert.equal(JSON.stringify(data).includes('Guest'), false);
});
