/**
 * Flapcrypt Lightweight Celebration Confetti
 * Spawns mechanical split-flap style rectangular confetti with physics and tumbling.
 * Zero external dependencies. Self-cleaning after 2.5 seconds or instantly stopped.
 */

export class Confetti {
  static _animFrameId = null;

  static stop() {
    if (Confetti._animFrameId) {
      cancelAnimationFrame(Confetti._animFrameId);
      Confetti._animFrameId = null;
    }
    const canvas = document.getElementById('confettiCanvas');
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  static burst(options = {}) {
    if (typeof window === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Stop any existing celebration first
    Confetti.stop();

    const count = options.count || 45;
    const colors = options.colors || [
      '#F59E0B', // Bright Gold
      '#10B981', // Emerald
      '#F3EDE2', // Crisp Cream
      '#D97706', // Warm Amber
      '#34D399', // Bright Mint
      '#06B6D4', // Cyan Solenoid
      '#FCD34D'  // Pale Gold
    ];

    let canvas = document.getElementById('confettiCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confettiCanvas';
      canvas.className = 'confetti-canvas';
      document.body.appendChild(canvas);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const particles = [];
    const originX = width / 2;
    const originY = height * 0.35;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 7 + Math.random() * 11;
      particles.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        w: 9 + Math.random() * 6,
        h: 6 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotSpeedX: 0.05 + Math.random() * 0.1,
        rotSpeedY: 0.04 + Math.random() * 0.08,
        opacity: 1,
        gravity: 0.32 + Math.random() * 0.08,
        drag: 0.975
      });
    }

    let startTime = performance.now();
    const duration = 2500;

    function render(now) {
      const elapsed = now - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, width, height);
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        Confetti._animFrameId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const fadeProgress = Math.max(0, (elapsed - 1600) / 900);
      const globalOpacity = Math.max(0, 1 - fadeProgress);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotX += p.rotSpeedX;
        p.rotY += p.rotSpeedY;

        const currentOpacity = p.opacity * globalOpacity;
        if (currentOpacity <= 0.01) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotX);
        ctx.scale(1, Math.cos(p.rotY));
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentOpacity;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      Confetti._animFrameId = requestAnimationFrame(render);
    }

    Confetti._animFrameId = requestAnimationFrame(render);
  }
}
