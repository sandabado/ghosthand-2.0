export function initField(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setActive() {}, destroy() {} };
  const stage = canvas.parentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: -10, y: -10, strength: 0 };
  const particles = Array.from({ length: 146 }, (_, i) => ({
    angle: i * 2.399963,
    radius: 0.15 + Math.sqrt(((i < 66 ? i : i - 66) + 0.5) / (i < 66 ? 66 : 80)) * 0.57,
    speed: 0.035 + (i % 7) * 0.006, size: i % 9 === 0 ? 1.3 : 0.65,
    phase: (i * 1.71) % (Math.PI * 2), extra: i >= 66,
  }));
  let width = 1, height = 1, scale = 1, time = 0, last = 0, frame = 0;
  let active = true, inView = true, destroyed = false, pulse = null;
  let energy = 0, energyTarget = 0;
  canvas.style.pointerEvents = 'none';
  canvas.setAttribute('aria-hidden', 'true');

  function draw(delta = 0) {
    time += delta;
    energy += (energyTarget - energy) * (1 - Math.exp(-delta * 3.4));
    if (Math.abs(energyTarget - energy) < 0.001) energy = energyTarget;
    ctx.clearRect(0, 0, width, height);
    const span = Math.min(width, height) * 0.86;
    const cx = width * 0.55, cy = height * 0.48;
    const sway = Math.sin(time * 0.12) * 0.08;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.44 + i * 0.19 + sway);
      ctx.beginPath();
      ctx.ellipse(0, 0, span * (0.37 + i * 0.07), span * (0.14 + i * 0.045), 0,
        -2.5 + i * 0.5 + time * 0.015, 0.25 + i * 0.5 + time * 0.015);
      ctx.strokeStyle = `rgba(166,220,179,${(0.12 - i * 0.017) * (1 + energy * 0.4)})`;
      ctx.stroke();
      ctx.restore();
    }
    for (const p of particles) {
      if (p.extra && energy < 0.001) continue;
      const angle = p.angle + time * p.speed;
      let x = cx + Math.cos(angle) * span * p.radius;
      let y = cy + Math.sin(angle) * span * p.radius * 0.69;
      const dx = pointer.x - x, dy = pointer.y - y;
      const distance = Math.hypot(dx, dy);
      const reach = 190 + energy * 100;
      if (distance < reach && pointer.strength > 0) {
        const force = (1 - distance / reach) * pointer.strength;
        x += dx * force * (0.16 + energy * 0.19);
        y += dy * force * (0.16 + energy * 0.19);
      }
      if (pulse) {
        const dxp = x - pulse.x, dyp = y - pulse.y, d = Math.hypot(dxp, dyp);
        const edge = Math.abs(d - pulse.age * 270);
        if (edge < 65 && d > 0) {
          const push = (1 - edge / 65) * Math.max(0, 1 - pulse.age / 2) * 15;
          x += dxp / d * push;
          y += dyp / d * push;
        }
      }
      const opacity = (0.2 + (Math.sin(time * 0.8 + p.phase) + 1) * 0.18)
        * (p.extra ? energy * 0.67 : 1);
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(195,238,197,${opacity})`;
      ctx.fill();
    }
    if (pulse) {
      pulse.age += delta;
      ctx.save();
      ctx.shadowColor = 'rgba(160,235,172,0.45)';
      ctx.shadowBlur = pulse.rings ? 6 : 0;
      for (let i = 0; i < (pulse.rings || 1); i++) {
        const age = pulse.age - i * 0.28;
        if (age < 0 || age > 2) continue;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, age * 270, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(177,232,183,${(1 - age / 2) * (pulse.rings ? 0.27 : 0.19)})`;
        ctx.stroke();
      }
      ctx.restore();
      if (pulse.age > 2.4) pulse = null;
    }
  }

  function canAnimate() {
    return active && !motion.matches && inView && !document.hidden && !destroyed;
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    draw(delta);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (destroyed) return;
    if (canAnimate()) {
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (inView && !document.hidden) draw();
    }
  }
  function resize() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    scale = Math.min(window.devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (inView && !document.hidden) draw();
  }
  function move(event) {
    if (!canAnimate()) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.strength = 1;
  }
  function leave() { pointer.strength = 0; }
  function click(event) {
    if (!canAnimate() || event.target.closest('button,a,input,textarea,select,label')) return;
    const rect = canvas.getBoundingClientRect();
    pulse = { x: event.clientX - rect.left, y: event.clientY - rect.top, age: 0 };
  }
  function setActive(value) { active = Boolean(value); sync(); }
  function motionEvent(event) {
    if (typeof event.detail?.active === 'boolean') setActive(event.detail.active);
  }
  function energyEvent(event) {
    if (typeof event.detail?.active !== 'boolean' || destroyed) return;
    const next = Number(event.detail.active);
    if (next === energyTarget) return;
    energyTarget = next;
    if (canAnimate() && next) {
      pulse = { x: width * 0.55, y: height * 0.48, age: 0, rings: 2 };
    } else if (!canAnimate()) {
      energy = next;
      pulse = null;
      if (inView && !document.hidden) draw();
    }
  }
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }, { rootMargin: '40px' });
  const observer = new ResizeObserver(resize);
  intersection.observe(canvas);
  observer.observe(canvas);
  stage?.addEventListener('pointermove', move, { passive: true });
  stage?.addEventListener('pointerleave', leave, { passive: true });
  stage?.addEventListener('click', click);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('ghosthand-motion', motionEvent);
  window.addEventListener('ghosthand-energy', energyEvent);
  resize();
  sync();

  return {
    setActive,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      intersection.disconnect();
      observer.disconnect();
      stage?.removeEventListener('pointermove', move);
      stage?.removeEventListener('pointerleave', leave);
      stage?.removeEventListener('click', click);
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('ghosthand-motion', motionEvent);
      window.removeEventListener('ghosthand-energy', energyEvent);
      ctx.clearRect(0, 0, width, height);
    },
  };
}
