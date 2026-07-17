import { GROUND_Y, SCALE, VIEW_H, VIEW_W } from "./constants";
import { getActiveScene } from "./scenes";
import type { DrawContext } from "./types";

function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  fw: number,
  fh: number,
  frame: number,
  dx: number,
  dy: number,
  facing: 1 | -1,
): void {
  const cols = Math.max(1, Math.floor(sheet.width / fw));
  const sx = (frame % cols) * fw;

  ctx.save();
  if (facing < 0) {
    ctx.translate(dx + fw / 2, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, 0, fw, fh, -fw / 2, 0, fw, fh);
  } else {
    ctx.drawImage(sheet, sx, 0, fw, fh, dx, dy, fw, fh);
  }
  ctx.restore();
}

function drawGroundStrip(ctx: CanvasRenderingContext2D, tileset: HTMLImageElement, cameraX: number) {
  ctx.fillStyle = "#1a1420";
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y + 8);

  const tile = 16;
  const startX = Math.floor(cameraX / tile) * tile;

  for (let wx = startX; wx < cameraX + VIEW_W + tile; wx += tile) {
    const sx = 16;
    const sy = 160;
    const dx = Math.floor(wx - cameraX);

    ctx.drawImage(tileset, sx, sy, tile, tile, dx, GROUND_Y, tile, tile);
    ctx.drawImage(tileset, sx, sy + tile, tile, tile, dx, GROUND_Y + tile, tile, tile);
  }
}

function drawParallax(ctx: DrawContext) {
  const scene = getActiveScene();
  const { ctx: c, assets, cameraX } = ctx;

  if (scene.sky) {
    c.fillStyle = scene.sky;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (scene.churchMode) {
    const sliceW = assets.churchBg.width / 3;
    const cbgX = -(cameraX * 0.25) % sliceW;
    c.drawImage(assets.churchBg, 0, 0, sliceW, assets.churchBg.height, cbgX, 0, sliceW, VIEW_H);
    c.drawImage(
      assets.churchBg,
      0,
      0,
      sliceW,
      assets.churchBg.height,
      cbgX + sliceW,
      0,
      sliceW,
      VIEW_H,
    );
    return;
  }

  const bgX = -(cameraX * 0.15) % assets.bg.width;
  const mgX = -(cameraX * 0.4) % assets.mg.width;

  for (let i = -1; i < 3; i++) {
    c.drawImage(assets.bg, bgX + i * assets.bg.width, 0);
  }
  for (let i = -1; i < 3; i++) {
    c.drawImage(assets.mg, mgX + i * assets.mg.width, 20);
  }

  // cemetery graveyard layer fades in toward the east
  if (ctx.inTown && cameraX + VIEW_W > 3000) {
    const alpha = Math.min(0.55, (cameraX + VIEW_W - 3000) / 900);
    const gx = -((cameraX - 3000) * 0.35) % assets.graveyardBg.width;
    c.globalAlpha = alpha;
    for (let i = -1; i < 4; i++) {
      c.drawImage(
        assets.graveyardBg,
        gx + i * assets.graveyardBg.width,
        VIEW_H - assets.graveyardBg.height - 20,
      );
    }
    c.globalAlpha = 1;
  }
}

function drawChurchBackdrop(ctx: DrawContext) {
  const scene = getActiveScene();
  if (!scene.showColumns || scene.churchMode || !ctx.inTown) return;

  const { ctx: c, assets, cameraX } = ctx;
  if (cameraX + VIEW_W <= 4800) return;

  const alpha = Math.min(0.85, (cameraX + VIEW_W - 4800) / 400);
  const sliceW = assets.churchBg.width / 3;
  const cbgX = -((cameraX - 4800) * 0.25) % sliceW;

  c.globalAlpha = alpha;
  c.drawImage(assets.churchBg, 0, 0, sliceW, assets.churchBg.height, cbgX, 0, sliceW, VIEW_H);
  c.drawImage(
    assets.churchBg,
    0,
    0,
    sliceW,
    assets.churchBg.height,
    cbgX + sliceW,
    0,
    sliceW,
    VIEW_H,
  );
  c.globalAlpha = 1;
}

function drawPlatforms(ctx: DrawContext) {
  const { ctx: c, cameraX } = ctx;
  const scene = getActiveScene();

  for (const platform of scene.platforms) {
    if (platform.y >= GROUND_Y || platform.hidden) continue;

    const dx = platform.x - cameraX;
    if (dx + platform.w < 0 || dx > VIEW_W) continue;

    const x = Math.floor(dx);
    c.fillStyle = "#2a1a14";
    c.fillRect(x, platform.y, platform.w, platform.h);
    c.fillStyle = "#5a3a28";
    c.fillRect(x, platform.y, platform.w, 2);
    c.fillStyle = "#1a100c";
    c.fillRect(x, platform.y + platform.h - 2, platform.w, 2);
  }
}

function drawLadders(_ctx: DrawContext) {
  // Climb volumes use real props (signs) — no coded rails.
}

function drawProps(ctx: DrawContext) {
  const { ctx: c, assets, cameraX } = ctx;
  const scene = getActiveScene();

  for (const prop of scene.props) {
    const img = assets.props[prop.img];
    if (!img) continue;

    const dx = prop.x - cameraX;
    if (dx + img.width < -20 || dx > VIEW_W + 20) continue;

    if (prop.flip) {
      c.save();
      c.translate(Math.floor(dx) + img.width, Math.floor(prop.y));
      c.scale(-1, 1);
      c.drawImage(img, 0, 0);
      c.restore();
    } else {
      c.drawImage(img, Math.floor(dx), Math.floor(prop.y));
    }
  }
}

function drawColumns(ctx: DrawContext) {
  const scene = getActiveScene();
  if (!scene.showColumns) return;

  const { ctx: c, assets, cameraX } = ctx;
  const baseX = scene.churchMode ? 200 : 5000;
  const count = scene.churchMode ? 6 : 5;

  for (let i = 0; i < count; i++) {
    const worldX = baseX + i * 140;
    const dx = worldX - cameraX;
    if (dx <= -40 || dx >= VIEW_W) continue;

    c.drawImage(assets.column, Math.floor(dx), GROUND_Y - assets.column.height + 4);
  }
}

function drawNpcs(ctx: DrawContext) {
  const { ctx: c, assets, cameraX } = ctx;
  const scene = getActiveScene();

  for (const npc of scene.npcs) {
    const dx = npc.x - cameraX - npc.fw / 2;
    if (dx < -40 || dx > VIEW_W + 40) continue;

    const sheet = assets.sheets[npc.sheetIdle]!;
    const frame = Math.floor(performance.now() / 160) % npc.idleFrames;
    drawSheetFrame(
      c,
      sheet,
      npc.fw,
      npc.fh,
      frame,
      Math.floor(dx),
      Math.floor(npc.y - npc.fh),
      npc.facing,
    );
  }
}

function drawEnemies(ctx: DrawContext) {
  const scene = getActiveScene();
  if (!scene.showEnemies) return;

  const { ctx: c, assets, cameraX, enemies } = ctx;

  for (const enemy of enemies) {
    if (!enemy.alive && !enemy.dying) continue;

    const dx = enemy.x - cameraX;
    if (dx < -80 || dx > VIEW_W + 80) continue;

    if (enemy.dying) {
      const sheet = enemy.kind === "ghoul" ? assets.death : assets.cemDeath;
      const death = sheet[enemy.deathFrame];
      if (death) {
        const dy = GROUND_Y - death.height + 2;
        c.drawImage(death, dx, dy);
      }
      continue;
    }

    const frames =
      enemy.kind === "ghost"
        ? assets.ghost
        : enemy.kind === "skeleton"
          ? assets.skeleton
          : enemy.kind === "hound"
            ? assets.hound
            : assets.ghoul;
    const frame = frames[enemy.frame % frames.length];
    if (!frame) continue;

    const float = enemy.kind === "ghost" ? Math.sin(performance.now() / 280 + enemy.x) * 4 : 0;
    const dy = GROUND_Y - frame.height + 2 + float;

    c.save();
    if (enemy.hurtT > 0) c.globalAlpha = 0.65;
    if (enemy.kind === "ghost") c.globalAlpha = Math.min(c.globalAlpha, 0.85);
    if (enemy.facing < 0) {
      c.translate(dx + frame.width / 2, dy);
      c.scale(-1, 1);
      c.drawImage(frame, -frame.width / 2, 0);
    } else {
      c.drawImage(frame, dx, dy);
    }
    c.restore();

    const barW = enemy.kind === "hound" ? 40 : 28;
    const hpRatio = enemy.hp / enemy.maxHp;
    c.fillStyle = "#2a1018";
    c.fillRect(Math.floor(dx + 10), dy - 6, barW, 3);
    c.fillStyle = "#ff4a4a";
    c.fillRect(Math.floor(dx + 10), dy - 6, Math.floor(barW * hpRatio), 3);
  }
}

function drawPlayer(ctx: DrawContext) {
  const { ctx: c, assets, cameraX, player } = ctx;
  if (player.invulnT > 0 && Math.floor(player.invulnT * 20) % 2 === 0) return;

  const frames = assets.player[player.anim] ?? assets.player.idle;
  const frame = frames[player.frame % frames.length]!;

  const pw = 40;
  const ph = 34;
  const pdx = player.x - cameraX + player.w / 2;
  const pdy = player.y + player.h - ph;

  c.save();
  if (player.facing < 0) {
    c.translate(pdx, pdy);
    c.scale(-1, 1);
    c.drawImage(frame, -pw / 2, 0, pw, ph);
  } else {
    c.drawImage(frame, pdx - pw / 2, pdy, pw, ph);
  }
  c.restore();
}

function drawSceneChrome(ctx: DrawContext) {
  const scene = getActiveScene();
  if (scene.id === "town") return;

  const { ctx: c } = ctx;

  if (scene.tint !== "transparent") {
    c.fillStyle = scene.tint;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // vibe strips
  if (scene.vibe === "sketch") {
    c.fillStyle = "rgba(255, 217, 61, 0.08)";
    for (let i = 0; i < 8; i++) {
      const x = ((performance.now() / 40 + i * 70) % (VIEW_W + 40)) - 20;
      c.fillRect(x, 20 + (i % 3) * 18, 18, 3);
    }
  }

  c.fillStyle = "rgba(10, 4, 14, 0.72)";
  c.fillRect(8, 8, 200, 28);
  c.strokeStyle = "#6a3048";
  c.strokeRect(8.5, 8.5, 199, 27);
  c.fillStyle = "#ff6b6b";
  c.font = "8px monospace";
  c.fillText(scene.label, 14, 20);
  c.fillStyle = "#f2d9c0";
  c.fillText(scene.tagline.slice(0, 36), 14, 30);
}

export function drawLoading(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0a0610";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#c9a44f";
  ctx.font = "10px monospace";
  ctx.fillText("LOADING TOWN...", 16, 24);
}

function drawPickups(ctx: DrawContext) {
  const { ctx: c, assets, cameraX, pickups } = ctx;
  const t = performance.now() / 160;

  for (const p of pickups) {
    if (p.taken) continue;
    const dx = p.x - cameraX;
    if (dx < -20 || dx > VIEW_W + 20) continue;
    const frame = assets.pickup[Math.floor(t + p.x * 0.03) % assets.pickup.length]!;
    const scale = 0.65;
    const w = frame.width * scale;
    const h = frame.height * scale;
    const bob = Math.sin(t + p.x * 0.05) * 3;
    c.drawImage(
      frame,
      Math.floor(dx - w / 2),
      Math.floor(p.y - h + bob),
      w,
      h,
    );
  }
}

export function drawWorld(draw: DrawContext) {
  const { ctx } = draw;

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  drawParallax(draw);
  drawChurchBackdrop(draw);
  drawGroundStrip(ctx, draw.assets.tileset, draw.cameraX);
  drawProps(draw);
  drawColumns(draw);
  drawPlatforms(draw);
  drawLadders(draw);
  drawPickups(draw);
  drawNpcs(draw);
  drawEnemies(draw);
  drawPlayer(draw);
  drawSceneChrome(draw);
}
