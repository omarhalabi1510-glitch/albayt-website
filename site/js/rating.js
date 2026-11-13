export function freshRating(data, now = Date.now()) {
  if (!data || !Number.isFinite(data.score) || data.score < 0 || data.score > 10 || !Number.isInteger(data.reviewCount) || data.reviewCount < 1 || !Number.isInteger(data.maxAgeDays) || data.maxAgeDays < 1) return false;
  const checked = Date.parse(data.checkedAt);
  return Number.isFinite(checked) && checked <= now && now - checked <= data.maxAgeDays * 86400000;
}
