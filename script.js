/* ========================================
   DC Portfolio — Interactions
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initParticleBackground();
  initScrollReveal();
  initSmoothScroll();
});

/* ========================================
   Particle Background (Antigravity-style)
   ========================================
   A canvas-based particle system where small
   dashes/dots drift gently. The mouse cursor
   acts as a soft "flashlight" that brightens
   nearby particles AND gently pushes them
   away, creating the signature Antigravity feel.
   ======================================== */
function initParticleBackground() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let smoothMouse = { x: -9999, y: -9999 };
  const LERP = 0.06; // smooth mouse tracking

  // --- Configuration ---
  const CONFIG = {
    // Particle count scales with screen area
    densityFactor: 0.00012,
    minParticles: 80,
    maxParticles: 300,

    // Particle appearance
    baseAlpha: 0.12,        // resting opacity (very subtle)
    glowAlpha: 0.55,        // opacity when near cursor
    particleMinSize: 1,
    particleMaxSize: 2.5,
    dashMinLength: 3,
    dashMaxLength: 10,

    // Colors — muted tones matching the theme
    colors: [
      'rgba(124, 138, 170,',  // accent blue-grey
      'rgba(100, 120, 160,',  // steel blue
      'rgba(140, 130, 170,',  // muted lavender
      'rgba(110, 140, 150,',  // slate teal
      'rgba(150, 145, 165,',  // dusty mauve
    ],

    // Mouse interaction
    glowRadius: 180,        // px — area of influence
    repelStrength: 0.6,     // how strongly particles push away
    repelRadius: 120,       // px — repulsion zone (smaller than glow)
    returnSpeed: 0.02,      // how fast particles drift back home

    // Drift (ambient motion)
    driftSpeed: 0.15,
  };

  // --- Resize handler ---
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = document.documentElement.scrollHeight;
    if (particles.length === 0) createParticles();
  }

  // --- Create particles ---
  function createParticles() {
    const count = Math.min(
      CONFIG.maxParticles,
      Math.max(CONFIG.minParticles, Math.floor(width * height * CONFIG.densityFactor))
    );

    particles = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        // Home position (where the particle wants to return)
        homeX: x,
        homeY: y,
        // Current position
        x: x,
        y: y,
        // Visual properties
        size: CONFIG.particleMinSize + Math.random() * (CONFIG.particleMaxSize - CONFIG.particleMinSize),
        dashLength: CONFIG.dashMinLength + Math.random() * (CONFIG.dashMaxLength - CONFIG.dashMinLength),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.003,
        color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
        // Ambient drift
        driftAngle: Math.random() * Math.PI * 2,
        driftRadius: 5 + Math.random() * 15,
        driftOffset: Math.random() * Math.PI * 2,
        // Physics
        vx: 0,
        vy: 0,
      });
    }
  }

  // --- Mouse tracking ---
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY + window.scrollY; // account for scroll
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Also update on scroll (so the glow position stays correct)
  window.addEventListener('scroll', () => {
    // The mouse position in page-space stays the same
    // but we need to re-derive it if the user scrolls without moving
  }, { passive: true });

  // --- Animation loop ---
  let lastTime = 0;

  function animate(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 16.67, 3); // normalize to ~60fps, cap delta
    lastTime = timestamp;

    // Smooth mouse position
    smoothMouse.x += (mouse.x - smoothMouse.x) * LERP;
    smoothMouse.y += (mouse.y - smoothMouse.y) * LERP;

    ctx.clearRect(0, 0, width, height);

    const scrollY = window.scrollY;
    const viewTop = scrollY;
    const viewBottom = scrollY + window.innerHeight;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Only fully process particles near the viewport (performance)
      const inView = p.y > viewTop - 100 && p.y < viewBottom + 100;

      // Ambient drift
      p.driftOffset += 0.003 * dt;
      const driftX = Math.cos(p.driftAngle + p.driftOffset) * p.driftRadius * CONFIG.driftSpeed;
      const driftY = Math.sin(p.driftAngle + p.driftOffset) * p.driftRadius * CONFIG.driftSpeed;

      // Target position = home + drift
      const targetX = p.homeX + driftX;
      const targetY = p.homeY + driftY;

      // Mouse repulsion
      const dx = p.x - smoothMouse.x;
      const dy = p.y - smoothMouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONFIG.repelRadius && dist > 0) {
        const force = (1 - dist / CONFIG.repelRadius) * CONFIG.repelStrength * dt;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Return to target (spring)
      p.vx += (targetX - p.x) * CONFIG.returnSpeed * dt;
      p.vy += (targetY - p.y) * CONFIG.returnSpeed * dt;

      // Damping
      p.vx *= 0.92;
      p.vy *= 0.92;

      // Apply velocity
      p.x += p.vx;
      p.y += p.vy;

      // Rotation
      p.rotation += p.rotationSpeed * dt;

      // --- Draw (only if in viewport) ---
      if (!inView) continue;

      // Calculate glow intensity based on distance to mouse
      const glowDist = Math.sqrt(
        (p.x - smoothMouse.x) ** 2 +
        (p.y - smoothMouse.y) ** 2
      );
      const glowFactor = Math.max(0, 1 - glowDist / CONFIG.glowRadius);
      const alpha = CONFIG.baseAlpha + (CONFIG.glowAlpha - CONFIG.baseAlpha) * glowFactor * glowFactor;

      // Render position relative to canvas (which is in page space)
      const rx = p.x;
      const ry = p.y;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(p.rotation);
      ctx.strokeStyle = p.color + alpha + ')';
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-p.dashLength / 2, 0);
      ctx.lineTo(p.dashLength / 2, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Soft glow around cursor (very subtle radial gradient)
    if (smoothMouse.x > -1000) {
      const gradient = ctx.createRadialGradient(
        smoothMouse.x, smoothMouse.y, 0,
        smoothMouse.x, smoothMouse.y, CONFIG.glowRadius
      );
      gradient.addColorStop(0, 'rgba(124, 138, 170, 0.03)');
      gradient.addColorStop(0.5, 'rgba(124, 138, 170, 0.015)');
      gradient.addColorStop(1, 'rgba(124, 138, 170, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(smoothMouse.x, smoothMouse.y, CONFIG.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  // --- Debounced resize ---
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
      createParticles();
    }, 200);
  });

  // --- Init ---
  resize();
  requestAnimationFrame(animate);

  // Re-calculate canvas height on scroll to accommodate dynamic content
  let lastHeight = 0;
  setInterval(() => {
    const newHeight = document.documentElement.scrollHeight;
    if (newHeight !== lastHeight) {
      lastHeight = newHeight;
      canvas.height = newHeight;
      height = newHeight;
    }
  }, 2000);
}

/* ========================================
   Scroll Reveal (Intersection Observer)
   ======================================== */
function initScrollReveal() {
  const elements = document.querySelectorAll('.project-card, .reveal');

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // animate only once
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ========================================
   Smooth Scroll for Anchor Links
   ======================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });
}
