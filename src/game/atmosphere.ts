/**
 * Atmosphere — day/night cycle, fireflies at dusk/night, occasional rain.
 *
 * Pure visual layer over the town: nothing here touches gameplay. The cycle
 * is slow (a full day ≈ 4 minutes of play) so it reads as ambience, not a
 * mechanic. Rain comes in short showers with long dry spells.
 */

import { VIEW_H, VIEW_W } from "./constants.ts";

export type Weather = "clear" | "rain";

/** Full day length in seconds of play. */
const DAY_LENGTH = 240;
const RAIN_CHANCE = 0.18;
const RAIN_MIN = 14;
const RAIN_MAX = 26;

let timeOfDay = 0.32; // start mid-morning
let weather: Weather = "clear";
let weatherT = 20 + Math.random() * 40;

const DROPS: Array<{ x: number; y: number; v: number }> = [];
const FLIES: Array<{ x: number; y: number; phase: number; speed: number }> = [];

for (let i = 0; i < 46; i++) {
  DROPS.push({
    x: Math.random() * (VIEW_W + 60),
    y: Math.random() * VIEW_H,
    v: 380 + Math.random() * 180,
  });
}
for (let i = 0; i < 16; i++) {
  FLIES.push({
    x: Math.random() * VIEW_W,
    y: 90 + Math.random() * (VIEW_H - 130),
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.8,
  });
}

/** 0 = deep night, 1 = full day. Smooth dawn/dusk ramps. */
export function daylight(): number {
  // cos peak at 0.5 (noon), trough at 0 (midnight)
  const raw = Math.cos((timeOfDay - 0.5) * Math.PI * 2);
  return Math.max(0.16, Math.min(1, 0.5 + raw * 0.62));
}

/** How "night" the sky looks (0 day, 1 night) — drives firefly alpha. */
export function nightness(): number {
  const d = daylight();
  return Math.max(0, Math.min(1, (0.75 - d) / 0.5));
}

export function currentWeather(): Weather {
  return weather;
}

export function tickAtmosphere(dt: number, cameraX: number): void {
  timeOfDay = (timeOfDay + dt / DAY_LENGTH) % 1;

  // weather scheduler
  weatherT -= dt;
  if (weatherT <= 0) {
    if (weather === "clear") {
      weather = Math.random() < RAIN_CHANCE ? "rain" : "clear";
      weatherT =
        weather === "rain"
          ? RAIN_MIN + Math.random() * (RAIN_MAX - RAIN_MIN)
          : 24 + Math.random() * 40;
    } else {
      weather = "clear";
      weatherT = 30 + Math.random() * 60;
    }
  }

  if (weather === "rain") {
    for (const d of DROPS) {
      d.y += d.v * dt;
      d.x -= 90 * dt;
      if (d.y > VIEW_H) {
        d.y = -8;
        d.x = (cameraX % (VIEW_W + 60)) + Math.random() * (VIEW_W + 60) - 30;
      }
      if (d.x < -30) d.x += VIEW_W + 60;
    }
  }

  // fireflies wander
  const now = performance.now() / 1000;
  for (const f of FLIES) {
    f.phase += dt * f.speed;
    f.x += Math.sin(now * f.speed + f.phase) * 12 * dt;
    f.y += Math.cos(now * f.speed * 0.8 + f.phase * 1.7) * 8 * dt;
    if (f.x < -10) f.x = VIEW_W + 10;
    if (f.x > VIEW_W + 10) f.x = -10;
    if (f.y < 70) f.y = 70;
    if (f.y > VIEW_H - 40) f.y = VIEW_H - 40;
  }
}

/** Tint overlay — call after drawing the world, before HUD. */
export function drawAtmosphere(c: CanvasRenderingContext2D, _cameraX: number): void {
  const d = daylight();

  // day/night wash — warm at golden hour, deep blue at night
  if (d < 0.98) {
    const night = 1 - d;
    const dusk = Math.max(0, 1 - Math.abs(d - 0.45) * 6); // golden band
    c.save();
    if (dusk > 0) {
      c.globalAlpha = dusk * 0.18;
      c.fillStyle = "#ff9a3d";
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    c.globalAlpha = night * 0.42;
    c.fillStyle = "#0a1030";
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.restore();
  }

  // fireflies — only when it's dark enough to see them
  const n = nightness();
  if (n > 0.15 && weather === "clear") {
    const now = performance.now() / 1000;
    c.save();
    for (const f of FLIES) {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(now * 2.2 + f.phase * 3.1));
      c.globalAlpha = n * twinkle * 0.8;
      c.fillStyle = "#d8ff9a";
      c.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
    }
    c.restore();
  }

  // rain
  if (weather === "rain") {
    c.save();
    c.globalAlpha = 0.32;
    c.strokeStyle = "#9db8d8";
    c.lineWidth = 1;
    c.beginPath();
    for (const d2 of DROPS) {
      c.moveTo(Math.round(d2.x), Math.round(d2.y));
      c.lineTo(Math.round(d2.x - 3), Math.round(d2.y + 11));
    }
    c.stroke();
    c.globalAlpha = 0.1;
    c.fillStyle = "#22304a";
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.restore();
  }
}

/** For tests/debug: force a time of day (0..1). */
export function setTimeOfDay(t: number): void {
  timeOfDay = ((t % 1) + 1) % 1;
}
