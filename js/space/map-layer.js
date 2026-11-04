/**
 * MAP-LAYER.JS — Peta Leaflet satelit untuk Mode Bumi
 * Muncul setelah animasi kamera turun menembus awan (crossfade).
 * Fitur:
 *   - Tile Esri World Imagery (utama) + CARTO Dark (fallback)
 *   - CSS filter: saturate(0.85) contrast(1.05) brightness(0.9)
 *   - Marker: L.circle untuk precision:'city', pulsing divIcon untuk 'exact'
 *   - Offline fallback: tombol "Buka di Google Maps"
 *   - Export: MapLayer.show(loc), MapLayer.hide(), MapLayer.zoomTo(zoom, dur)
 *
 * Membutuhkan: Leaflet (global L), LOCATIONS (global, dari locations.js).
 */

const MapLayer = (() => {
  let _map        = null;  // instance Leaflet
  let _mapEl      = null;  // div#earth-map
  let _marker     = null;  // marker aktif
  let _tileLayer  = null;  // layer tile utama
  let _currentLoc = null;  // lokasi aktif
  let _visible    = false;
  let _hasView    = false;
  let _pulseTimer = null;

  // Leaflet default icon path fix (karena file di-bundle manual)
  function _fixLeafletIconPath() {
    if (typeof L === 'undefined') return;
    try {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'js/vendor/leaflet/marker-icon.png',
        iconRetinaUrl: 'js/vendor/leaflet/marker-icon-2x.png',
        shadowUrl:     'js/vendor/leaflet/marker-shadow.png'
      });
    } catch (e) { /* abaikan */ }
  }

  // ── Inisialisasi map (sekali) ─────────────────────────────────────────────
  function _init() {
    if (_map) return true;
    if (typeof L === 'undefined') {
      console.warn('[map-layer] Leaflet belum tersedia.');
      return false;
    }

    _fixLeafletIconPath();

    _mapEl = document.getElementById('earth-map');
    if (!_mapEl) {
      console.warn('[map-layer] #earth-map tidak ditemukan.');
      return false;
    }

    _map = L.map(_mapEl, {
      zoomControl:       false,
      scrollWheelZoom:   false,
      attributionControl: true,
      keyboard:          false, // keyboard dihandle oleh director
      fadeAnimation:     true,
      zoomAnimation:     true
    });

    // Tile Esri Satellite (utama)
    const esriUrl =
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const cartoUrl =
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    _tileLayer = L.tileLayer(esriUrl, {
      attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>',
      maxZoom: 19
    });

    // Pasang CSS filter setelah tile layer ditambahkan
    _tileLayer.on('add', () => {
      const pane = _map.getPanes().tilePane;
      if (pane) pane.style.filter = 'saturate(0.85) contrast(1.05) brightness(0.9)';
    });

    _tileLayer.addTo(_map);

    // Fallback: ganti ke CARTO jika tile Esri error
    _tileLayer.on('tileerror', () => {
      if (_tileLayer._usedFallback) return;
      _tileLayer._usedFallback = true;
      console.warn('[map-layer] Esri tile gagal, beralih ke CARTO fallback.');
      _map.removeLayer(_tileLayer);
      _tileLayer = L.tileLayer(cartoUrl, {
        attribution: '&copy; <a href="https://carto.com">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(_map);
    });

    return true;
  }

  // ── Buat marker sesuai precision ─────────────────────────────────────────
  function _addMarker(loc) {
    if (_marker) {
      _map.removeLayer(_marker);
      _marker = null;
    }
    if (_pulseTimer) { clearInterval(_pulseTimer); _pulseTimer = null; }

    if (loc.precision === 'exact') {
      // Pulsing divIcon
      const icon = L.divIcon({
        className: '',
        html: `<div class="earth-map-pin" role="img" aria-label="Lokasi ${loc.title}"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      _marker = L.marker([loc.lat, loc.lng], { icon }).addTo(_map);
      _marker.bindPopup(`<strong>${loc.title}</strong><br>${loc.place}`, { closeButton: false });
    } else {
      // Circle untuk precision: city (bulatkan ke radius circleMeters)
      _marker = L.circle([loc.lat, loc.lng], {
        radius: loc.circleMeters || 1000,
        color: '#E10600',
        fillColor: '#E10600',
        fillOpacity: 0.15,
        weight: 1.5,
        opacity: 0.7
      }).addTo(_map);
      _marker.bindPopup(`<strong>${loc.title}</strong><br>${loc.place}`, { closeButton: false });
    }
  }

  // ── Offline fallback UI ───────────────────────────────────────────────────
  function _showOfflineFallback(loc) {
    const existing = document.getElementById('earth-map-offline');
    if (existing) return;

    const div = document.createElement('div');
    div.id = 'earth-map-offline';
    div.style.cssText = [
      'position:absolute', 'inset:0', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'background:#0F0F0F', 'color:#C0C0C0', 'font-family:Inter,sans-serif',
      'z-index:5', 'gap:16px'
    ].join(';');
    div.innerHTML = `
      <span style="font-size:14px;opacity:0.6">Peta tidak tersedia (offline)</span>
      <a href="https://maps.google.com/?q=${loc.lat},${loc.lng}"
         target="_blank" rel="noopener noreferrer"
         style="color:#E10600;text-decoration:none;border:1px solid #E10600;
                padding:8px 16px;border-radius:999px;font-size:13px">
        Buka di Google Maps ↗
      </a>`;
    _mapEl.appendChild(div);
  }

  /**
   * Tampilkan peta untuk lokasi tertentu.
   * @param {object} loc — objek dari LOCATIONS
   */
  function show(loc) {
    if (!_init()) {
      // Leaflet tidak ada → offline fallback langsung
      if (_mapEl) {
        _mapEl.style.opacity = '1';
        _mapEl.style.pointerEvents = 'auto';
        _showOfflineFallback(loc);
      }
      return;
    }

    _currentLoc = loc;
    _mapEl.hidden  = false;
    _visible       = true;

    // Fade in via class
    requestAnimationFrame(() => {
      _mapEl.classList.add('earth-map--visible');
    });

    _map.setView([loc.lat, loc.lng], 7, { animate: false });
    _addMarker(loc);
    _hasView = true;

    // Invalidate size after reveal because the map may have been hidden at init.
    setTimeout(() => {
      _map.invalidateSize({ animate: false });

      // Offline detection: periksa setelah 5 detik apakah ada tile yang ter-load
      setTimeout(() => {
        const anyLoaded = document.querySelector('#earth-map .leaflet-tile-loaded');
        if (!anyLoaded) _showOfflineFallback(loc);
      }, 5000);
    }, 50);
  }

  /**
   * Sembunyikan peta.
   */
  function hide() {
    if (!_mapEl) return;
    _mapEl.classList.remove('earth-map--visible');
    _visible = false;

    // Hapus offline fallback jika ada
    const off = document.getElementById('earth-map-offline');
    if (off) off.remove();

    setTimeout(() => {
      if (!_visible) _mapEl.hidden = true;
    }, 400); // sesuai CSS transition
  }

  /**
   * Zoom ke level tertentu dengan durasi animasi.
   * @param {number} zoom
   * @param {number} [durationMs=1500]
   */
  function zoomTo(zoom, durationMs) {
    if (!_map || !_currentLoc || !_hasView) return;
    const dur = (durationMs || 1500) / 1000; // Leaflet pakai detik
    _map.flyTo([_currentLoc.lat, _currentLoc.lng], zoom, {
      animate: true,
      duration: Math.min(dur, 3) // Leaflet cap ~3s
    });
  }

  return { show, hide, zoomTo };
})();

window.MapLayer = MapLayer;
