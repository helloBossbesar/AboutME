/**
 * STARS.JS — Bintang latar untuk scene 3D (THREE.Points)
 * Fitur: ukuran & kecerahan variatif, kedip halus, efek warp saat akselerasi.
 * Membutuhkan: THREE (global), Quality (global).
 */

const Stars = (() => {
  let _points = null;
  let _material = null;
  let _warp = false;
  let _warpT = 0;
  let _origSizes = null;

  const BASE_RADIUS = 50;
  const TWINKLE_SPEED = 0.4;

  function _makeStarTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  function create(scene) {
    if (!scene || typeof THREE === 'undefined') return null;
    if (_points) return _points;

    const count = typeof Quality !== 'undefined' ? Quality.getConfig().stars : 1200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = BASE_RADIUS * (0.85 + Math.random() * 0.15);

      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      sizes[i]  = 0.6 + Math.random() * 1.4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    _origSizes = sizes.slice();

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('phase',    new THREE.BufferAttribute(phases, 1));

    _material = new THREE.PointsMaterial({
      color: 0xffffff,
      map: _makeStarTexture(),
      size: 1.0,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    _points = new THREE.Points(geo, _material);
    _points.name = 'stars';
    scene.add(_points);

    return _points;
  }

  function update(time, delta) {
    if (!_points || !_material) return;

    const geo    = _points.geometry;
    const sizes  = geo.attributes.size.array;
    const phases = geo.attributes.phase.array;
    const count  = sizes.length;

    if (_warp && _warpT < 1) _warpT = Math.min(1, _warpT + delta * 1.5);
    if (!_warp && _warpT > 0) _warpT = Math.max(0, _warpT - delta * 2.0);

    for (let i = 0; i < count; i++) {
      const twinkle = 0.85 + 0.15 * Math.sin(time * TWINKLE_SPEED + phases[i]);
      sizes[i] = _origSizes[i] * twinkle;
      if (_warpT > 0) sizes[i] *= (1 + _warpT * 2.2);
    }

    geo.attributes.size.needsUpdate = true;
    _material.opacity = _warp ? 0.35 + _warpT * 0.55 : 0.75;
  }

  function setWarp(active) {
    _warp = !!active;
  }

  function dispose(scene) {
    if (!_points) return;
    if (scene) scene.remove(_points);
    _points.geometry.dispose();
    _material.map && _material.map.dispose();
    _material.dispose();
    _points = null;
    _material = null;
    _origSizes = null;
  }

  return { create, update, setWarp, dispose };
})();

window.Stars = Stars;
