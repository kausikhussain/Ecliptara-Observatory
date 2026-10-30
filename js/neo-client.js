const BASE = 'https://api.nasa.gov/neo/rest/v1/feed';
const MOON_KM = 384400;
const CACHE_PREFIX = 'ecliptara:neo:';
const DEFAULT_KEY = 'DEMO_KEY';

export function getApiKey() {
  try { return (localStorage.getItem('ecliptara:api-key') || DEFAULT_KEY).trim() || DEFAULT_KEY; }
  catch { return DEFAULT_KEY; }
}

export function saveApiKey(key) {
  const clean = String(key || '').trim();
  try {
    if (!clean || clean.toUpperCase() === 'DEMO_KEY') localStorage.removeItem('ecliptara:api-key');
    else localStorage.setItem('ecliptara:api-key', clean);
  } catch { throw new Error('Browser storage is unavailable.'); }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeNeo(item) {
  const approach = (item.close_approach_data || []).find(a => a.close_approach_date) || {};
  const minDiameter = toNumber(item.estimated_diameter?.meters?.estimated_diameter_min);
  const maxDiameter = toNumber(item.estimated_diameter?.meters?.estimated_diameter_max);
  const missKm = toNumber(approach.miss_distance?.kilometers);
  const velocityKmh = toNumber(approach.relative_velocity?.kilometers_per_hour);
  const velocityKms = toNumber(approach.relative_velocity?.kilometers_per_second);
  const timestamp = approach.epoch_date_close_approach ? Number(approach.epoch_date_close_approach) : null;
  return {
    id: String(item.id ?? item.neo_reference_id ?? item.name ?? cryptoSafeId()),
    nasaId: String(item.neo_reference_id ?? item.id ?? ''),
    name: String(item.name || item.designation || 'Uncatalogued object'),
    designation: String(item.designation || item.name || 'Unknown designation'),
    closeDate: String(approach.close_approach_date || ''),
    closeDateFull: String(approach.close_approach_date_full || ''),
    timestamp,
    missKm,
    lunarDistances: missKm == null ? null : missKm / MOON_KM,
    velocityKmh,
    velocityKms,
    minDiameter,
    maxDiameter,
    avgDiameter: minDiameter == null || maxDiameter == null ? null : (minDiameter + maxDiameter) / 2,
    absoluteMagnitude: toNumber(item.absolute_magnitude_h),
    potentiallyHazardous: Boolean(item.is_potentially_hazardous_asteroid),
    nasaUrl: typeof item.nasa_jpl_url === 'string' ? item.nasa_jpl_url : null,
    orbitingBody: String(approach.orbiting_body || 'Earth'),
    source: 'NASA NeoWs'
  };
}
function cryptoSafeId() { return `neo-${Math.random().toString(36).slice(2, 10)}`; }
function readCache(date) {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_PREFIX + date) || 'null');
    if (value && Array.isArray(value.objects) && value.savedAt) return value;
  } catch { /* ignore malformed local cache */ }
  return null;
}
function writeCache(date, objects, returnedCount) {
  try { localStorage.setItem(CACHE_PREFIX + date, JSON.stringify({ objects, returnedCount, savedAt: Date.now() })); } catch { /* storage quota is non-fatal */ }
}

export async function fetchNearEarthObjects(date, { signal } = {}) {
  const cached = readCache(date);
  const key = getApiKey();
  const url = new URL(BASE);
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('api_key', key);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), 12000);
    const abortFromCaller = () => controller.abort(signal?.reason || new DOMException('Superseded request', 'AbortError'));
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    let response;
    try { response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } }); }
    finally { clearTimeout(timeout); signal?.removeEventListener('abort', abortFromCaller); }
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json())?.error?.message || ''; } catch { /* no body */ }
      throw new Error(detail || `NASA NeoWs returned HTTP ${response.status}.`);
    }
    const json = await response.json();
    const raw = json.near_earth_objects?.[date];
    if (!Array.isArray(raw)) throw new Error('The response did not contain an observation list for the selected UTC date.');
    const objects = raw.map(normalizeNeo).sort((a, b) => (a.missKm ?? Infinity) - (b.missKm ?? Infinity));
    writeCache(date, objects, json.element_count ?? objects.length);
    const remaining = response.headers.get('x-ratelimit-remaining');
    return {
      objects, state: 'live', date, fetchedAt: Date.now(), returnedCount: json.element_count ?? objects.length,
      requestUrl: new URL(url.origin + url.pathname).href, rateLimitRemaining: remaining == null ? null : Number(remaining), error: null
    };
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    if (cached) {
      return { objects: cached.objects, state: 'cached', date, fetchedAt: cached.savedAt, returnedCount: cached.returnedCount ?? cached.objects.length, requestUrl: BASE, rateLimitRemaining: null, error: error.message || 'Live request failed.' };
    }
    throw new Error(error?.name === 'TimeoutError' ? 'NASA did not respond within 12 seconds. Try again or check your connection.' : (error?.message || 'Could not reach NASA NeoWs.'));
  }
}

export function formatDistance(km) {
  if (!Number.isFinite(km)) return 'Not reported';
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} million km`;
  if (km >= 10_000) return `${Math.round(km).toLocaleString('en-IN')} km`;
  return `${km.toLocaleString('en-IN', { maximumFractionDigits: 0 })} km`;
}
export function formatVelocity(kmh, kms) {
  if (Number.isFinite(kms)) return `${kms.toFixed(2)} km/s`;
  if (Number.isFinite(kmh)) return `${Math.round(kmh).toLocaleString('en-IN')} km/h`;
  return 'Not reported';
}
export function formatDiameter(meters) {
  if (!Number.isFinite(meters)) return 'Not reported';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  if (meters >= 100) return `${Math.round(meters)} m`;
  return `${meters.toFixed(1)} m`;
}
export function formatLunarDistance(km) {
  if (!Number.isFinite(km)) return 'Not reported';
  const ld = km / MOON_KM;
  return `${ld.toFixed(ld < 10 ? 2 : 1)} LD`;
}
export function formatDateTime(neo, { timeZone = 'UTC' } = {}) {
  if (Number.isFinite(neo.timestamp)) {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(neo.timestamp));
  }
  if (neo.closeDateFull) return neo.closeDateFull;
  return neo.closeDate || 'Time unavailable';
}
export function shortName(name, max = 28) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
export { MOON_KM };
