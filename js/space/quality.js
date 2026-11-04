/**
 * QUALITY.JS — Deteksi tier performa perangkat untuk Mode Bumi
 * Tier: HIGH | MID | LOW
 * Dibaca oleh earth.js, stars.js, dan director.js.
 */

const Quality = (() => {
  // ── Konfigurasi per tier ──────────────────────────────────────────────────
  const CONFIGS = {
    HIGH: { textureSize: 4096, segments: 128, stars: 2000, shadows: true  },
    MID:  { textureSize: 2048, segments: 96,  stars: 1200, shadows: false },
    LOW:  { textureSize: 1024, segments: 64,  stars: 600,  shadows: false }
  };

  let _tier = null;        // 'HIGH' | 'MID' | 'LOW'
  let _fpsMonitor = null;  // callback ref untuk cleanup

  // ── Deteksi awal berdasarkan hardware ────────────────────────────────────
  function _detectTier() {
    // Hemat data: selalu pakai LOW
    if (navigator.connection) {
      const conn = navigator.connection;
      if (conn.saveData) return 'LOW';
      if (conn.effectiveType === '2g' || conn.effectiveType === '3g') return 'LOW';
    }

    const cores  = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory       || 2; // GB (tidak semua browser support)
    const touch  = window.matchMedia('(pointer: coarse)').matches;
    const mobile = window.innerWidth < 768;

    // Perangkat touch / mobile kecil → MID atau LOW
    if (touch || mobile) {
      if (cores <= 4 || memory <= 2) return 'LOW';
      return 'MID';
    }

    // Desktop
    if (cores >= 8 && memory >= 8) return 'HIGH';
    if (cores >= 4 && memory >= 4) return 'MID';
    return 'LOW';
  }

  // ── Adaptive: turunkan tier jika FPS < 45 setelah 1 detik ────────────────
  function _startFpsMonitor() {
    if (_fpsMonitor) return;
    let frames = 0;
    let start  = performance.now();

    const tick = () => {
      frames++;
      const elapsed = performance.now() - start;
      if (elapsed >= 1000) {
        const fps = frames / (elapsed / 1000);
        if (fps < 45 && _tier !== 'LOW') {
          console.info(`[quality] FPS rendah (${fps.toFixed(0)}). Turun ke tier lebih rendah.`);
          _tier = _tier === 'HIGH' ? 'MID' : 'LOW';
          // Hentikan monitor setelah satu penyesuaian
          _fpsMonitor = null;
          return;
        }
        // Reset
        frames = 0;
        start  = performance.now();
      }
      _fpsMonitor = requestAnimationFrame(tick);
    };

    _fpsMonitor = requestAnimationFrame(tick);
  }

  // ── API Publik ────────────────────────────────────────────────────────────
  return {
    /**
     * Kembalikan tier saat ini ('HIGH' | 'MID' | 'LOW').
     * Lazy: dideteksi sekali saat pertama kali dipanggil.
     */
    getTier() {
      if (!_tier) _tier = _detectTier();
      return _tier;
    },

    /** Kembalikan objek konfigurasi untuk tier saat ini. */
    getConfig() {
      return CONFIGS[this.getTier()];
    },

    /** Mulai pemantauan FPS (panggil setelah Earth scene aktif). */
    startFpsMonitor() {
      _startFpsMonitor();
    },

    /** Override tier secara manual (untuk testing: ?tier=LOW). */
    setTier(t) {
      if (CONFIGS[t]) { _tier = t; console.info('[quality] Tier dipaksa:', t); }
    }
  };
})();

// ── Debug: ?tier=HIGH/MID/LOW ─────────────────────────────────────────────────
(function () {
  if (typeof window === 'undefined') return;
  const t = new URLSearchParams(window.location.search).get('tier');
  if (t) Quality.setTier(t.toUpperCase());
})();

