/**
 * DIRECTOR.JS — Pengarah Animasi & Transisi Mode Bumi
 * Fitur:
 *   - Rotasi sinematik: Bumi berputar mulus (slerp) menghadap Indonesia & Pulau Lombok Mataram
 *   - Zoom sinematik: Kamera menukik mendekat ke Pulau Lombok
 *   - Crossfade ke peta Leaflet satelit Mataram
 *   - Exit mulus kembali ke tampilan cerita tanpa sentakan kamera
 */

const Director = (() => {
  let _mode        = 'idle'; // 'idle' | 'launch' | 'hop' | 'exit' | 'map'
  let _scene       = null;
  let _camera      = null;
  let _renderer    = null;
  let _currentLoc  = null;
  let _segments    = [];
  let _segIdx      = 0;
  let _segT        = 0;
  let _rafId       = null;
  let _lastTime    = 0;
  let _doneCb      = null;
  let _progressCb  = null;
  let _operationId = 0;

  const BASE_STORY_CAM_Z = 6.0;

  const ease = {
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outCubic:   (t) => 1 - Math.pow(1 - t, 3),
    inCubic:    (t) => t * t * t
  };

  function lerpV3(out, a, b, t) {
    out.lerpVectors(a, b, t);
  }

  function _getLoc(id) {
    if (typeof LOCATIONS === 'undefined') return null;
    return LOCATIONS.find((l) => l.id === id) || null;
  }

  function _grabScene() {
    if (_scene) return true;
    if (window.__earthInternals) {
      _scene    = window.__earthInternals.scene;
      _camera   = window.__earthInternals.camera;
      _renderer = window.__earthInternals.renderer;
      return !!(_scene && _camera && _renderer);
    }
    return false;
  }

  function _updateHUD(loc) {
    const hud = document.getElementById('earth-hud');
    if (!hud) return;
    const infoStage = hud.querySelector('.hud-info-stage');
    const infoTitle = hud.querySelector('.hud-info-title');
    const infoPlace = hud.querySelector('.hud-info-place');
    if (infoStage) infoStage.textContent = loc.stage;
    if (infoTitle) infoTitle.textContent = loc.title;
    if (infoPlace) infoPlace.textContent = loc.place;

    document.querySelectorAll('.timeline-item.earth-active').forEach((item) => {
      item.classList.remove('earth-active');
    });
    const activeItem = document.querySelector(`.timeline-item[data-stage="${loc.id}"]`);
    if (activeItem) activeItem.classList.add('earth-active');
  }

  function _showHUD(show) {
    const hud = document.getElementById('earth-hud');
    if (!hud) return;
    hud.hidden = !show;
    if (show) requestAnimationFrame(() => hud.classList.add('hud--visible'));
    else hud.classList.remove('hud--visible');
  }

  function _showSkipBtn(show) {
    const btn = document.getElementById('btn-skip-anim');
    if (btn) btn.hidden = !show;
  }

  function _emitProgress(phase, percent) {
    if (_progressCb) _progressCb({ phase, percent });
  }

  function _tick(now) {
    _rafId = requestAnimationFrame(_tick);
    const delta = Math.min((now - _lastTime) / 1000, 0.1);
    _lastTime = now;

    if (!_segments.length || _segIdx >= _segments.length) return;

    const seg = _segments[_segIdx];
    _segT += delta;
    const t = Math.min(_segT / seg.duration, 1);

    seg.fn_tick && seg.fn_tick(t, delta);
    _emitProgress(seg.name, Math.round(((_segIdx + t) / _segments.length) * 100));

    if (t >= 1) {
      seg.fn_end && seg.fn_end();
      _segIdx++;
      _segT = 0;
      if (_segIdx >= _segments.length) {
        _stopLoop();
        _doneCb && _doneCb();
      } else {
        const nextSeg = _segments[_segIdx];
        nextSeg.fn_start && nextSeg.fn_start();
      }
    }
  }

  function _startLoop() {
    _lastTime = performance.now();
    _rafId = requestAnimationFrame(_tick);
  }

  function _stopLoop() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  LAUNCH (Bumi Berputar ke Indonesia -> Zoom ke Lombok Mataram -> Peta)
  // ════════════════════════════════════════════════════════════════════════════
  function _buildLaunchSegments(loc) {
    const camStart  = _camera.position.clone();
    const camMid    = new THREE.Vector3(0, 0, 2.3);
    const camLombok = new THREE.Vector3(0, 0, 1.15); // Dekat sekali dengan permukaan Lombok

    return [
      // Seg 0: Putar Bumi menghadap Indonesia (Lombok) sambil kamera mendekat (1.8s)
      {
        name: 'rotate-to-indonesia',
        duration: 1.8,
        fn_start() {
          _showSkipBtn(true);
          document.body.classList.add('earth-mode');
          const main = document.getElementById('main-content');
          if (main) {
            main.style.transition = 'opacity 0.6s ease';
            main.style.opacity = '0';
          }
          if (typeof Stars !== 'undefined') Stars.setWarp(true);
          // Mulai rotasi slerp menuju koordinat lokasi (Lombok, Mataram)
          if (typeof Earth !== 'undefined') Earth.setTarget(loc.lat, loc.lng, false);
        },
        fn_tick(t) {
          const e = ease.inOutCubic(t);
          // Bumi berputar mulus ke Indonesia
          if (typeof Earth !== 'undefined') Earth.slerpTarget(e);
          // Kamera meluncur dari Z=6 ke Z=2.3
          lerpV3(_camera.position, camStart, camMid, e);
          _camera.lookAt(0, 0, 0);
        },
        fn_end() {
          if (typeof Earth !== 'undefined') Earth.slerpTarget(1.0);
        }
      },

      // Seg 1: Zoom mendalam ke Pulau Lombok Mataram (1.3s)
      {
        name: 'zoom-to-lombok',
        duration: 1.3,
        fn_start() {
          if (typeof Stars !== 'undefined') Stars.setWarp(false);
        },
        fn_tick(t) {
          const e = ease.outCubic(t);
          lerpV3(_camera.position, camMid, camLombok, e);
          _camera.lookAt(0, 0, 0);
        },
        fn_end() {}
      },

      // Seg 2: Crossfade halus ke peta satelit Leaflet Mataram (1.4s)
      {
        name: 'map-in',
        duration: 1.4,
        fn_start() {
          if (window.MapLayer) window.MapLayer.show(loc);
          _updateHUD(loc);
        },
        fn_tick(t) {
          const canvas = document.getElementById('bg-3d');
          if (canvas) canvas.style.opacity = String(1 - ease.outCubic(t));
        },
        fn_end() {
          _mode = 'map';
          _showHUD(true);
          _showSkipBtn(false);
          const announcer = document.getElementById('earth-announcer');
          if (announcer) announcer.textContent = `Tiba di ${loc.title}`;
          // Zoom peta Leaflet dari tingkat pulau (zoom 7) masuk ke kota Mataram (zoom 12-16)
          if (window.MapLayer) window.MapLayer.zoomTo(loc.mapZoom, 1600);
        }
      }
    ];
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  HOP (Pindah lokasi antar tahap di peta)
  // ════════════════════════════════════════════════════════════════════════════
  function _buildHopSegments(loc) {
    const camLombok = new THREE.Vector3(0, 0, 1.15);

    return [
      {
        name: 'map-out',
        duration: 0.8,
        fn_start() {
          _showSkipBtn(true);
          _showHUD(false);
        },
        fn_tick(t) {
          const canvas = document.getElementById('bg-3d');
          if (canvas) canvas.style.opacity = String(ease.inCubic(t));
        },
        fn_end() {
          if (window.MapLayer) window.MapLayer.hide();
        }
      },

      {
        name: 'rotate',
        duration: 1.0,
        fn_start() {
          if (typeof Earth !== 'undefined') Earth.setTarget(loc.lat, loc.lng, false);
        },
        fn_tick(t) {
          const e = ease.inOutCubic(t);
          if (typeof Earth !== 'undefined') Earth.slerpTarget(e);
          _camera.position.copy(camLombok);
          _camera.lookAt(0, 0, 0);
        },
        fn_end() {
          if (typeof Earth !== 'undefined') Earth.slerpTarget(1.0);
        }
      },

      {
        name: 'map-in',
        duration: 1.0,
        fn_start() {
          if (window.MapLayer) window.MapLayer.show(loc);
          _updateHUD(loc);
        },
        fn_tick(t) {
          const canvas = document.getElementById('bg-3d');
          if (canvas) canvas.style.opacity = String(1 - ease.outCubic(t));
        },
        fn_end() {
          _mode = 'map';
          _showHUD(true);
          _showSkipBtn(false);
          if (window.MapLayer) window.MapLayer.zoomTo(loc.mapZoom, 1200);
        }
      }
    ];
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  EXIT (Tutup Mode Bumi & Kembali ke Tampilan Cerita)
  // ════════════════════════════════════════════════════════════════════════════
  function _buildExitSegments() {
    let camExitStart = null;
    const camStory = new THREE.Vector3(0, 0, BASE_STORY_CAM_Z);

    return [
      {
        name: 'map-out',
        duration: 0.8,
        fn_start() {
          _showHUD(false);
          _showSkipBtn(true);
        },
        fn_tick(t) {
          const canvas = document.getElementById('bg-3d');
          if (canvas) canvas.style.opacity = String(ease.inCubic(t));
        },
        fn_end() {
          if (window.MapLayer) window.MapLayer.hide();
        }
      },

      {
        name: 'retract',
        duration: 1.2,
        fn_start() {
          camExitStart = _camera.position.clone();
          // Lepaskan kunci target agar Bumi kembali berputar santai
          if (typeof Earth !== 'undefined') Earth.releaseTarget();
        },
        fn_tick(t) {
          const e = ease.outCubic(t);
          lerpV3(_camera.position, camExitStart, camStory, e);
          _camera.lookAt(0, 0, 0);
        },
        fn_end() {
          document.body.classList.remove('earth-mode');
          const main = document.getElementById('main-content');
          if (main) {
            main.style.transition = 'opacity 0.6s ease';
            main.style.opacity = '1';
          }
          _showSkipBtn(false);
          _mode = 'idle';
        }
      }
    ];
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function init(internals) {
    if (internals) {
      _scene    = internals.scene;
      _camera   = internals.camera;
      _renderer = internals.renderer;
    }
  }

  async function launch(locationId, cb) {
    const loc = _getLoc(locationId);
    if (!loc) {
      console.warn('[director] Lokasi tidak ditemukan:', locationId);
      return;
    }

    _stopLoop();
    _operationId++;
    _currentLoc = loc;
    _doneCb = cb || null;

    if (!_grabScene()) {
      console.warn('[director] Scene 3D belum siap.');
      return;
    }

    if (_mode === 'map') {
      _segments = _buildHopSegments(loc);
    } else {
      _segments = _buildLaunchSegments(loc);
    }

    _segIdx = 0;
    _segT   = 0;
    _mode   = 'launch';
    _segments[0] && _segments[0].fn_start && _segments[0].fn_start();
    _startLoop();
  }

  async function hop(locationId, cb) {
    const loc = _getLoc(locationId);
    if (!loc) return;
    _stopLoop();
    _operationId++;
    _currentLoc = loc;
    _doneCb     = cb || null;
    _segments   = _buildHopSegments(loc);
    _segIdx     = 0;
    _segT       = 0;
    _mode       = 'hop';
    _segments[0] && _segments[0].fn_start && _segments[0].fn_start();
    _startLoop();
  }

  function exit(cb) {
    _stopLoop();
    _operationId++;
    _doneCb   = cb || null;
    _segments = _buildExitSegments();
    _segIdx   = 0;
    _segT     = 0;
    _mode     = 'exit';
    _segments[0] && _segments[0].fn_start && _segments[0].fn_start();
    _startLoop();
  }

  function skip() {
    if (!_segments.length || _segIdx >= _segments.length) return;
    const lastSegIdx = _segments.length - 1;
    for (let i = _segIdx; i < lastSegIdx; i++) {
      _segments[i].fn_end && _segments[i].fn_end();
    }
    _segIdx = lastSegIdx;
    _segT = _segments[lastSegIdx].duration;
  }

  function onProgress(cb) { _progressCb = cb; }
  function getMode() { return _mode; }

  return { init, launch, hop, exit, skip, onProgress, getMode };
})();

window.Director = Director;
