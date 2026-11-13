// Lazy location map. Leaflet is injected only when #stay-map is near the viewport.
// Tiles: OpenTopoMap (OSM+SRTM, no API key). CARTO Voyager now requires a key. Coordinates from data-* attributes.
(function () {
  const root = document.getElementById('stay-map');
  if (!root) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const loadCss = href => new Promise((resolve, reject) => {
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href.includes('leaflet.css'))) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = () => reject(new Error('leaflet css'));
    document.head.append(link);
  });

  const loadJs = src => new Promise((resolve, reject) => {
    if (window.L) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('leaflet js'));
    document.head.append(script);
  });

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  function init() {
    const data = root.dataset;
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    const south = parseFloat(data.lakeSouth);
    const north = parseFloat(data.lakeNorth);
    const west = parseFloat(data.lakeWest);
    const east = parseFloat(data.lakeEast);
    if (![lat, lng, south, north, west, east].every(Number.isFinite)) return;

    const fallback = root.querySelector('.locate-fallback');
    if (fallback) fallback.remove();
    root.classList.add('is-ready');

    const map = L.map(root, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      zoomAnimation: !reduce,
      fadeAnimation: !reduce,
      markerZoomAnimation: !reduce,
    });
    map.attributionControl.setPrefix('');
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org" rel="noopener noreferrer" target="_blank">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noopener noreferrer" target="_blank">CC-BY-SA</a>)',
      subdomains: 'abc',
      maxZoom: 17,
    }).addTo(map);

    // The house sits on the north-east shore; fitting the lake keeps pin and water in frame.
    map.fitBounds([[south, west], [north, east]], {padding: [48, 48], maxZoom: 16, animate: !reduce});

    const pin = L.divIcon({
      className: 'map-pin-wrap',
      html: `<div class="map-pin"><span class="map-pin-mark" aria-hidden="true"></span><span class="map-pin-label">${escapeHtml(data.name)}</span></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    L.marker([lat, lng], {icon: pin, title: data.name, alt: data.name, keyboard: true, zIndexOffset: 800}).addTo(map);

    const lakeLat = parseFloat(data.lakeLat);
    const lakeLng = parseFloat(data.lakeLng);
    if (Number.isFinite(lakeLat) && Number.isFinite(lakeLng) && data.lakeName) {
      const lake = L.divIcon({
        className: 'map-lake-wrap',
        html: `<div class="map-lake-label">${escapeHtml(data.lakeName)}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([lakeLat, lakeLng], {icon: lake, interactive: false, keyboard: false, zIndexOffset: 200}).addTo(map);
    }

    map.on('click focus', () => map.scrollWheelZoom.enable());
    map.on('blur mouseout', () => map.scrollWheelZoom.disable());
    const refresh = () => map.invalidateSize();
    requestAnimationFrame(refresh);
    map.whenReady(refresh);
    if ('IntersectionObserver' in window) {
      const visible = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) refresh();
      });
      visible.observe(root);
    }
    window.addEventListener('resize', refresh);
  }

  const start = () => Promise.all([
    loadCss('/js/leaflet/leaflet.css'),
    loadJs('/js/leaflet/leaflet.js'),
  ]).then(init).catch(() => {
    root.classList.add('is-failed');
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      if (entries.some(entry => entry.isIntersecting)) {
        obs.disconnect();
        start();
      }
    }, {rootMargin: '600px'});
    observer.observe(root);
  } else {
    start();
  }
})();
