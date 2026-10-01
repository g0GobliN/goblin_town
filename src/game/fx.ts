/**
 * Juice — particles, screen shake, hit-stop, floating text.
 *
 * One self-contained system the game loop ticks every frame. Room code just
 * calls the emitters (burst, shake, hitStop, floatText); render reads the
 * state. Everything is ephemeral — no persistence, no assets.
 */

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
};

const particles: Particle[] = [];
const floaters: Floater[] = [];

let shakeT = 0;
let shakeMag = 0;
let shakeX = 0;
let shakeY = 0;
let hitStopT = 0;
let flashT = 0;
let flashColor = "#fff";

const MAX_PARTICLES = 220;

/** Screen offset for the current frame — add to camera when rendering. */
export function shakeOffset(): { x: number; y: number } {
  return { x: Math.round(shakeX), y: Math.round(shakeY) };
}

/** Seconds of gameplay currently frozen by hit-stop. */
export function hitStopRemaining(): number {
  return hitStopT;
}

export function flashRemaining(): number {
  return flashT;
}

export function flashColorNow(): string {
  return flashColor;
}

/** Freeze gameplay briefly (impact frame). dt already elapsed is discarded. */
export function hitStop(seconds: number): void {
  hitStopT = Math.max(hitStopT, seconds);
}

export function shake(magnitude: number, seconds: number): void {
  shakeMag = Math.max(shakeMag, magnitude);
  shakeT = Math.max(shakeT, seconds);
}

export function flash(color: string, seconds = 0.08): void {
  flashColor = color;
  flashT = Math.max(flashT, seconds);
}

/**
 * Spawn a particle burst. `spread` is initial speed range, `up` biases
 * particles upward (pickups), 0 = radial (impacts).
 */
export function burst(
  x: number,
  y: number,
  opts: {
    count?: number;
    colors?: string[];
    speed?: number;
    up?: boolean;
    size?: number;
    life?: number;
    gravity?: number;
  } = {},
): void {
  const {
    count = 10,
    colors = ["#ffd93d", "#ff8a8a", "#fff"],
    speed = 90,
    up = false,
    size = 2.5,
    life = 0.55,
    gravity = 260,
  } = opts;

  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const angle = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color: colors[Math.floor(Math.random() * colors.length)]!,
      gravity,
    });
  }
}

/** Rising text ("+1", "SECRET!"). */
export function floatText(x: number, y: number, text: string, color = "#ffd93d"): void {
  if (floaters.length > 12) floaters.shift();
  floaters.push({ x, y, text, life: 0.9, color });
}

/** Tick all effects. Returns the dt gameplay should use (0 during hit-stop). */
export function tickFx(dt: number): number {
  if (hitStopT > 0) {
    hitStopT -= dt;
    // Particles keep moving during hit-stop at quarter speed — feels weighty
    const slow = dt * 0.25;
    stepParticles(slow);
    return 0;
  }

  stepParticles(dt);

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]!;
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }

  if (shakeT > 0) {
    shakeT -= dt;
    const falloff = Math.max(0, shakeT) / 0.35;
    const mag = shakeMag * Math.min(1, falloff);
    shakeX = (Math.random() - 0.5) * 2 * mag;
    shakeY = (Math.random() - 0.5) * 2 * mag;
    if (shakeT <= 0) {
      shakeMag = 0;
      shakeX = 0;
      shakeY = 0;
    }
  }

  if (flashT > 0) flashT -= dt;

  return dt;
}

function stepParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

/** Draw particles + floaters in world space (after entities, before chrome). */
export function drawFx(c: CanvasRenderingContext2D, cameraX: number, _now: number): void {
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life / (p.maxLife * 0.6)));
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = p.color;
    const s = Math.max(1, p.size);
    c.fillRect(Math.round(p.x - cameraX), Math.round(p.y), s, s);
    c.restore();
  }

  for (const f of floaters) {
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, f.life / 0.4));
    c.fillStyle = f.color;
    c.font = "8px monospace";
    c.textAlign = "center";
    c.fillText(f.text, Math.round(f.x - cameraX), Math.round(f.y));
    c.restore();
  }
  c.textAlign = "left";

  if (flashT > 0) {
    c.save();
    c.globalAlpha = Math.min(0.55, flashT * 6);
    c.fillStyle = flashColor;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
  }
}

export function clearFx(): void {
  particles.length = 0;
  floaters.length = 0;
  shakeT = 0;
  shakeMag = 0;
  hitStopT = 0;
  flashT = 0;
}
