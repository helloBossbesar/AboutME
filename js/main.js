/**
 * MAIN.JS — Logika Interaktivitas, Strip Kode, Scene 3D Global & Aksesibilitas
 * Website Profil Pribadi Muhammad Dzaki Al Siraj
 * Palet: Charcoal, Moonlit Silver, Signal Red, Terminal Green
 * Perbaikan Bug: Latar 3D Global, Hujan Kode, Layering Z-Index Positif, MeshStandardMaterial
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
  // 2. SCENE 3D GLOBAL (FIXED DI PUSAT VIEWPORT, Z-INDEX 0)
  // ========================================================================
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
  } else if (prefersReducedMotion) {
    activateGlobalFallback();
    console.log('[bg-3d] ok (reduced-motion fallback)');
  } else if (bg3dCanvas) {
    try {
      // Scene, Kamera Perspektif (FOV 45 untuk kedalaman)
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(0, 0, 5.0);

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

      // Objek Utama: Ikosahedron Low-Poly (#1A1A1A) di PUSAT (0, 0, 0)
      const mainGroup = new THREE.Group();
      scene.add(mainGroup);

      const baseRadius = 1.0;
      const icoGeo = new THREE.IcosahedronGeometry(baseRadius, 1);

      // MeshStandardMaterial dengan flatShading: true untuk bentuk low-poly otentik
      const icoMat = new THREE.MeshStandardMaterial({
        color: 0x1A1A1A,
        flatShading: true,
        roughness: 0.9,
        metalness: 0.1
      });
      const icoMesh = new THREE.Mesh(icoGeo, icoMat);
      mainGroup.add(icoMesh);

      // Garis Tepi Silver dengan opasitas redup ~20%
      const edgesGeo = new THREE.EdgesGeometry(icoGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0xC0C0C0,
        transparent: true,
        opacity: 0.20
      });
      const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
      mainGroup.add(edgesLine);

      // Fungsi Penyesuaian Skala Responsif: Diameter sekitar min(70vh, 60vw)
      const updateObjectScale = () => {
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
        const visibleWidth = visibleHeight * camera.aspect;
        const isMobile = window.innerWidth < 768 || isTouchDevice;
        const mobileMultiplier = isMobile ? 0.8 : 1.0;
        const targetWorldDiameter = Math.min(visibleHeight * 0.70, visibleWidth * 0.60) * mobileMultiplier;
        const targetScale = (targetWorldDiameter / 2) / baseRadius;
        mainGroup.scale.setScalar(targetScale);
      };
      updateObjectScale();

      // Pencahayaan
      // 1. Point Light merah (#E10600) mengitari objek pada jalur elips
      const redPointLight = new THREE.PointLight(0xE10600, 2.6, 12);
      scene.add(redPointLight);

      // 2. Directional Light Silver redup dari kiri-atas
      const silverDirLight = new THREE.DirectionalLight(0xC0C0C0, 0.35);
      silverDirLight.position.set(-3.5, 4.0, 3.0);
      scene.add(silverDirLight);

      // 3. Ambient Light sangat rendah
      const ambientLight = new THREE.AmbientLight(0x0C0C0C);
      scene.add(ambientLight);

      // Sinar Cahaya Merah Tipis dengan Tepi Lembut (CanvasTexture gradient)
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
        rayMesh.position.z = -1.2 - i * 0.3; // Di belakang objek agar lembut
        scene.add(rayMesh);
        rays.push({ mesh: rayMesh, speed: 0.002 + i * 0.001, offset: i * 1.5 });
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

          targetRotX = -mouseY * 0.4;
          targetRotY = mouseX * 0.4;

          targetCamX = mouseX * 0.3;
          targetCamY = mouseY * 0.3;
        });
      }

      // Konstanta Rotasi Berdasarkan Scroll
      const SCROLL_ROTATION = true;

      // Resize Handler
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

      // Loop Animasi Tunggal
      let time = 0;
      const animateGlobal3D = () => {
        requestAnimationFrame(animateGlobal3D);

        if (document.hidden) return;

        time += 0.012;

        // 1. Gerakan Cahaya Merah pada Jalur Elips
        redPointLight.position.x = Math.cos(time * 0.35) * 3.2;
        redPointLight.position.y = Math.sin(time * 0.35) * 2.0;
        redPointLight.position.z = Math.sin(time * 0.35) * 1.4 + 2.2;

        // 2. Rotasi Diam Lambat
        idleRotY += 0.0022;
        idleRotX += 0.0008;

        // 3. Rotasi Progres Scroll (Posisi objek tetap di tengah!)
        let scrollRotationAngle = 0;
        if (SCROLL_ROTATION) {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress = maxScroll > 0 ? (window.scrollY || window.pageYOffset) / maxScroll : 0;
          scrollRotationAngle = scrollProgress * (0.6 * Math.PI);
        }

        // 4. Lerp Kursor & Parallax Kamera
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
          // Mode sentuh: Rotasi otomatis lambat + scroll progress
          mainGroup.rotation.x = idleRotX;
          mainGroup.rotation.y = idleRotY + scrollRotationAngle;
        }

        // 5. Animasi Lembut Sinar Merah di Belakang
        for (let i = 0; i < rays.length; i++) {
          const r = rays[i];
          r.mesh.position.y = Math.sin(time * 0.8 + r.offset) * 0.15;
          r.mesh.rotation.z = rayAngles[i] + Math.cos(time * 0.5 + r.offset) * 0.02;
        }

        renderer.render(scene, camera);
      };

      animateGlobal3D();

      window.addEventListener('beforeunload', () => {
        icoGeo.dispose();
        icoMat.dispose();
        edgesGeo.dispose();
        edgesMat.dispose();
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
  const projectCards = document.querySelectorAll('.project-card');

  if (!isTouchDevice && !prefersReducedMotion) {
    projectCards.forEach((card) => {
      const inner = card.querySelector('.project-card__inner');
      if (!inner) return;

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
  // 5. TANDAI LINK NAV AKTIF SESUAI SEKSI (IntersectionObserver)
  // ========================================================================
  const observedSections = document.querySelectorAll('section[id]');
  if (observedSections.length > 0 && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentId = entry.target.getAttribute('id');
            navLinks.forEach((link) => {
              if (link.getAttribute('href') === `#${currentId}`) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
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

  // ========================================================================
  // 6. ANIMASI MUNCUL HALUS (FADE + TRANSLATE Y)
  // ========================================================================
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const animatedElements = document.querySelectorAll(
      '.hero-container, .page-section, .project-card, .profile-pass-ticket, .about-bio-panel'
    );

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
      el.classList.add('reveal-init');
      revealObserver.observe(el);
    });
  }
});
