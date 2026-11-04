/**
 * MAIN.JS — Logika Interaktivitas, Router Ringan, Scene 3D Global & Aksesibilitas
 * Website Profil Pribadi Muhammad Dzaki Al Siraj
 * Palet: Charcoal, Moonlit Silver, Signal Red, Terminal Green
 * Fitur: Router Ringan SPA, Transisi Konten 60fps, Bola 3D Pecah (Shatter ↔ Assemble)
 */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;

  // ========================================================================
  // 1. STRIP KODE (CODE RAIL) DI KANAN VIEWPORT
  // ========================================================================
  // TODO: atur warna/kecepatan/arah di sini
  const RAIN_DIRECTION = 'down'; // 'down', 'up', 'alternate'
  const CODE_COLOR = '#35D07F';   // Hijau terminal
  const CODE_FPS = 30;

  try {
    const codeCanvas = document.getElementById('code-rail');
    if (codeCanvas) {
      const ctx = codeCanvas.getContext('2d');
      let animationFrameId = null;
      let lastTimestamp = 0;
      const interval = 1000 / CODE_FPS;

      // Karakter abstrak dan token pendek acak
      const CHAR_SET = '01{}[]()<>/=;:*#$%%&_|';
      const TOKEN_SET = ['fn', 'if', '=>', '</>', '0xFF', 'let', '::', '0x00'];
      const FONT_SIZE = 14;
      const COL_WIDTH = 18;

      let columns = [];
      let width = 0;
      let height = 0;

      const initCodeRail = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = codeCanvas.clientWidth || 100;
        height = window.innerHeight;
        codeCanvas.width = width * dpr;
        codeCanvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const numCols = Math.max(1, Math.floor(width / COL_WIDTH));
        columns = [];

        for (let i = 0; i < numCols; i++) {
          let colDir = RAIN_DIRECTION;
          if (RAIN_DIRECTION === 'alternate') {
            colDir = i % 2 === 0 ? 'down' : 'up';
          }

          const tailLen = Math.floor(Math.random() * 15) + 10;
          const speed = Math.random() * 70 + 40;

          const chars = [];
          for (let j = 0; j < tailLen; j++) {
            chars.push(getRandomChar());
          }

          columns.push({
            x: i * COL_WIDTH + 4,
            y: Math.random() * height,
            speed,
            tailLen,
            dir: colDir,
            chars
          });
        }
      };

      const getRandomChar = () => {
        if (Math.random() < 0.2) {
          return TOKEN_SET[Math.floor(Math.random() * TOKEN_SET.length)];
        }
        return CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
      };

      const renderCodeRailFrame = (deltaSec) => {
        ctx.clearRect(0, 0, width, height);
        ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];

          if (!prefersReducedMotion) {
            if (col.dir === 'down') {
              col.y += col.speed * deltaSec;
              if (col.y - col.tailLen * FONT_SIZE > height) {
                col.y = -FONT_SIZE;
              }
            } else {
              col.y -= col.speed * deltaSec;
              if (col.y < -FONT_SIZE) {
                col.y = height + col.tailLen * FONT_SIZE;
              }
            }
          }

          for (let j = 0; j < col.chars.length; j++) {
            if (!prefersReducedMotion && Math.random() < 0.03) {
              col.chars[j] = getRandomChar();
            }

            const charY = col.dir === 'down'
              ? col.y - j * FONT_SIZE
              : col.y + j * FONT_SIZE;

            if (charY < -20 || charY > height + 20) continue;

            const fadeFrac = 1 - j / col.tailLen;
            let alpha = Math.max(0, fadeFrac * 0.55);

            if (charY < 80) {
              alpha *= charY / 80;
            } else if (charY > height - 80) {
              alpha *= (height - charY) / 80;
            }

            if (alpha <= 0.01) continue;

            ctx.fillStyle = CODE_COLOR;
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.fillText(col.chars[j], col.x, charY);
          }
        }
        ctx.globalAlpha = 1.0;
      };

      const loopCodeRail = (timestamp) => {
        if (document.hidden) {
          animationFrameId = requestAnimationFrame(loopCodeRail);
          return;
        }

        if (!lastTimestamp) lastTimestamp = timestamp;
        const elapsed = timestamp - lastTimestamp;

        if (elapsed >= interval) {
          lastTimestamp = timestamp - (elapsed % interval);
          renderCodeRailFrame(elapsed / 1000);
        }

        if (!prefersReducedMotion) {
          animationFrameId = requestAnimationFrame(loopCodeRail);
        }
      };

      if (window.innerWidth >= 600) {
        initCodeRail();
        if (prefersReducedMotion) {
          renderCodeRailFrame(0.016);
        } else {
          animationFrameId = requestAnimationFrame(loopCodeRail);
        }
      }

      window.addEventListener('resize', () => {
        if (window.innerWidth >= 600) {
          initCodeRail();
          if (prefersReducedMotion) renderCodeRailFrame(0.016);
        }
      });

      console.log('[code-rail] ok');
    }
  } catch (err) {
    console.error('[code-rail]', err);
  }

  // ========================================================================
  // 2. SCENE 3D GLOBAL (DUA KEADAAN: UTUH ↔ PECAH / SHATTER)
  // ========================================================================
  // TODO: atur detail serpihan (2 = ~320 sisi desktop, 1 = ~80 sisi mobile)
  const SHARD_DETAIL = window.innerWidth < 768 ? 1 : 2;
  // TODO: atur durasi ledakan dan penyusunan kembali (milidetik)
  const SHATTER_DURATION = 1900;
  const ASSEMBLE_DURATION = 1600;
  // TODO: atur interaktivitas kursor dan dolly scroll
  const CURSOR_REPEL = true;
  const SCROLL_DOLLY = true;

  // Global scene API hook for router
  window.__scene3D = {
    shatter: () => {},
    assemble: () => {},
    isShattered: () => false
  };

  const bg3dCanvas = document.getElementById('bg-3d');
  const bg3dFallback = document.getElementById('bg-3d-fallback');

  const activateGlobalFallback = () => {
    if (bg3dCanvas) bg3dCanvas.style.display = 'none';
    if (bg3dFallback) {
      bg3dFallback.style.display = 'flex';
      bg3dFallback.style.zIndex = '0';
    }
  };

  if (typeof THREE === 'undefined') {
    console.error('[bg-3d] THREE is undefined');
    activateGlobalFallback();
  } else if (bg3dCanvas) {
    try {
      const isInitialStory = document.body.getAttribute('data-view') === 'story' ||
                             window.location.pathname.endsWith('tentang.html');

      const scene = new THREE.Scene();
      // Ruang hampa: Fog lembut senada canvas
      scene.fog = new THREE.Fog(0x0F0F0F, 9, 26);

      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      const BASE_CAM_Z = 5.0;
      const SHATTER_CAM_Z = 6.0;
      camera.position.set(0, 0, isInitialStory ? SHATTER_CAM_Z : BASE_CAM_Z);

      // Konfigurasi Renderer
      const isMobileScreen = window.innerWidth < 768;
      const targetDpr = Math.min(window.devicePixelRatio || 1, isMobileScreen ? 1 : 1.5);

      bg3dCanvas.width = window.innerWidth * targetDpr;
      bg3dCanvas.height = window.innerHeight * targetDpr;

      const renderer = new THREE.WebGLRenderer({
        canvas: bg3dCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(targetDpr);
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      // Wadah Utama Objek (Pusat 0,0,0)
      const mainGroup = new THREE.Group();
      scene.add(mainGroup);

      // Inisialisasi bintang latar belakang
      if (typeof Stars !== 'undefined') {
        Stars.create(scene);
      }

      // Inisialisasi Bumi (radius 0.88 di pusat 0,0,0)
      // Di Beranda: terbungkus rapi di dalam bola prisma (radius 1.0)
      // Di Cerita: terekspos di tengah serpihan yang pecah melayang
      if (typeof Earth !== 'undefined') {
        Earth.create(scene);
      }

      // Base Geometry: Prisma segitiga unit (8 segitiga = 24 vertex)
      const prismGeo = new THREE.BufferGeometry();
      const pPositions = [
        // Muka luar (A, B, C)
        0, 0, 0,   1, 0, 0,   0, 1, 0,
        // Muka dalam (A_b, C_b, B_b)
        0, 0, -1,  0, 1, -1,  1, 0, -1,
        // Sisi miring (B, C, C_b, B_b)
        1, 0, 0,   0, 1, 0,   0, 1, -1,
        1, 0, 0,   0, 1, -1,  1, 0, -1,
        // Sisi sumbu X (A, B_b, B & A, A_b, B_b)
        0, 0, 0,   1, 0, -1,  1, 0, 0,
        0, 0, 0,   0, 0, -1,  1, 0, -1,
        // Sisi sumbu Y (A, C, C_b & A, C_b, A_b)
        0, 0, 0,   0, 1, 0,   0, 1, -1,
        0, 0, 0,   0, 1, -1,  0, 0, -1
      ];
      prismGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
      prismGeo.computeVertexNormals();

      // Geometri acuan bola ikosahedron
      const base = new THREE.IcosahedronGeometry(1.0, SHARD_DETAIL);
      const sphereGeo = base.index ? base.toNonIndexed() : base;
      sphereGeo.computeVertexNormals();
      const posAttr = sphereGeo.attributes.position;
      const numShards = posAttr.count / 3;

      // Pisahkan serpihan: ~10% serpihan inti emissive merah (#E10600)
      const coreShardIndices = new Set();
      const numCore = Math.max(1, Math.floor(numShards * 0.10));
      while (coreShardIndices.size < numCore) {
        coreShardIndices.add(Math.floor(Math.random() * numShards));
      }

      // Material
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1A1A1A,
        flatShading: true,
        roughness: 0.85,
        metalness: 0.15
      });

      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x2A0808,
        emissive: 0xE10600,
        emissiveIntensity: 0.6,
        flatShading: true,
        roughness: 0.7,
        metalness: 0.2
      });

      const meshDark = new THREE.InstancedMesh(prismGeo, darkMat, numShards - numCore);
      const meshCore = new THREE.InstancedMesh(prismGeo, coreMat, numCore);
      mainGroup.add(meshDark);
      mainGroup.add(meshCore);

      // Garis Tepi Silver saat bola utuh (fade out saat pecah)
      const edgesGeo = new THREE.EdgesGeometry(sphereGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0xC0C0C0,
        transparent: true,
        opacity: isInitialStory ? 0 : 0.20
      });
      const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
      mainGroup.add(edgesLine);

      // Cincin Gelombang Kejut Merah (Additive)
      const shockwaveGeo = new THREE.RingGeometry(0.8, 1.1, 48);
      const shockwaveMat = new THREE.MeshBasicMaterial({
        color: 0xE10600,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
      mainGroup.add(shockwave);

      // Partikel Debu Perak Halus di Ruang Hampa
      const dustCount = isMobileScreen ? 300 : 600;
      const dustGeo = new THREE.BufferGeometry();
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 16;
        dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0xC0C0C0,
        size: 0.035,
        transparent: true,
        opacity: isInitialStory ? 0.35 : 0,
        depthWrite: false
      });
      const dustPoints = new THREE.Points(dustGeo, dustMat);
      scene.add(dustPoints);

      // Parameter tiap serpihan
      const shardData = [];
      const v0 = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();
      const tempCenter = new THREE.Vector3();
      const tempNormal = new THREE.Vector3();
      const PRISM_THICKNESS = 0.035;

      let darkIndex = 0;
      let coreIndex = 0;

      for (let i = 0; i < numShards; i++) {
        v0.fromBufferAttribute(posAttr, i * 3);
        v1.fromBufferAttribute(posAttr, i * 3 + 1);
        v2.fromBufferAttribute(posAttr, i * 3 + 2);

        tempCenter.copy(v0).add(v1).add(v2).divideScalar(3);
        tempNormal.copy(tempCenter).normalize();

        // Matriks awal utuh M0
        const m0 = new THREE.Matrix4().set(
          v1.x - v0.x, v2.x - v0.x, tempNormal.x * PRISM_THICKNESS, v0.x,
          v1.y - v0.y, v2.y - v0.y, tempNormal.y * PRISM_THICKNESS, v0.y,
          v1.z - v0.z, v2.z - v0.z, tempNormal.z * PRISM_THICKNESS, v0.z,
          0, 0, 0, 1
        );

        const isCore = coreShardIndices.has(i);
        const instId = isCore ? coreIndex++ : darkIndex++;

        // Arah tangensial drift acak
        const randomVec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const driftTangent = new THREE.Vector3().crossVectors(tempNormal, randomVec).normalize();

        shardData.push({
          index: i,
          isCore,
          instId,
          mesh: isCore ? meshCore : meshDark,
          center: tempCenter.clone(),
          normal: tempNormal.clone(),
          m0,
          // Variasi acak jarak, rotasi, skala
          distance: Math.random() * 1.3 + 1.1, // 1.1 - 2.4 unit (orbit mengelilingi Bumi)
          delay: Math.random() * 0.12,          // 0 - 120ms
          scaleTarget: Math.random() * 0.8 + 0.6, // 0.6 - 1.4
          rotAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
          rotSpeed: (Math.random() * 0.20 + 0.05) * (Math.random() < 0.5 ? 1 : -1),
          rotAngleBase: Math.random() * Math.PI * 2,
          driftFreq1: Math.random() * 0.5 + 0.3,
          driftFreq2: Math.random() * 0.5 + 0.3,
          driftPhase1: Math.random() * Math.PI * 2,
          driftPhase2: Math.random() * Math.PI * 2,
          driftAmp1: Math.random() * 0.25 + 0.1,
          driftAmp2: Math.random() * 0.25 + 0.1,
          driftTangent
        });
      }

      // Pencahayaan
      const redPointLight = new THREE.PointLight(0xE10600, isInitialStory ? 1.6 : 2.6, 14);
      scene.add(redPointLight);

      const silverDirLight = new THREE.DirectionalLight(0xC0C0C0, 0.35);
      silverDirLight.position.set(-3.5, 4.0, 3.0);
      scene.add(silverDirLight);

      const ambientLight = new THREE.AmbientLight(0x0C0C0C);
      scene.add(ambientLight);

      // Sinar Cahaya Merah Tipis dengan Tepi Lembut
      const createSoftRayTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 512;
        const c = canvas.getContext('2d');

        const grad = c.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, 'rgba(225, 6, 0, 0)');
        grad.addColorStop(0.2, 'rgba(225, 6, 0, 0.5)');
        grad.addColorStop(0.5, 'rgba(225, 6, 0, 1.0)');
        grad.addColorStop(0.8, 'rgba(225, 6, 0, 0.5)');
        grad.addColorStop(1, 'rgba(225, 6, 0, 0)');
        c.fillStyle = grad;
        c.fillRect(0, 0, 128, 512);

        const hGrad = c.createLinearGradient(0, 0, 128, 0);
        hGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        hGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        hGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = hGrad;
        c.fillRect(0, 0, 128, 512);

        return new THREE.CanvasTexture(canvas);
      };

      const rayTex = createSoftRayTexture();
      const rayMat = new THREE.MeshBasicMaterial({
        map: rayTex,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const rays = [];
      const rayAngles = [-0.45, 0.18, 0.65];
      for (let i = 0; i < 3; i++) {
        const rayGeo = new THREE.PlaneGeometry(0.22, 8.0);
        const rayMesh = new THREE.Mesh(rayGeo, rayMat);
        rayMesh.rotation.z = rayAngles[i];
        rayMesh.position.x = (i - 1) * 1.25;
        rayMesh.position.z = -1.2 - i * 0.3;
        scene.add(rayMesh);
        rays.push({ mesh: rayMesh, speed: 0.002 + i * 0.001, offset: i * 1.5 });
      }

      // Penyesuaian Skala Responsif
      const updateObjectScale = () => {
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
        const visibleWidth = visibleHeight * camera.aspect;
        const isMobile = window.innerWidth < 768 || isTouchDevice;
        const mobileMultiplier = isMobile ? 0.8 : 1.0;
        const targetWorldDiameter = Math.min(visibleHeight * 0.70, visibleWidth * 0.60) * mobileMultiplier;
        const targetScale = (targetWorldDiameter / 2) / 1.0;
        mainGroup.scale.setScalar(targetScale);
      };
      updateObjectScale();

      // Variabel Animasi State Shatter
      let shatter = isInitialStory ? 1.0 : 0.0;
      let shatterTarget = shatter;
      let tweenMode = null; // 'shatter', 'assemble', 'direct_intro'
      let tweenStartTime = 0;
      let onShatterHalfwayFired = false;
      let onShatterHalfwayCb = null;

      // Matriks pembantu animasi (hindari alokasi memori di render loop)
      const dummyMat = new THREE.Matrix4();
      const T_C = new THREE.Matrix4();
      const T_invC = new THREE.Matrix4();
      const R_mat = new THREE.Matrix4();
      const S_mat = new THREE.Matrix4();
      const D_mat = new THREE.Matrix4();
      const qRot = new THREE.Quaternion();
      const curPos = new THREE.Vector3();

      // Update matriks serpihan ke InstancedMesh
      const updateShardMatrices = (elapsedTime) => {
        const isShatteredState = shatter > 0.001;

        for (let i = 0; i < numShards; i++) {
          const s = shardData[i];

          if (!isShatteredState) {
            s.mesh.setMatrixAt(s.instId, s.m0);
            continue;
          }

          // Posisi translasi keluar sepanjang normal + drift sinus
          const distProgress = shatter;
          curPos.copy(s.normal).multiplyScalar(s.distance * distProgress);

          // Drift halus di ruang hampa (hanya saat pecah)
          if (shatter > 0.4) {
            const d1 = Math.sin(elapsedTime * s.driftFreq1 + s.driftPhase1) * s.driftAmp1 * shatter;
            const d2 = Math.cos(elapsedTime * s.driftFreq2 + s.driftPhase2) * s.driftAmp2 * shatter;
            curPos.addScaledVector(s.driftTangent, d1);
            curPos.y += d2 * 0.5;

            // CURSOR_REPEL: Serpihan dekat kursor di ruang layar terdorong halus menjauh
            if (CURSOR_REPEL && !isTouchDevice && shatter > 0.6) {
              const ndcX = (curPos.x + s.center.x) / 3.0;
              const ndcY = (curPos.y + s.center.y) / 2.5;
              const dx = ndcX - mouseX;
              const dy = ndcY - mouseY;
              const distSq = dx * dx + dy * dy;
              if (distSq < 0.25 && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const repelForce = (1 - dist / 0.5) * 0.45;
                curPos.x += (dx / dist) * repelForce;
                curPos.y += (dy / dist) * repelForce;
              }
            }
          }

          D_mat.makeTranslation(curPos.x, curPos.y, curPos.z);

          // Rotasi sendiri
          const angle = (s.rotAngleBase + elapsedTime * s.rotSpeed) * shatter;
          qRot.setFromAxisAngle(s.rotAxis, angle);
          R_mat.makeRotationFromQuaternion(qRot);

          // Skala
          const currentScale = 1.0 + (s.scaleTarget - 1.0) * shatter;
          S_mat.makeScale(currentScale, currentScale, currentScale);

          T_C.makeTranslation(s.center.x, s.center.y, s.center.z);
          T_invC.makeTranslation(-s.center.x, -s.center.y, -s.center.z);

          // Komposisi: D * T(C) * R * S * T(-C) * M0
          dummyMat.multiplyMatrices(D_mat, T_C);
          dummyMat.multiply(R_mat);
          dummyMat.multiply(S_mat);
          dummyMat.multiply(T_invC);
          dummyMat.multiply(s.m0);

          s.mesh.setMatrixAt(s.instId, dummyMat);
        }

        meshDark.instanceMatrix.needsUpdate = true;
        meshCore.instanceMatrix.needsUpdate = true;
      };

      // Inisialisasi awal matriks
      updateShardMatrices(0);

      // API Public untuk Router
      window.__scene3D = {
        shatter: (onHalfway) => {
          shatterTarget = 1.0;
          tweenMode = 'shatter';
          tweenStartTime = performance.now();
          onShatterHalfwayFired = false;
          onShatterHalfwayCb = onHalfway;
        },
        assemble: () => {
          shatterTarget = 0.0;
          tweenMode = 'assemble';
          tweenStartTime = performance.now();
        },
        isShattered: () => shatterTarget > 0.5
      };

      // Jika direct load tentang.html, jalankan intro terbang dari jauh
      if (isInitialStory && !prefersReducedMotion) {
        tweenMode = 'direct_intro';
        tweenStartTime = performance.now();
      }

      // Variabel Interaksi Kursor & Parallax
      let mouseX = 0;
      let mouseY = 0;
      let targetRotX = 0;
      let targetRotY = 0;
      let targetCamX = 0;
      let targetCamY = 0;

      let currentCursorRotX = 0;
      let currentCursorRotY = 0;
      let currentCamX = 0;
      let currentCamY = 0;

      let idleRotY = 0;
      let idleRotX = 0;

      if (!isTouchDevice) {
        window.addEventListener('mousemove', (e) => {
          mouseX = (e.clientX / window.innerWidth) * 2 - 1;
          mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

          targetRotX = -mouseY * 0.45;
          targetRotY = mouseX * 0.45;

          targetCamX = mouseX * 0.35;
          targetCamY = mouseY * 0.35;
        });
      }

      // Handler Resize
      const onResizeGlobal3D = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        const currentMobile = window.innerWidth < 768;
        const currentDpr = Math.min(window.devicePixelRatio || 1, currentMobile ? 1 : 1.5);
        bg3dCanvas.width = window.innerWidth * currentDpr;
        bg3dCanvas.height = window.innerHeight * currentDpr;
        renderer.setPixelRatio(currentDpr);
        renderer.setSize(window.innerWidth, window.innerHeight, false);

        updateObjectScale();
      };
      window.addEventListener('resize', onResizeGlobal3D);

      // Loop Animasi Utama
      let time = 0;
      let previousFrameTime = performance.now();
      const animateGlobal3D = () => {
        requestAnimationFrame(animateGlobal3D);

        if (document.hidden) return;

        const now = performance.now();
        const deltaSec = Math.min((now - previousFrameTime) / 1000, 0.1);
        previousFrameTime = now;
        time += 0.012;
        // Update rotasi & animasi Bumi serta kedip Bintang
        if (typeof Earth !== 'undefined') Earth.update(time, deltaSec, camera);
        if (typeof Stars !== 'undefined') Stars.update(time, deltaSec);

        // 1. Logika Tween Shatter / Assemble
        if (tweenMode) {
          const elapsedMs = now - tweenStartTime;

          if (tweenMode === 'shatter') {
            const ANTICIPATE_MS = 350;
            const BURST_MS = SHATTER_DURATION - ANTICIPATE_MS;

            // Trigger callback konten masuk ~700ms setelah ledakan dimulai
            if (!onShatterHalfwayFired && elapsedMs >= 700) {
              onShatterHalfwayFired = true;
              if (onShatterHalfwayCb) onShatterHalfwayCb();
            }

            if (elapsedMs < ANTICIPATE_MS) {
              // Fase Antisipasi (0–350ms): Bola menyusut ke 0.96, cahaya menguat, getar halus
              const p = elapsedMs / ANTICIPATE_MS;
              const shrink = 1.0 - 0.04 * Math.sin(p * Math.PI * 0.5);
              mainGroup.scale.setScalar(shrink * (window.innerWidth < 768 ? 0.8 : 1.0));
              redPointLight.intensity = 2.6 + 1.8 * p;
              mainGroup.position.x = (Math.random() - 0.5) * 0.02 * p;
              mainGroup.position.y = (Math.random() - 0.5) * 0.02 * p;
              edgesMat.opacity = 0.20 * (1 - p * 0.5);
            } else if (elapsedMs < SHATTER_DURATION) {
              // Fase Ledakan (350–1900ms): Serpihan melesat dengan easeOutExpo
              mainGroup.position.set(0, 0, 0);
              edgesMat.opacity = 0;

              const burstP = (elapsedMs - ANTICIPATE_MS) / BURST_MS;
              // easeOutExpo
              const eased = burstP === 1 ? 1 : 1 - Math.pow(2, -10 * burstP);
              shatter = eased;

              // Gelombang kejut merah
              if (burstP < 0.6) {
                const shockP = burstP / 0.6;
                shockwave.scale.setScalar(0.8 + shockP * 7.5);
                shockwaveMat.opacity = (1 - shockP) * 0.8;
              } else {
                shockwaveMat.opacity = 0;
              }

              // Lonjakan cahaya merah ~250ms setelah letusan
              if (burstP < 0.25) {
                const surgeP = burstP / 0.25;
                redPointLight.intensity = 4.4 + Math.sin(surgeP * Math.PI) * 2.2;
              } else {
                redPointLight.intensity = THREE.MathUtils.lerp(redPointLight.intensity, 1.6, 0.08);
              }

              // Kamera mundur ~20% (easeOutCubic)
              const camEase = 1 - Math.pow(1 - burstP, 3);
              camera.position.z = THREE.MathUtils.lerp(BASE_CAM_Z, SHATTER_CAM_Z, camEase);
              dustMat.opacity = Math.min(0.35, burstP * 0.4);
            } else {
              shatter = 1.0;
              tweenMode = null;
              shockwaveMat.opacity = 0;
              camera.position.z = SHATTER_CAM_Z;
              redPointLight.intensity = 1.6;
              dustMat.opacity = 0.35;
              if (!onShatterHalfwayFired) {
                onShatterHalfwayFired = true;
                if (onShatterHalfwayCb) onShatterHalfwayCb();
              }
            }
          } else if (tweenMode === 'assemble') {
            // Fase Penyusunan Kembali (1600ms, easeInOutCubic)
            const p = Math.min(1, elapsedMs / ASSEMBLE_DURATION);
            const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

            shatter = 1.0 - eased;
            camera.position.z = THREE.MathUtils.lerp(SHATTER_CAM_Z, BASE_CAM_Z, eased);
            dustMat.opacity = THREE.MathUtils.lerp(0.35, 0, eased);

            if (p > 0.8) {
              edgesMat.opacity = THREE.MathUtils.lerp(0, 0.20, (p - 0.8) / 0.2);
            }

            if (p >= 1.0) {
              shatter = 0.0;
              tweenMode = null;
              edgesMat.opacity = 0.20;
              camera.position.z = BASE_CAM_Z;
              redPointLight.intensity = 2.6;
              // Denyut cahaya merah singkat di akhir
              shockwave.scale.setScalar(1.2);
              shockwaveMat.opacity = 0.4;
              setTimeout(() => { shockwaveMat.opacity = 0; }, 180);
            }
          } else if (tweenMode === 'direct_intro') {
            // Intro direct load tentang.html (1.0 dtk)
            const p = Math.min(1, elapsedMs / 1000);
            const eased = 1 - Math.pow(1 - p, 3);
            shatter = 1.0;
            edgesMat.opacity = 0;
            dustMat.opacity = Math.min(0.35, p * 0.35);
            camera.position.z = THREE.MathUtils.lerp(SHATTER_CAM_Z + 0.8, SHATTER_CAM_Z, eased);
            if (p >= 1.0) tweenMode = null;
          }
        }

        // 2. Update Matriks Serpihan 3D
        updateShardMatrices(time);

        // 3. Gerakan Titik Cahaya Merah
        if (shatter < 0.5) {
          // Mode Utuh: Jalur elips dinamis
          redPointLight.position.x = Math.cos(time * 0.35) * 3.2;
          redPointLight.position.y = Math.sin(time * 0.35) * 2.0;
          redPointLight.position.z = Math.sin(time * 0.35) * 1.4 + 2.2;
        } else {
          // Mode Pecah: Cahaya lebih tenang di pusat
          redPointLight.position.x = Math.cos(time * 0.2) * 1.5;
          redPointLight.position.y = Math.sin(time * 0.2) * 1.2;
          redPointLight.position.z = 2.0;
        }

        // 4. Rotasi Diam Lambat
        idleRotY += shatter > 0.5 ? 0.0012 : 0.0022;
        idleRotX += shatter > 0.5 ? 0.0005 : 0.0008;

        // Mode Bumi mengendalikan kamera selama animasi launch / hop / exit.
        const earthModeActive = typeof Director !== 'undefined' && Director.getMode() !== 'idle';
        if (!earthModeActive) {
          // 5. Scroll Interaction: Rotasi di Home, Dolly di Story
          let scrollRotationAngle = 0;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress = maxScroll > 0 ? (window.scrollY || window.pageYOffset) / maxScroll : 0;

          if (shatter < 0.5) {
            scrollRotationAngle = scrollProgress * (0.6 * Math.PI);
          } else if (SCROLL_DOLLY) {
            // Kamera maju-mundur halus sesuai progres scroll halaman cerita
            const targetZ = SHATTER_CAM_Z + (scrollProgress - 0.5) * 1.6;
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
          }

          // 6. Lerp Kursor & Parallax Kamera
          if (!isTouchDevice) {
            currentCursorRotX += (targetRotX - currentCursorRotX) * 0.06;
            currentCursorRotY += (targetRotY - currentCursorRotY) * 0.06;
            currentCamX += (targetCamX - currentCamX) * 0.06;
            currentCamY += (targetCamY - currentCamY) * 0.06;

            camera.position.x = currentCamX;
            camera.position.y = currentCamY;
            camera.lookAt(0, 0, 0);

            mainGroup.rotation.x = currentCursorRotX + idleRotX;
            mainGroup.rotation.y = currentCursorRotY + idleRotY + scrollRotationAngle;
          } else {
            mainGroup.rotation.x = idleRotX;
            mainGroup.rotation.y = idleRotY + scrollRotationAngle;
          }
        }

        // 7. Sinar Merah Lembut di Belakang
        for (let i = 0; i < rays.length; i++) {
          const r = rays[i];
          r.mesh.position.y = Math.sin(time * 0.8 + r.offset) * 0.15;
          r.mesh.rotation.z = rayAngles[i] + Math.cos(time * 0.5 + r.offset) * 0.02;
        }

        renderer.render(scene, camera);
      };

      animateGlobal3D();

      // ── Ekspos internals scene untuk Director (Mode Bumi) ──────────────────
      // Director.init() dipanggil oleh tentang.html setelah ini tersedia.
      window.__earthInternals = { scene, camera, renderer };

      // ── BgScene API Publik ──────────────────────────────────────────────────
      // Diakses oleh tombol "Lihat di bumi" via Director
      window.BgScene = {
        enterEarth: (stageId) => {
          if (typeof Director !== 'undefined') Director.launch(stageId);
        },
        exitEarth: () => {
          if (typeof Director !== 'undefined') Director.exit();
        },
        getMode: () => {
          if (typeof Director !== 'undefined') return Director.getMode();
          return 'idle';
        }
      };

      window.addEventListener('beforeunload', () => {
        prismGeo.dispose();
        sphereGeo.dispose();
        darkMat.dispose();
        coreMat.dispose();
        edgesGeo.dispose();
        edgesMat.dispose();
        shockwaveGeo.dispose();
        shockwaveMat.dispose();
        dustGeo.dispose();
        dustMat.dispose();
        rayMat.dispose();
        rayTex.dispose();
        renderer.dispose();
      });

      console.log('[bg-3d] ok');
    } catch (err) {
      console.error('[bg-3d]', err);
      activateGlobalFallback();
    }
  }

  // ========================================================================
  // 3. EFEK 3D TILT PADA ELEMEN DALAM KARTU PROYEK (.project-card__inner)
  // ========================================================================
  const initTiltCards = (container = document) => {
    try {
      const projectCards = container.querySelectorAll('.project-card');
      if (projectCards.length > 0 && !isTouchDevice && !prefersReducedMotion) {
        projectCards.forEach((card) => {
          const inner = card.querySelector('.project-card__inner');
          if (!inner || card.__hasTilt) return;
          card.__hasTilt = true;

          card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = Math.max(-6, Math.min(6, ((y - centerY) / centerY) * -6));
            const rotateY = Math.max(-6, Math.min(6, ((x - centerX) / centerX) * 6));

            inner.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
          });

          card.addEventListener('mouseleave', () => {
            inner.style.transform = '';
          });
        });
      }
    } catch (err) {
      console.error('[project-tilt]', err);
    }
  };
  initTiltCards();

  // ========================================================================
  // 4. MENU NAVIGASI MOBILE (HAMBURGER & AKSESIBILITAS)
  // ========================================================================
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (navToggle && navMenu) {
    const closeMobileMenu = () => {
      if (navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Buka menu navigasi');
      }
    };

    navToggle.addEventListener('click', () => {
      const isCurrentlyOpen = navMenu.classList.contains('is-open');
      const newState = !isCurrentlyOpen;
      navMenu.classList.toggle('is-open', newState);
      navToggle.setAttribute('aria-expanded', String(newState));
      navToggle.setAttribute(
        'aria-label',
        newState ? 'Tutup menu navigasi' : 'Buka menu navigasi'
      );
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', closeMobileMenu);
    });

    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && navMenu.classList.contains('is-open')) {
        closeMobileMenu();
        navToggle.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (
        navMenu.classList.contains('is-open') &&
        !navMenu.contains(e.target) &&
        !navToggle.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });
  }

  // ========================================================================
  // 5. TANDAI LINK NAV AKTIF SESUAI SEKSI & DASAR HALAMAN
  // ========================================================================
  let checkScrollNav = () => {};

  const initScrollSpy = () => {
    try {
      const currentNavLinks = document.querySelectorAll('.nav-link');
      const isIndexPage = document.getElementById('hero') !== null;
      const observedSections = isIndexPage ? document.querySelectorAll('section[id]') : [];
      let lastActiveId = isIndexPage ? 'hero' : null;

      const setActiveNavLink = (targetHash) => {
        currentNavLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href === targetHash || href.endsWith(targetHash)) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      };

      checkScrollNav = () => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const innerHeight = window.innerHeight;
        const scrollHeight = document.documentElement.scrollHeight;

        if (scrollY + innerHeight >= scrollHeight - 2) {
          setActiveNavLink('#contact');
        } else if (isIndexPage && lastActiveId) {
          setActiveNavLink(`#${lastActiveId}`);
        } else if (!isIndexPage) {
          currentNavLinks.forEach((link) => link.classList.remove('active'));
        }
      };

      if (isIndexPage && observedSections.length > 0 && 'IntersectionObserver' in window) {
        const sectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                lastActiveId = entry.target.getAttribute('id');
                const scrollY = window.scrollY || window.pageYOffset || 0;
                const innerHeight = window.innerHeight;
                const scrollHeight = document.documentElement.scrollHeight;
                if (scrollY + innerHeight < scrollHeight - 2) {
                  setActiveNavLink(`#${lastActiveId}`);
                }
              }
            });
          },
          {
            root: null,
            rootMargin: '-25% 0px -55% 0px',
            threshold: 0
          }
        );

        observedSections.forEach((sec) => sectionObserver.observe(sec));
      }

      window.removeEventListener('scroll', checkScrollNav);
      window.addEventListener('scroll', checkScrollNav, { passive: true });
      checkScrollNav();
    } catch (err) {
      console.error('[scroll-spy]', err);
    }
  };
  initScrollSpy();

  // ========================================================================
  // 6. ANIMASI MUNCUL HALUS (FADE + TRANSLATE Y)
  // ========================================================================
  const initRevealAnimations = (container = document) => {
    try {
      if (!prefersReducedMotion && 'IntersectionObserver' in window) {
        const animatedElements = container.querySelectorAll(
          '.hero-container, .page-section, .project-card, .profile-pass-ticket, .about-bio-panel, .personal-data-card, .timeline-item, .life-card, .story-opening'
        );

        if (animatedElements.length > 0) {
          const revealObserver = new IntersectionObserver(
            (entries, observer) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('reveal-active');
                  observer.unobserve(entry.target);
                }
              });
            },
            {
              root: null,
              rootMargin: '0px 0px -40px 0px',
              threshold: 0.1
            }
          );

          animatedElements.forEach((el) => {
            if (!el.classList.contains('reveal-active')) {
              el.classList.add('reveal-init');
              revealObserver.observe(el);
            }
          });
        }
      }
    } catch (err) {
      console.error('[reveal-observer]', err);
    }
  };
  initRevealAnimations();

  // ========================================================================
  // 6.5 INISIALISASI VIEW & MODE BUMI (PERSISTEN SAAT ROUTER MENGGANTI MAIN)
  // ========================================================================
  let initializedEarthScene = null;
  let earthPrefetchStarted = false;

  const initView = (main = document) => {
    if (typeof Director !== 'undefined' && window.__earthInternals &&
        initializedEarthScene !== window.__earthInternals.scene) {
      Director.init(window.__earthInternals);
      initializedEarthScene = window.__earthInternals.scene;
    }

    if (!main.querySelector('.btn-earth')) return;

    if (!earthPrefetchStarted) {
      earthPrefetchStarted = true;
      const prefetchTextures = () => {
        const connection = navigator.connection;
        if (connection && (connection.saveData ||
            connection.effectiveType === '2g' || connection.effectiveType === '3g')) return;
        const earthTextures = [
          'assets/earth/earth_atmos_2048.jpg',
          'assets/earth/earth_lights_2048.png',
          'assets/earth/earth_clouds_1024.png',
          'assets/earth/earth_specular_2048.jpg'
        ];
        earthTextures.forEach((src) => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.as = 'image';
          link.href = src;
          document.head.appendChild(link);
        });
      };
      if ('requestIdleCallback' in window) requestIdleCallback(prefetchTextures);
      else setTimeout(prefetchTextures, 1000);
    }

    if (new URLSearchParams(window.location.search).get('debug') !== 'coords' ||
        document.getElementById('debug-coords-panel') ||
        typeof LOCATIONS === 'undefined') return;

    console.table(LOCATIONS.map((loc) => ({
      id: loc.id,
      lat: loc.lat,
      lng: loc.lng,
      precision: loc.precision,
      mapsLink: `https://maps.google.com/?q=${loc.lat},${loc.lng}`
    })));

    const birth = LOCATIONS.find((loc) => loc.id === 'kelahiran');
    if (birth && typeof MATARAM_BBOX !== 'undefined' &&
        (birth.lat < MATARAM_BBOX.latMin || birth.lat > MATARAM_BBOX.latMax ||
         birth.lng < MATARAM_BBOX.lngMin || birth.lng > MATARAM_BBOX.lngMax)) {
      console.warn('[locations] Koordinat kelahiran di luar bounding box Mataram.', birth);
    }

    const panel = document.createElement('aside');
    panel.id = 'debug-coords-panel';
    panel.style.cssText = [
      'position:fixed', 'bottom:16px', 'left:16px', 'z-index:9999',
      'background:#0F0F0F', 'border:1px solid #333', 'border-radius:8px',
      'padding:12px 16px', 'font-family:JetBrains Mono,monospace', 'font-size:11px',
      'color:#C0C0C0', 'max-width:320px', 'max-height:60vh', 'overflow-y:auto'
    ].join(';');

    const heading = document.createElement('strong');
    heading.textContent = 'DEBUG: Koordinat Lokasi';
    heading.style.color = '#fff';
    panel.appendChild(heading);
    LOCATIONS.forEach((loc) => {
      const row = document.createElement('div');
      row.style.margin = '8px 0';
      row.append(`${loc.id} — ${loc.place}`, document.createElement('br'));
      row.append(`lat: ${loc.lat}, lng: ${loc.lng}`, document.createElement('br'));
      const link = document.createElement('a');
      link.href = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Buka di Google Maps ↗';
      link.style.cssText = 'color:#35D07F;text-decoration:none';
      row.appendChild(link);
      panel.appendChild(row);
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Tutup';
    closeButton.addEventListener('click', () => panel.remove());
    panel.appendChild(closeButton);
    document.body.appendChild(panel);
  };

  const navigateEarth = (direction) => {
    if (typeof Director === 'undefined' || typeof LOCATIONS === 'undefined' || !LOCATIONS.length) return;
    const active = document.querySelector('.timeline-item.earth-active');
    const currentId = active ? active.dataset.stage : LOCATIONS[0].id;
    const index = Math.max(0, LOCATIONS.findIndex((loc) => loc.id === currentId));
    const next = LOCATIONS[(index + direction + LOCATIONS.length) % LOCATIONS.length];
    Director.hop(next.id);
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    const earthButton = target.closest('.btn-earth');
    if (earthButton) {
      event.preventDefault();
      if (typeof Director === 'undefined') {
        console.warn('[earth-hud] Director belum tersedia.');
        return;
      }
      if (Director.getMode() === 'map') {
        Director.hop(earthButton.dataset.loc);
      } else {
        earthButton.textContent = 'Memuat…';
        earthButton.disabled = true;
        Director.launch(earthButton.dataset.loc, () => {
          earthButton.textContent = 'Lihat di bumi ↗';
          earthButton.disabled = false;
        }).catch((error) => {
          earthButton.textContent = 'Gagal memuat — coba lagi';
          earthButton.disabled = false;
          console.error('[earth-hud] Peluncuran gagal.', error);
        });
      }
      return;
    }

    if (target.closest('#btn-earth-exit')) {
      if (typeof Director !== 'undefined') Director.exit();
    } else if (target.closest('#btn-skip-anim')) {
      if (typeof Director !== 'undefined') Director.skip();
    } else if (target.closest('#btn-earth-prev')) {
      navigateEarth(-1);
    } else if (target.closest('#btn-earth-next')) {
      navigateEarth(1);
    } else if (target.closest('#btn-earth-credits')) {
      const button = document.getElementById('btn-earth-credits');
      const popover = document.getElementById('earth-credits-popover');
      if (button && popover) {
        popover.hidden = !popover.hidden;
        button.setAttribute('aria-expanded', String(!popover.hidden));
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    const hud = document.getElementById('earth-hud');
    const mode = typeof Director !== 'undefined' ? Director.getMode() : 'idle';
    if (event.key === 'Escape' && mode !== 'idle') {
      event.preventDefault();
      Director.exit();
      return;
    }
    if (!hud || hud.hidden) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateEarth(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateEarth(1);
    }
  });

  initView(document.getElementById('main-content') || document);

  // ========================================================================
  // 7. ROUTER RINGAN (PROGRESSIVE ENHANCEMENT & PREFETCH)
  // ========================================================================
  try {
    const pageCache = new Map();
    let isTransitioning = false;
    let homeMainNode = document.body.getAttribute('data-view') === 'home'
      ? document.getElementById('main-content')
      : null;

    const routeAnnouncer = document.getElementById('route-announcer');
    const announceRoute = (message) => {
      if (routeAnnouncer) {
        routeAnnouncer.textContent = '';
        setTimeout(() => { routeAnnouncer.textContent = message; }, 50);
      }
    };

    // Prefetch halaman
    const prefetchUrl = async (url) => {
      const cleanUrl = url.split('#')[0];
      if (pageCache.has(cleanUrl)) return;
      try {
        const res = await fetch(cleanUrl);
        if (!res.ok) return;
        const text = await res.text();
        pageCache.set(cleanUrl, text);
      } catch (e) {
        // Abaikan kegagalan prefetch
      }
    };

    // Prefetch halaman target saat idle
    const targetPrefetch = document.body.getAttribute('data-view') === 'home'
      ? 'tentang.html'
      : 'index.html';
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => prefetchUrl(targetPrefetch));
    } else {
      setTimeout(() => prefetchUrl(targetPrefetch), 1000);
    }

    // Prefetch saat mouseover/focus pada tautan internal
    document.addEventListener('mouseover', (e) => {
      const a = e.target.closest('a');
      if (a && a.href && a.origin === window.location.origin) {
        prefetchUrl(a.href);
      }
    }, { passive: true });

    document.addEventListener('focusin', (e) => {
      const a = e.target.closest('a');
      if (a && a.href && a.origin === window.location.origin) {
        prefetchUrl(a.href);
      }
    }, { passive: true });

    // Fungsi transisi antar tampilan
    const navigateTo = async (targetUrl, options = {}) => {
      if (isTransitioning) return;
      isTransitioning = true;

      const urlObj = new URL(targetUrl, window.location.href);
      const isTargetStory = urlObj.pathname.endsWith('tentang.html');
      const targetView = isTargetStory ? 'story' : 'home';
      const cleanUrl = urlObj.pathname;
      const targetHash = options.hash || urlObj.hash;

      const currentMain = document.getElementById('main-content');
      if (targetView === 'home' && typeof Director !== 'undefined' &&
          Director.getMode() !== 'idle') {
        Director.exit();
      }

      // 1. Mulai fase keluar konten
      if (currentMain) {
        currentMain.classList.remove('content-enter');
        currentMain.classList.add('content-exit');
      }

      // 2. Trigger transisi 3D
      if (targetView === 'story') {
        if (prefersReducedMotion) {
          // Tanpa animasi ledakan
          swapContent();
        } else {
          window.__scene3D.shatter(() => {
            swapContent();
          });
        }
      } else {
        if (prefersReducedMotion) {
          swapContent();
        } else {
          window.__scene3D.assemble();
          // Kembali ke home: konten mulai masuk setelah 350ms keluar
          setTimeout(swapContent, 350);
        }
      }

      // Fungsi swap elemen <main>
      async function swapContent() {
        try {
          let nextMainNode = null;
          let pageTitle = '';
          let pageDescription = '';

          if (targetView === 'home' && homeMainNode) {
            // Gunakan node home asli dari memori (event handler tilt & status tetap hidup)
            nextMainNode = homeMainNode;
            pageTitle = 'Muhammad Dzaki Al Siraj — Profil Pribadi';
            pageDescription = 'Profil pribadi Muhammad Dzaki Al Siraj, mahasiswa Universitas Bumigora.';
          } else {
            // Ambil dari cache atau fetch
            let htmlText = pageCache.get(cleanUrl) || pageCache.get(urlObj.href);
            if (!htmlText) {
              const res = await fetch(urlObj.href);
              if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
              htmlText = await res.text();
              pageCache.set(cleanUrl, htmlText);
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            nextMainNode = doc.querySelector('main');
            pageTitle = doc.title || '';
            const descMeta = doc.querySelector('meta[name="description"]');
            pageDescription = descMeta ? descMeta.getAttribute('content') : '';
          }

          if (!nextMainNode) throw new Error('Main element not found in target page');

          // Ganti konten <main>
          const parentMain = currentMain ? currentMain.parentNode : document.body;
          if (currentMain && currentMain !== nextMainNode) {
            parentMain.replaceChild(nextMainNode, currentMain);
          }

          // Perbarui metadata & URL
          if (!options.isPopState) {
            history.pushState({ view: targetView, hash: targetHash }, '', targetUrl);
          }
          if (pageTitle) document.title = pageTitle;
          if (pageDescription) {
            const currentDesc = document.querySelector('meta[name="description"]');
            if (currentDesc) currentDesc.setAttribute('content', pageDescription);
          }

          document.body.setAttribute('data-view', targetView);
          announceRoute(targetView === 'story' ? 'Halaman Cerita dimuat' : 'Beranda dimuat');

          // Reset posisi scroll atau scroll ke anchor
          if (targetHash) {
            const anchor = document.querySelector(targetHash);
            if (anchor) {
              anchor.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo(0, 0);
            }
          } else {
            window.scrollTo(0, 0);
          }

          // Fokuskan <h1> baru untuk aksesibilitas
          const newH1 = nextMainNode.querySelector('h1');
          if (newH1) {
            newH1.setAttribute('tabindex', '-1');
            newH1.focus({ preventScroll: true });
          }

          // Re-inisialisasi interaksi halaman baru
          initTiltCards(nextMainNode);
          initRevealAnimations(nextMainNode);
          initView(nextMainNode);
          initScrollSpy();

          // Jalankan animasi masuk konten
          nextMainNode.classList.remove('content-exit');
          nextMainNode.classList.add('content-enter');

          setTimeout(() => {
            if (nextMainNode) nextMainNode.classList.remove('content-enter');
            isTransitioning = false;
          }, 650);

        } catch (err) {
          console.error('[router]', err);
          // Fallback navigasi penuh
          window.location.href = targetUrl;
        }
      }
    };

    // Intercept klik tautan internal
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      const urlObj = new URL(link.href, window.location.href);
      if (urlObj.origin !== window.location.origin) return;

      const isCurrentStory = document.body.getAttribute('data-view') === 'story' ||
                             window.location.pathname.endsWith('tentang.html');
      const isTargetStory = urlObj.pathname.endsWith('tentang.html');

      // Tautan hash di halaman yang sama: biarkan navigasi internal biasa
      if (isCurrentStory === isTargetStory && urlObj.pathname === window.location.pathname && urlObj.hash) {
        return;
      }

      // Navigasi antar halaman (index <-> tentang) atau antar halaman dengan hash
      if (isCurrentStory !== isTargetStory || (isCurrentStory && urlObj.pathname.endsWith('index.html'))) {
        e.preventDefault();
        navigateTo(urlObj.href, { hash: urlObj.hash });
      }
    });

    // Popstate (Browser Back / Forward)
    window.addEventListener('popstate', (e) => {
      const isTargetStory = window.location.pathname.endsWith('tentang.html');
      const targetView = isTargetStory ? 'story' : 'home';
      const currentView = document.body.getAttribute('data-view');

      if (targetView !== currentView) {
        navigateTo(window.location.href, { isPopState: true, hash: window.location.hash });
      } else if (window.location.hash) {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });

  } catch (err) {
    console.error('[router]', err);
  }
});
