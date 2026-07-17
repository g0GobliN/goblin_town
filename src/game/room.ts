// Gothicvania portfolio town — side-view explore with content crumbs.
// Art: ansimuz Gothicvania Town + Church (public domain / free for commercial use).

import { loadAssets } from "./assets";
import { type CineKind, slidesFor } from "./cinematics";
import { createEnemies, enemiesKilled, makePlayer, resolveCombat } from "./combat";
import { GROUND_Y, MUSIC_SRC, SCALE, VIEW_H, VIEW_W } from "./constants";
import { loadSectionContent } from "./content";
import { initDoodlePad } from "./doodle";
import { cameraFollow, ladderAt, movePlayer, tryAttack, tryJump, updateEnemy } from "./physics";
import { drawLoading, drawWorld } from "./render";
import { SECTION_ICONS, SECTION_KEYS, titleFor } from "./sections";
import { playSfx, unlockAudio } from "./sounds";
import type { Assets, Crumb, Npc, PlayerState, SectionKey } from "./types";
import { createPickups, CRUMBS, nearHeal, NPCS, zoneLabel } from "./world";

export type { SectionKey } from "./types";

function nearbyCrumb(player: PlayerState): Crumb | null {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;

  for (const crumb of CRUMBS) {
    const inside =
      px > crumb.x - 10 &&
      px < crumb.x + crumb.w + 10 &&
      py > crumb.y - 30 &&
      py < crumb.y + crumb.h + 10;

    if (inside) return crumb;
  }

  return null;
}

function nearbyNpc(player: PlayerState): Npc | null {
  const px = player.x + player.w / 2;
  for (const npc of NPCS) {
    if (Math.abs(px - npc.x) < 36) return npc;
  }
  return null;
}

export function initPixelRoom() {
  const canvas = document.getElementById("room-canvas") as HTMLCanvasElement;
  const hint = document.getElementById("room-hint")!;
  const nav = document.getElementById("room-nav")!;
  const menuToggle = document.getElementById("menu-toggle") as HTMLButtonElement | null;
  const overlay = document.getElementById("modal-overlay")!;
  const modalTitle = document.getElementById("modal-title")!;
  const modalClose = document.getElementById("modal-close")!;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
  const crumbsEl = document.getElementById("crumb-count");
  const zoneEl = document.getElementById("zone-label");
  const killEl = document.getElementById("kill-hud");
  const dialogueBox = document.getElementById("dialogue-box");
  const dialogueText = document.getElementById("dialogue-text");
  const controlsHint = document.getElementById("controls-hint");
  const pressKey = controlsHint?.querySelector(".press-key") as HTMLElement | null;
  const hpEl = document.getElementById("hp-hud");
  const cineOverlay = document.getElementById("cine-overlay");
  const cineKicker = document.getElementById("cine-kicker");
  const cineTitle = document.getElementById("cine-title");
  const cineBody = document.getElementById("cine-body");
  const cinePrompt = document.getElementById("cine-prompt");
  const cineProgress = document.getElementById("cine-progress");
  const creditsBtn = document.getElementById("credits-btn");

  canvas.width = VIEW_W * SCALE;
  canvas.height = VIEW_H * SCALE;
  canvas.style.width = `${VIEW_W * SCALE}px`;
  canvas.style.height = `${VIEW_H * SCALE}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const keys = new Set<string>();
  const found = new Set<string>();
  const pickups = createPickups();
  let souls = 0;
  let clearedTown = false;

  let open: SectionKey | null = null;
  let assets: Assets | null = null;
  let cameraX = 0;
  let npcTalkT = 0;
  let musicStarted = false;
  let lastZone = "";
  let phase: "intro" | "play" | "credits" = "intro";
  let cineIndex = 0;
  let sawCredits = false;

  const player = makePlayer();
  const enemies = createEnemies();

  const renderCineSlide = () => {
    if (!cineOverlay || !cineTitle || !cineBody) return;
    const kind: CineKind = phase === "credits" ? "credits" : "intro";
    const slides = slidesFor(kind);
    const slide = slides[cineIndex];
    if (!slide) return;

    if (cineKicker) cineKicker.textContent = slide.kicker ?? "";
    cineTitle.textContent = slide.title;
    cineBody.innerHTML = slide.body.map((line) => `<p>${line}</p>`).join("");
    if (cineProgress) cineProgress.textContent = `${cineIndex + 1} / ${slides.length}`;
    if (cinePrompt) {
      const last = cineIndex >= slides.length - 1;
      cinePrompt.textContent =
        kind === "intro"
          ? last
            ? "ENTER — begin"
            : "ENTER — continue · ESC — skip"
          : last
            ? "ENTER — return to town"
            : "ENTER — continue";
    }
    cineOverlay.hidden = false;
  };

  const startCine = (kind: CineKind) => {
    phase = kind === "credits" ? "credits" : "intro";
    cineIndex = 0;
    if (kind === "credits") {
      sawCredits = true;
      closeSection();
      setMenuOpen(false, false);
      hideDialogue();
    }
    renderCineSlide();
    playSfx("open");
  };

  const endCine = () => {
    if (cineOverlay) cineOverlay.hidden = true;
    phase = "play";
    dismissStartPrompt();
    playSfx("secret");
  };

  const advanceCine = () => {
    const kind: CineKind = phase === "credits" ? "credits" : "intro";
    const slides = slidesFor(kind);
    if (cineIndex < slides.length - 1) {
      cineIndex += 1;
      renderCineSlide();
      playSfx("select");
      return;
    }
    endCine();
  };

  const updateHpHud = () => {
    if (!hpEl) return;
    hpEl.textContent = `HP ${"♥".repeat(player.hp)}${"♡".repeat(Math.max(0, player.maxHp - player.hp))}`;
  };

  const updateKillHud = () => {
    if (!killEl) return;
    const n = enemiesKilled(enemies);
    killEl.textContent = `FOES ${n}/${enemies.length}`;
  };

  updateHpHud();
  updateKillHud();

  const showDialogue = (line: string) => {
    if (!dialogueBox || !dialogueText) return;
    dialogueText.textContent = line;
    dialogueBox.hidden = false;
    npcTalkT = 4.5;
    hint.hidden = true;
  };

  const hideDialogue = () => {
    if (dialogueBox) dialogueBox.hidden = true;
    npcTalkT = 0;
  };

  const openSection = (key: SectionKey) => {
    open = key;
    hideDialogue();
    modalTitle.textContent = `> ${titleFor(key).toUpperCase()}`;
    for (const section of sections) {
      section.hidden = section.dataset.section !== key;
    }
    overlay.classList.add("open");
    playSfx("open");
    void loadSectionContent(key);
  };

  const closeSection = () => {
    const wasContact = open === "contact";
    open = null;
    overlay.classList.remove("open");
    playSfx("close");
    if (wasContact && !sawCredits && (clearedTown || found.size >= CRUMBS.length)) {
      startCine("credits");
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeSection();
  });
  modalClose.addEventListener("click", closeSection);

  const updateCrumbHud = () => {
    if (crumbsEl) crumbsEl.textContent = `${found.size}/${CRUMBS.length}`;
  };

  const markSectionFound = (key: SectionKey) => {
    for (const crumb of CRUMBS) {
      if (crumb.key === key) found.add(crumb.id);
    }
    updateCrumbHud();
  };

  const setMenuOpen = (openMenu: boolean, withSfx = true) => {
    nav.hidden = !openMenu;
    if (menuToggle) menuToggle.setAttribute("aria-expanded", String(openMenu));
    if (withSfx) playSfx(openMenu ? "menu" : "menuClose");
  };

  menuToggle?.addEventListener("click", () => {
    if (phase !== "play") return;
    unlockAudio();
    dismissStartPrompt();
    setMenuOpen(nav.hasAttribute("hidden"));
  });

  for (const key of SECTION_KEYS) {
    const button = document.createElement("button");
    button.className = "pixel-btn";
    button.type = "button";
    button.innerHTML = `<span class="btn-icon">${SECTION_ICONS[key]}</span>${titleFor(key).toUpperCase()}`;

    button.addEventListener("click", () => {
      const crumb = CRUMBS.find((item) => item.key === key);
      if (crumb) {
        player.x = crumb.x + crumb.w / 2;
        player.y = Math.min(crumb.y, GROUND_Y - player.h);
        player.vy = 0;
      }
      playSfx("select");
      setMenuOpen(false, false);
      openSection(key);
      markSectionFound(key);
    });

    nav.appendChild(button);
  }

  const creditsMenuBtn = document.createElement("button");
  creditsMenuBtn.className = "pixel-btn";
  creditsMenuBtn.type = "button";
  creditsMenuBtn.innerHTML = `<span class="btn-icon">★</span>CREDITS`;
  creditsMenuBtn.addEventListener("click", () => {
    playSfx("select");
    setMenuOpen(false, false);
    startCine("credits");
  });
  nav.appendChild(creditsMenuBtn);

  creditsBtn?.addEventListener("click", () => {
    playSfx("select");
    startCine("credits");
  });

  const updateHint = () => {
    if (phase !== "play" || open || (dialogueBox && !dialogueBox.hidden)) {
      hint.hidden = true;
      return;
    }

    const crumb = nearbyCrumb(player);
    const npc = nearbyNpc(player);

    if (crumb) {
      hint.hidden = false;
      hint.textContent = `> ${crumb.hint}`;
      return;
    }

    if (nearHeal(player.x + player.w / 2, player.y + player.h / 2)) {
      hint.hidden = false;
      hint.textContent = "> SPACE — drink from the well";
      return;
    }

    if (ladderAt(player.x, player.y, player.w, player.h)) {
      hint.hidden = false;
      hint.textContent = "> W/S — climb the sign";
      return;
    }

    if (npc) {
      hint.hidden = false;
      hint.textContent = "> SPACE — talk to townsfolk";
      return;
    }

    hint.hidden = true;
  };

  const tryInteract = () => {
    const crumb = nearbyCrumb(player);
    if (crumb) {
      const isNew = !found.has(crumb.id);
      found.add(crumb.id);
      updateCrumbHud();
      hideDialogue();
      if (isNew) playSfx("secret");
      openSection(crumb.key);
      updateHint();
      return;
    }

    const heal = nearHeal(player.x + player.w / 2, player.y + player.h / 2);
    if (heal) {
      if (player.hp < player.maxHp) {
        player.hp = player.maxHp;
        updateHpHud();
        playSfx("secret");
        showDialogue("Cool well water. Heart's full again.");
      } else {
        showDialogue("Already at full heart — save a sip for later.");
        playSfx("talk");
      }
      return;
    }

    const npc = nearbyNpc(player);
    if (npc) {
      showDialogue(npc.line);
      playSfx("talk");
      return;
    }

    playSfx("deny");
  };

  const dismissStartPrompt = () => {
    if (pressKey) pressKey.hidden = true;
    controlsHint?.classList.add("is-playing");
  };

  const startMusic = () => {
    if (musicStarted) return;
    musicStarted = true;
    unlockAudio();
    dismissStartPrompt();

    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.volume = 0.35;
    audio.play().catch(() => {
      /* autoplay blocked until gesture */
    });
  };

  window.addEventListener("keydown", (event) => {
    keys.add(event.key);
    startMusic();

    if (phase === "intro" || phase === "credits") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advanceCine();
        return;
      }
      if (event.key === "Escape" && phase === "intro") {
        event.preventDefault();
        endCine();
        return;
      }
      return;
    }

    if (event.key === "m" || event.key === "M") {
      if (!open) setMenuOpen(nav.hasAttribute("hidden"));
      return;
    }

    if (open) {
      if (event.key === "Escape") closeSection();
      return;
    }

    if (event.key === "Escape" && !nav.hidden) {
      setMenuOpen(false);
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      tryInteract();
    }

    if (event.key === "j" || event.key === "J" || event.key === "x" || event.key === "X") {
      event.preventDefault();
      if (tryAttack(player)) playSfx("select");
    }

    if (
      event.key === "ArrowUp" ||
      event.key === "w" ||
      event.key === "W" ||
      event.key === "z" ||
      event.key === "Z"
    ) {
      event.preventDefault();
      if (tryJump(player)) playSfx("jump");
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key);
  });

  const update = (dt: number) => {
    if (open || phase !== "play") return;

    movePlayer(player, keys, dt);
    for (const enemy of enemies) updateEnemy(enemy, dt);

    const combat = resolveCombat(player, enemies, dt);
    if (combat === "hit") playSfx("hit");
    if (combat === "hurt") {
      playSfx("hurt");
      updateHpHud();
    }
    if (combat === "kill") {
      playSfx("kill");
      updateKillHud();
      if (!clearedTown && enemiesKilled(enemies) >= enemies.length) {
        clearedTown = true;
        showDialogue(`Road's clear. ${souls} soul gems in hand. The church gate waits east.`);
        playSfx("secret");
      }
    }

    // pick up soul gems
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    for (const p of pickups) {
      if (p.taken) continue;
      if (Math.abs(pcx - p.x) < 18 && Math.abs(pcy - p.y) < 32) {
        p.taken = true;
        souls += 1;
        playSfx("select");
      }
    }

    if (player.hp <= 0) {
      player.hp = player.maxHp;
      player.x = 180;
      player.y = GROUND_Y - 50;
      player.vx = 0;
      player.vy = 0;
      player.invulnT = 1.2;
      updateHpHud();
      showDialogue("Darkness takes you… you wake at the square. Try again.");
    }

    if (npcTalkT > 0) {
      npcTalkT -= dt;
      if (npcTalkT <= 0) hideDialogue();
    }

    cameraX = cameraFollow(player);

    const zone = zoneLabel(cameraX + VIEW_W / 2);
    if (zoneEl && zone !== lastZone) {
      zoneEl.textContent = zone;
      lastZone = zone;
    }

    updateHint();
  };

  const draw = () => {
    if (!assets) {
      drawLoading(ctx, canvas);
      return;
    }

    drawWorld({
      ctx,
      assets,
      cameraX,
      player,
      enemies,
      found,
      inTown: true,
      pickups,
    });
  };

  let last = performance.now();

  const loop = (time: number) => {
    const dt = Math.min(0.033, (time - last) / 1000);
    last = time;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  };

  updateCrumbHud();

  loadAssets()
    .then((loaded) => {
      assets = loaded;
      if (pressKey) pressKey.hidden = true;
      startCine("intro");
      requestAnimationFrame(loop);
    })
    .catch((error) => {
      console.error(error);
      hint.hidden = false;
      hint.textContent = "> FAILED TO LOAD ASSETS";
    });

  initDoodlePad();
}
