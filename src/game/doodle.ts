import { saveDoodle } from "../lib/firebase";
import { devError } from "../lib/log";
import { invalidateDoodleCache, renderDoodles } from "./content";
import { playSfx } from "./sounds";

const PALETTE = ["#ffd93d", "#ff6b6b", "#4d96ff", "#6bcB77", "#c56cf0", "#f4e4bc", "#000000"];

export function initDoodlePad() {
  const canvas = document.getElementById("doodle-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d")!;
  const paletteEl = document.getElementById("doodle-palette")!;
  const sizeBtns = [
    ...document.querySelectorAll<HTMLButtonElement>("#doodle-sizes .doodle-size-btn"),
  ];
  const eraserEl = document.getElementById("doodle-eraser");
  const clearEl = document.getElementById("doodle-clear")!;
  const saveEl = document.getElementById("doodle-save") as HTMLButtonElement | null;
  const nameEl = document.getElementById("doodle-name") as HTMLInputElement | null;
  const statusEl = document.getElementById("doodle-save-status");

  const CANVAS_BG = "#f4e4bc";
  const resetCanvas = () => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  resetCanvas();

  let color = PALETTE[0]!;
  let brushSize =
    Number(sizeBtns.find((b) => b.classList.contains("is-active"))?.dataset.size) || 8;
  let erasing = false;
  let drawing = false;
  let lastPoint: { x: number; y: number } | null = null;
  const swatches: HTMLButtonElement[] = [];

  for (const btn of sizeBtns) {
    btn.addEventListener("click", () => {
      brushSize = Number(btn.dataset.size) || brushSize;
      for (const other of sizeBtns) other.classList.toggle("is-active", other === btn);
    });
  }

  const setErasing = (on: boolean) => {
    erasing = on;
    eraserEl?.classList.toggle("is-active", on);
    if (on) {
      for (const swatch of swatches) swatch.classList.remove("active");
    }
  };

  for (const swatchColor of PALETTE) {
    const button = document.createElement("button");
    button.className = "doodle-swatch";
    button.type = "button";
    button.style.background = swatchColor;
    button.setAttribute("aria-label", swatchColor);

    button.addEventListener("click", () => {
      color = swatchColor;
      setErasing(false);
      for (const swatch of swatches) {
        swatch.classList.toggle("active", swatch === button);
      }
    });

    paletteEl.appendChild(button);
    swatches.push(button);
  }

  swatches[0]!.classList.add("active");
  if (eraserEl) paletteEl.appendChild(eraserEl);

  eraserEl?.addEventListener("click", () => {
    setErasing(!erasing);
  });

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
    ctx.strokeStyle = erasing ? CANVAS_BG : color;
    ctx.lineWidth = brushSize;
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
    resetCanvas();
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
      devError(err);
      playSfx("deny");
      if (statusEl) statusEl.textContent = "> couldn't save — try again in a moment";
    } finally {
      saveEl.disabled = false;
    }
  });
}
