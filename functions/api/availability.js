import {loadAvailability} from '../../js/availability.js';

const cacheKey = () => new Request('https://albayt.internal/api/availability');

export async function onRequestGet({env, waitUntil}) {
  const cached = await readCache();
  if (cached && age(cached) < 30 * 60 * 1000) return json(cached);
  try {
    const data = await loadAvailability(env);
    const response = json(data);
    try {waitUntil?.(caches.default.put(cacheKey(), response.clone()));} catch { /* A runtime without the edge cache still returns the fresh body. */ }
    return response;
  } catch {
    if (cached && age(cached) < 2 * 60 * 60 * 1000) return json(cached);
    return new Response(JSON.stringify({error: 'unavailable'}), {
      status: 503,
      headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
    });
  }
}

async function readCache() {
  try {
    const hit = await caches.default.match(cacheKey());
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

function age(data) {
  const checked = Date.parse(data.checkedAt);
  return Number.isFinite(checked) ? Date.now() - checked : Infinity;
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
}
