import { saveDoodle } from "../lib/firebase";
import { invalidateDoodleCache, renderDoodles } from "./content";
import { playSfx } from "./sounds";

const PALETTE = ["#ffd93d", "#ff6b6b", "#4d96ff", "#6bcB77", "#c56cf0", "#f4e4bc", "#000000"];

export function initDoodlePad() {
  const canvas = document.getElementById("doodle-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d")!;
  const paletteEl = document.getElementById("doodle-palette")!;
  const sizeEl = document.getElementById("doodle-size") as HTMLInputElement;
  const clearEl = document.getElementById("doodle-clear")!;
  const saveEl = document.getElementById("doodle-save") as HTMLButtonElement | null;
  const nameEl = document.getElementById("doodle-name") as HTMLInputElement | null;
  const statusEl = document.getElementById("doodle-save-status");

  let color = PALETTE[0]!;
  let drawing = false;
  let lastPoint: { x: number; y: number } | null = null;
  const swatches: HTMLButtonElement[] = [];

  for (const swatchColor of PALETTE) {
    const button = document.createElement("button");
    button.className = "doodle-swatch";
    button.type = "button";
    button.style.background = swatchColor;
    button.setAttribute("aria-label", swatchColor);

    button.addEventListener("click", () => {
      color = swatchColor;
      for (const swatch of swatches) {
        swatch.classList.toggle("active", swatch === button);
      }
    });

    paletteEl.appendChild(button);
    swatches.push(button);
  }

  swatches[0]!.classList.add("active");

  const pointerPos = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    lastPoint = pointerPos(event);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing || !lastPoint) return;

    const point = pointerPos(event);
    ctx.strokeStyle = color;
    ctx.lineWidth = Number(sizeEl.value);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
  });

  const endStroke = () => {
    drawing = false;
    lastPoint = null;
  };

  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointerleave", endStroke);

  clearEl.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  saveEl?.addEventListener("click", async () => {
    const name = (nameEl?.value || "goblin-sketch").trim() || "goblin-sketch";
    if (statusEl) statusEl.textContent = "> saving...";
    saveEl.disabled = true;

    try {
      await saveDoodle({
        name,
        text: "",
        doodle: canvas.toDataURL("image/png"),
        timestamp: new Date().toISOString(),
        createInDarkMode: false,
      });
      playSfx("secret");
      if (statusEl) statusEl.textContent = "> saved to doodle cloud!";
      invalidateDoodleCache();
      await renderDoodles();
    } catch (err) {
      console.error(err);
      playSfx("deny");
      if (statusEl) statusEl.textContent = "> couldn't save — try again in a moment";
    } finally {
      saveEl.disabled = false;
    }
  });
}
