/**
 * EARTH.JS — Bola Bumi 3D untuk Website Profil Muhammad Dzaki Al Siraj
 * Fitur:
 *   - Terletak di dalam bola prisma (terbungkus saat di beranda, terekspos saat di cerita)
 *   - Radius 0.88 (pas di dalam cangkang prisma radius 1.0)
 *   - ShaderMaterial: siang/malam (lampu kota), awan, laut spekuler, smooth terminator
 *   - Kemiringan aksial 23.4°
 *   - Rotasi presisi ke Indonesia / Lombok Mataram (Slerp sinematik)
 *   - Marker ring berdenyut tepat di lokasi koordinat
 */

const Earth = (() => {
  let _earthGroup  = null; // group induk bumi
  let _globeMesh   = null; // sphere bumi
  let _cloudMesh   = null; // cloud sphere
  let _atmMesh     = null; // atmosfer sphere
  let _markerGroup = null; // pulsing ring marker
  let _uniforms    = null; // ShaderMaterial uniforms
  let _dirLight    = null; // directional light
  let _ambient     = null; // ambient light

  let _textureLoader = null;
  let _loadedTextures = {};

  const AXIAL_TILT_DEG = 23.4;
  const EARTH_RADIUS = 0.88; // Pas di dalam cangkang prisma (radius 1.0)

  // Slerp rotasi ke koordinat target
  const _slerpStartQ  = new THREE.Quaternion();
  const _slerpTargetQ = new THREE.Quaternion();
  let _isTargeting    = false;

  // ── Konversi Presisi Koordinat Geografis (Lat, Lng) ke Vector3 Sphere ────
  // Sesuai pemetaan UV Three.js SphereGeometry (u=0.5 -> Prime Meridian, u=0.8225 -> Indonesia)
  function _getSpherePoint(lat, lng, r = EARTH_RADIUS) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      - r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // ── 1x1 Pixel Placeholder Canvas ──────────────────────────────────────────
  function _placeholder(r, g, b, a = 255) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    ctx.fillRect(0, 0, 1, 1);
    return new THREE.CanvasTexture(c);
  }

  // ── Load Texture dengan Promise ───────────────────────────────────────────
  function _loadTex(path, fallbackRgb, missingTextures, onProgress) {
    if (_loadedTextures[path]) return Promise.resolve(_loadedTextures[path]);
    return new Promise((resolve) => {
      _textureLoader.load(
        path,
        (tex) => {
          tex.encoding = THREE.sRGBEncoding;
          _loadedTextures[path] = tex;
          resolve(tex);
        },
        onProgress,
        () => {
          missingTextures.push(path);
          resolve(_placeholder(...fallbackRgb));
        }
      );
    });
  }

  // ── Vertex Shader ─────────────────────────────────────────────────────────
  const VERTEX_SHADER = /* glsl */`
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vUv       = uv;
      vNormal   = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // ── Fragment Shader ───────────────────────────────────────────────────────
  const FRAGMENT_SHADER = /* glsl */`
    uniform sampler2D tDay;
    uniform sampler2D tNight;
    uniform sampler2D tClouds;
    uniform sampler2D tOcean;
    uniform vec3  sunDirection;
    uniform float time;
    uniform float cloudOpacity;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      float NdotL = dot(normalize(vNormal), normalize(sunDirection));
      float dayMix = smoothstep(-0.10, 0.12, NdotL);

      vec4 colDay    = texture2D(tDay, vUv);
      vec4 colNight  = texture2D(tNight, vUv);
      vec4 colCloud  = texture2D(tClouds, vUv);
      float oceanMask = texture2D(tOcean, vUv).r;

      // Desaturasi 10% + sedikit boost kontras agar elegan
      float lum = dot(colDay.rgb, vec3(0.299, 0.587, 0.114));
      colDay.rgb = mix(vec3(lum), colDay.rgb, 0.90);
      colDay.rgb = (colDay.rgb - 0.5) * 1.06 + 0.5;

      // Kilau spekuler laut pada sisi siang
      float spec = 0.0;
      if (NdotL > 0.0) {
        float shine = pow(max(0.0, NdotL), 36.0);
        spec = shine * oceanMask * 0.32;
      }

      // Lampu kota di sisi malam
      vec3 nightEmissive = colNight.rgb * max(0.0, 1.0 - dayMix) * 1.1;
      vec3 color = mix(colNight.rgb * 0.06, colDay.rgb + spec, dayMix);
      color += nightEmissive;

      // Lapisan awan (alpha blend)
      float cloudAlpha = colCloud.a * cloudOpacity;
      vec3 cloudCol = mix(vec3(0.08), vec3(0.96), dayMix);
      color = mix(color, cloudCol, cloudAlpha * 0.80);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // ── Shader Atmosfer (Fresnel Halus) ───────────────────────────────────────
  const ATM_VERTEX = /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal  = normalize(normalMatrix * normal);
      vViewDir = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const ATM_FRAGMENT = /* glsl */`
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 3.2);
      vec3 atmColor = mix(vec3(0.08, 0.35, 0.85), vec3(0.25, 0.70, 0.95), fresnel);
      gl_FragColor  = vec4(atmColor, fresnel * 0.55);
    }
  `;

  // ── Marker Lokasi ─────────────────────────────────────────────────────────
  function _createMarker() {
    const group = new THREE.Group();
    group.name  = 'earth-marker';

    const ringGeo = new THREE.RingGeometry(0.024, 0.040, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe10600, // Signal Red
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'marker-ring';
    group.add(ring);
    group.visible = false;
    return group;
  }

  function _placeMarker(lat, lng) {
    if (!_markerGroup || !_globeMesh) return;
    const p = _getSpherePoint(lat, lng, EARTH_RADIUS * 1.006);
    _markerGroup.position.copy(p);
    _markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize());
    _markerGroup.visible = true;
  }

  // ── Inisialisasi Bumi ─────────────────────────────────────────────────────
  async function create(scene, onProgress) {
    if (!scene || typeof THREE === 'undefined') return null;
    if (_earthGroup) return _earthGroup;

    _textureLoader = new THREE.TextureLoader();
    const cfg = typeof Quality !== 'undefined' ? Quality.getConfig() : { segments: 96 };

    // Cahaya scene untuk bumi
    _dirLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    _dirLight.position.set(-6, 4, 8);
    scene.add(_dirLight);

    _ambient = new THREE.AmbientLight(0x1a1a24, 0.5);
    scene.add(_ambient);

    _uniforms = {
      tDay:         { value: _placeholder(25, 55, 95) },
      tNight:       { value: _placeholder(4, 4, 12) },
      tClouds:      { value: _placeholder(255, 255, 255, 0) },
      tOcean:       { value: _placeholder(255, 255, 255) },
      sunDirection: { value: new THREE.Vector3(-0.7, 0.4, 0.9).normalize() },
      time:         { value: 0 },
      cloudOpacity: { value: 1.0 }
    };

    _earthGroup = new THREE.Group();
    _earthGroup.name = 'earth-group';
    _earthGroup.rotation.z = AXIAL_TILT_DEG * Math.PI / 180;

    // 1. Bola Bumi
    const seg = cfg.segments || 96;
    const globeGeo = new THREE.SphereGeometry(EARTH_RADIUS, seg, seg);
    const globeMat = new THREE.ShaderMaterial({
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms:       _uniforms
    });
    _globeMesh = new THREE.Mesh(globeGeo, globeMat);
    _globeMesh.name = 'earth-globe';
    _earthGroup.add(_globeMesh);

    // 2. Bola Awan
    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.008, Math.floor(seg * 0.75), Math.floor(seg * 0.75));
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      map: _uniforms.tClouds.value
    });
    _cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    _cloudMesh.name = 'earth-clouds';
    _earthGroup.add(_cloudMesh);

    // 3. Atmosfer
    const atmGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 48, 48);
    const atmMat = new THREE.ShaderMaterial({
      vertexShader:   ATM_VERTEX,
      fragmentShader: ATM_FRAGMENT,
      side:           THREE.BackSide,
      transparent:    true,
      blending:       THREE.AdditiveBlending,
      depthWrite:     false
    });
    _atmMesh = new THREE.Mesh(atmGeo, atmMat);
    _atmMesh.name = 'earth-atmosphere';
    _earthGroup.add(_atmMesh);

    // 4. Marker Ring (menempel sebagai anak dari _globeMesh agar ikut berotasi bersama bumi)
    _markerGroup = _createMarker();
    _globeMesh.add(_markerGroup);

    scene.add(_earthGroup);

    if (window.__earthInternals) {
      window.__earthInternals.earthUniforms = _uniforms;
    }

    // Load tekstur aktual di background
    let loaded = 0;
    const total = 4;
    const missingTextures = [];
    const prog = () => {
      loaded++;
      onProgress && onProgress(Math.round((loaded / total) * 100));
    };

    const basePath = 'assets/earth/';
    Promise.all([
      _loadTex(basePath + 'earth_atmos_2048.jpg',    [25, 55, 95],        missingTextures, prog),
      _loadTex(basePath + 'earth_lights_2048.png',   [4, 4, 12],          missingTextures, prog),
      _loadTex(basePath + 'earth_clouds_1024.png',   [255, 255, 255, 0],  missingTextures, prog),
      _loadTex(basePath + 'earth_specular_2048.jpg', [255, 255, 255],     missingTextures, prog)
    ]).then(([tDay, tNight, tClouds, tOcean]) => {
      _uniforms.tDay.value    = tDay;
      _uniforms.tNight.value  = tNight;
      _uniforms.tClouds.value = tClouds;
      _uniforms.tOcean.value  = tOcean;
      _cloudMesh.material.map = tClouds;
      _cloudMesh.material.needsUpdate = true;

      if (missingTextures.length) {
        console.warn(`[earth] Tekstur belum lengkap: ${missingTextures.join(', ')}`);
      } else {
        console.info('[earth] Tekstur siap.');
      }
    }).catch((err) => {
      console.warn('[earth] Gagal memuat tekstur:', err);
    });

    return _earthGroup;
  }

  // ── Rotasi Bumi Menghadap Koordinat Target (Indonesia / Mataram) ──────────
  function setTarget(lat, lng, immediate = false) {
    if (!_globeMesh || !_cloudMesh || !_earthGroup) return;

    const p = _getSpherePoint(lat, lng, 1);
    // Vektor hadap kamera di dunia adalah (0, 0, 1).
    // Karena _earthGroup memiliki kemiringan aksial 23.4°, kita transformasi ke koordinat grup:
    const desiredInGroup = new THREE.Vector3(0, 0, 1).applyQuaternion(_earthGroup.quaternion.clone().invert());
    _slerpTargetQ.setFromUnitVectors(p.clone().normalize(), desiredInGroup);

    if (immediate) {
      _globeMesh.quaternion.copy(_slerpTargetQ);
      _cloudMesh.quaternion.copy(_slerpTargetQ);
    } else {
      _slerpStartQ.copy(_globeMesh.quaternion);
    }

    _isTargeting = true;
    _placeMarker(lat, lng);
  }

  // ── Slerp Halus Selama Animasi Transisi ───────────────────────────────────
  function slerpTarget(progress) {
    if (!_globeMesh || !_cloudMesh || !_isTargeting) return;
    _globeMesh.quaternion.slerpQuaternions(_slerpStartQ, _slerpTargetQ, progress);
    _cloudMesh.quaternion.copy(_globeMesh.quaternion);
  }

  // ── Lepaskan Kuncian Target (Kembali Rotasi Santai) ───────────────────────
  function releaseTarget() {
    _isTargeting = false;
    if (_markerGroup) _markerGroup.visible = false;
  }

  // ── Update Setiap Frame (Animasi Idle, Cloud Fade, & Marker Pulse) ────────
  function update(time, delta, camera) {
    if (!_earthGroup || !_globeMesh || !_cloudMesh) return;

    // Rotasi santai hanya berjalan jika TIDAK sedang terkunci di target lokasi
    if (!_isTargeting) {
      _globeMesh.rotation.y += delta * 0.025;
      _cloudMesh.rotation.y += delta * 0.030;
    }

    if (_uniforms) {
      _uniforms.time.value = time;
      if (camera) {
        const dist = camera.position.length();
        // Awan perlahan transparan jika kamera sangat dekat (< 1.4 unit)
        const co = Math.min(1.0, Math.max(0.0, (dist - 1.0) / 0.7));
        _uniforms.cloudOpacity.value = co;
        _cloudMesh.material.opacity = co * 0.45;
      }
    }

    if (_markerGroup && _markerGroup.visible) {
      const ring = _markerGroup.getObjectByName('marker-ring');
      if (ring) {
        const pulse = 0.4 + 0.6 * (Math.sin(time * 4.0) * 0.5 + 0.5);
        ring.material.opacity = pulse;
        const scale = 1.0 + 0.40 * (Math.sin(time * 4.0) * 0.5 + 0.5);
        ring.scale.setScalar(scale);
      }
    }
  }

  function getGroup() {
    return _earthGroup;
  }

  function setVisible(visible) {
    if (_earthGroup) _earthGroup.visible = !!visible;
  }

  function dispose(scene) {
    if (!_earthGroup) return;
    if (scene) {
      scene.remove(_earthGroup);
      if (_dirLight) scene.remove(_dirLight);
      if (_ambient) scene.remove(_ambient);
    }
    [_globeMesh, _cloudMesh, _atmMesh].forEach((m) => {
      if (m && m.geometry) m.geometry.dispose();
      if (m && m.material && m.material.dispose) m.material.dispose();
    });
    _earthGroup = null;
    _globeMesh = null;
    _cloudMesh = null;
    _atmMesh = null;
    _markerGroup = null;
    _uniforms = null;
    _dirLight = null;
    _ambient = null;
    _isTargeting = false;
  }

  return {
    create,
    setTarget,
    slerpTarget,
    releaseTarget,
    update,
    getGroup,
    setVisible,
    dispose
  };
})();

window.Earth = Earth;
