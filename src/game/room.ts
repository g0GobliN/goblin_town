// Gothicvania portfolio town — side-view explore with content crumbs.
// Art: ansimuz Gothicvania Town + Church (public domain / free for commercial use).

import { loadAssets } from "./assets";
import { BOSS_INTRO, type CineKind, creditRollHtml, slidesFor } from "./cinematics";
import { createEnemies, enemiesKilled, makePlayer, resolveCombat } from "./combat";
import { CREDITS_MUSIC_SRC, GROUND_Y, MUSIC_SRC, SCALE, VIEW_H, VIEW_W } from "./constants";
import { loadSectionContent } from "./content";
import { initDoodlePad } from "./doodle";
import { cameraFollow, ladderAt, movePlayer, tryAttack, tryJump, updateEnemy } from "./physics";
import { drawLoading, drawWorld } from "./render";
import { SECTION_ICONS, SECTION_KEYS, titleFor } from "./sections";
import { playSfx, unlockAudio } from "./sounds";
import type { Assets, Crumb, Npc, PlayerState, SectionKey } from "./types";
import {
  BOSS_ARENA,
  createPickups,
  CRUMBS,
  EAST_GATE,
  GEMS_TO_OPEN_GATE,
  nearEastGate,
  nearHeal,
  NPCS,
  SOUL_GEM_TOTAL,
  tickBossHeartSpawns,
  zoneLabel,
} from "./world";
import { getSceneWorldW } from "./scenes";

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
  const modalBody = overlay.querySelector<HTMLElement>(".modal-body")!;
  const modalBox = overlay.querySelector<HTMLElement>(".modal")!;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
  const crumbsEl = document.getElementById("crumb-count");
  const zoneEl = document.getElementById("zone-label");
  const killEl = document.getElementById("kill-hud");
  const gemEl = document.getElementById("gem-hud");
  const dialogueBox = document.getElementById("dialogue-box");
  const dialogueName = document.getElementById("dialogue-name");
  const dialogueText = document.getElementById("dialogue-text");
  const dialoguePrompt = document.getElementById("dialogue-prompt");
  const controlsHint = document.getElementById("controls-hint");
  const pressKey = controlsHint?.querySelector(".press-key") as HTMLElement | null;
  const hpEl = document.getElementById("hp-hud");
  const cineOverlay = document.getElementById("cine-overlay");
  const cinePanel = document.getElementById("cine-panel");
  const cineKicker = document.getElementById("cine-kicker");
  const cineTitle = document.getElementById("cine-title");
  const cineBody = document.getElementById("cine-body");
  const cinePrompt = document.getElementById("cine-prompt");
  const cineProgress = document.getElementById("cine-progress");
  const creditsRoll = document.getElementById("credits-roll");
  const creditsTrack = document.getElementById("credits-track");
  const creditsHint = document.getElementById("credits-hint");
  const creditsBtn = document.getElementById("credits-btn");
  const creditsSkip = document.getElementById("credits-skip");
  const touchControls = document.getElementById("touch-controls");

  // Coarse pointer / phones — also UA fallback (some Chrome builds report fine pointer).
  // NOTE: don't use bare maxTouchPoints here — touchscreen Windows laptops (and Firefox
  // after Responsive Design Mode) report touch points while driving with a mouse.
  const isTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches ||
    (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) &&
      (navigator.maxTouchPoints ?? 0) > 0);
  const actKey = isTouch ? "ACT" : "SPACE";
  const stickEl = document.getElementById("touch-stick");
  const stickKnob = stickEl?.querySelector<HTMLElement>(".touch-stick-knob");
  const moveZone = document.getElementById("touch-move-zone");
  const gameFrame = canvas.parentElement;

  canvas.width = VIEW_W * SCALE;
  canvas.height = VIEW_H * SCALE;
  // display size is handled in CSS (responsive) — never set inline width/height

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const keys = new Set<string>();
  const found = new Set<string>();
  const pickups = createPickups();
  let souls = 0;
  let bossDown = false;

  let open: SectionKey | null = null;
  let assets: Assets | null = null;
  let cameraX = 0;
  let npcTalkT = 0;
  let musicStarted = false;
  let lastZone = "";
  let phase: "intro" | "play" | "credits" | "boot" = "boot";
  const bootGate = document.getElementById("boot-gate");
  let cineIndex = 0;
  let sawCredits = false;
  let creditY = 0;
  let creditFast = false;
  let gateBumpT = 0;
  let bossIntro = false;
  let bossIntroIndex = 0;
  let sawBossIntro = false;
  let bossFightReady = false;

  const player = makePlayer();
  const enemies = createEnemies();
  const hellGato = () => enemies.find((e) => e.kind === "hound");

  const renderCineSlide = () => {
    if (!cineOverlay || !cineTitle || !cineBody) return;
    const slides = slidesFor("intro", isTouch);
    const slide = slides[cineIndex];
    if (!slide) return;

    if (cineKicker) cineKicker.textContent = slide.kicker ?? "";
    cineTitle.textContent = slide.title;
    cineBody.innerHTML = slide.body.map((line) => `<p>${line}</p>`).join("");
    if (cineProgress) cineProgress.textContent = `${cineIndex + 1} / ${slides.length}`;
    if (cinePrompt) {
      const last = cineIndex >= slides.length - 1;
      cinePrompt.textContent = isTouch
        ? last
          ? "ACT — begin"
          : "ACT — continue"
        : last
          ? "ENTER — begin"
          : "ENTER — continue · ESC — skip";
    }
    cineOverlay.hidden = false;
  };

  const startCreditsRoll = () => {
    if (!cineOverlay || !creditsRoll || !creditsTrack) return;
    sawCredits = true;
    open = null;
    overlay.classList.remove("open");
    setMenuOpen(false, false);
    hideDialogue();
    creditFast = false;

    phase = "credits";
    cineOverlay.classList.add("is-credits");
    if (cinePanel) cinePanel.hidden = true;
    creditsRoll.hidden = false;
    if (creditsHint) {
      creditsHint.hidden = false;
      if (isTouch) creditsHint.textContent = "HOLD — fast forward";
    }
    if (creditsSkip) creditsSkip.hidden = false;

    creditsTrack.innerHTML = creditRollHtml();
    creditY = window.innerHeight * 0.85;
    creditsTrack.style.transform = `translateY(${creditY}px)`;
    cineOverlay.hidden = false;
    if (musicStarted) playMusic(CREDITS_MUSIC_SRC, 0.45);
    playSfx("open");
  };

  const startCine = (kind: CineKind) => {
    if (kind === "credits") {
      startCreditsRoll();
      return;
    }

    phase = "intro";
    cineIndex = 0;
    creditFast = false;
    if (cineOverlay) cineOverlay.classList.remove("is-credits");
    if (cinePanel) cinePanel.hidden = false;
    if (creditsRoll) creditsRoll.hidden = true;
    if (creditsHint) creditsHint.hidden = true;
    if (creditsSkip) creditsSkip.hidden = true;
    renderCineSlide();
    playSfx("open");
  };

  const endCine = () => {
    if (cineOverlay) {
      cineOverlay.hidden = true;
      cineOverlay.classList.remove("is-credits");
    }
    if (cinePanel) cinePanel.hidden = false;
    if (creditsRoll) creditsRoll.hidden = true;
    if (creditsHint) creditsHint.hidden = true;
    if (creditsSkip) creditsSkip.hidden = true;
    creditFast = false;
    if (phase === "credits" && musicStarted) playMusic(MUSIC_SRC, 0.35);
    phase = "play";
    dismissStartPrompt();
    playSfx("secret");
  };

  const advanceCine = () => {
    if (phase !== "intro") return;
    const slides = slidesFor("intro", isTouch);
    if (cineIndex < slides.length - 1) {
      cineIndex += 1;
      renderCineSlide();
      playSfx("select");
      return;
    }
    endCine();
  };

  const updateCreditsRoll = (dt: number) => {
    if (!creditsTrack || !creditsRoll) return;
    const speed = (creditFast ? 140 : 42) * dt;
    creditY -= speed;
    creditsTrack.style.transform = `translateY(${creditY}px)`;

    const done = creditY + creditsTrack.offsetHeight < creditsRoll.clientHeight * 0.15;
    if (done) endCine();
  };

  const updateHpHud = () => {
    if (!hpEl) return;
    hpEl.textContent = `HP ${"♥".repeat(player.hp)}${"♡".repeat(Math.max(0, player.maxHp - player.hp))}`;
  };

  const updateKillHud = () => {
    if (!killEl) return;
    const n = enemiesKilled(enemies);
    killEl.textContent = `KILLS ${n}/${enemies.length}`;
  };

  const updateGemHud = () => {
    if (!gemEl) return;
    gemEl.textContent = `GEMS ${souls}/${SOUL_GEM_TOTAL}`;
  };

  // Gate: last boss + enough gems — other mobs optional
  const gateUnlocked = () => bossDown && souls >= GEMS_TO_OPEN_GATE;

  updateHpHud();
  updateKillHud();
  updateGemHud();

  const showDialogue = (line: string, name = "TOWNSFOLK") => {
    if (!dialogueBox || !dialogueText) return;
    if (dialogueName) {
      dialogueName.textContent = name;
      dialogueName.classList.remove("is-boss", "is-player");
    }
    dialogueBox.classList.remove("is-boss-talk");
    dialogueText.textContent = line;
    dialogueBox.hidden = false;
    if (dialoguePrompt) {
      dialoguePrompt.hidden = false;
      dialoguePrompt.textContent = isTouch ? "ACT — dismiss" : "SPACE — dismiss";
    }
    npcTalkT = 0;
    hint.hidden = true;
  };

  const hideDialogue = () => {
    if (dialogueBox) {
      dialogueBox.hidden = true;
      dialogueBox.classList.remove("is-boss-talk");
    }
    if (dialogueName) dialogueName.classList.remove("is-boss", "is-player");
    if (dialoguePrompt) dialoguePrompt.hidden = true;
    npcTalkT = 0;
  };

  const dialogueShowing = () => Boolean(dialogueBox && !dialogueBox.hidden && !bossIntro);

  const renderBossLine = () => {
    if (!dialogueBox || !dialogueText) return;
    const beat = BOSS_INTRO[bossIntroIndex];
    if (!beat) return;

    if (dialogueName) {
      dialogueName.textContent = beat.name;
      dialogueName.classList.toggle("is-boss", beat.speaker === "boss");
      dialogueName.classList.toggle("is-player", beat.speaker === "player");
    }
    dialogueBox.classList.add("is-boss-talk");
    dialogueText.textContent = beat.line;
    dialogueBox.hidden = false;
    if (dialoguePrompt) {
      dialoguePrompt.hidden = false;
      const last = bossIntroIndex >= BOSS_INTRO.length - 1;
      const cont = isTouch ? "ACT — continue" : "ENTER — continue";
      const fight = isTouch ? "ACT — fight!" : "ENTER — fight!";
      dialoguePrompt.textContent = last ? fight : cont;
    }
    npcTalkT = 0;
    hint.hidden = true;
    playSfx(beat.speaker === "boss" ? "talk" : "select");
  };

  const startBossIntro = () => {
    if (sawBossIntro || bossIntro) return;
    bossIntro = true;
    bossIntroIndex = 0;
    bossFightReady = false;
    player.vx = 0;
    player.vy = 0;
    const boss = hellGato();
    if (boss) boss.facing = player.x < boss.x ? -1 : 1;
    setMenuOpen(false, false);
    renderBossLine();
  };

  const advanceBossIntro = () => {
    if (!bossIntro) return;
    if (bossIntroIndex < BOSS_INTRO.length - 1) {
      bossIntroIndex += 1;
      renderBossLine();
      return;
    }
    // Fight begins
    bossIntro = false;
    sawBossIntro = true;
    bossFightReady = true;
    hideDialogue();
    showDialogue("…The yard goes quiet. Fight!", "HELL-GATO");
    if (dialogueName) {
      dialogueName.classList.add("is-boss");
    }
    playSfx("secret");
  };

  const scrollModal = (delta: number) => {
    modalBody.scrollTop += delta;
  };

  const openSection = (key: SectionKey) => {
    open = key;
    hideDialogue();
    modalTitle.textContent = `> ${titleFor(key).toUpperCase()}`;
    modalBox.classList.toggle("modal-wide", key === "doodle");
    for (const section of sections) {
      section.hidden = section.dataset.section !== key;
    }
    overlay.classList.add("open");
    modalBody.scrollTop = 0;
    playSfx("open");
    void loadSectionContent(key);
  };

  const closeSection = () => {
    const wasContact = open === "contact";
    open = null;
    overlay.classList.remove("open");
    playSfx("close");
    if (wasContact && !sawCredits && gateUnlocked()) {
      startCreditsRoll();
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeSection();
  });
  modalClose.addEventListener("click", closeSection);

  const updateCrumbHud = () => {
    if (crumbsEl) crumbsEl.textContent = `${found.size}/${CRUMBS.length}`;
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
      // Open the page — do NOT teleport (that skipped the whole street)
      playSfx("select");
      setMenuOpen(false, false);
      openSection(key);
    });

    nav.appendChild(button);
  }

  const creditsMenuBtn = document.createElement("button");
  creditsMenuBtn.className = "pixel-btn";
  creditsMenuBtn.type = "button";
  creditsMenuBtn.innerHTML = `<span class="btn-icon">★</span>CREDITS`;
  creditsMenuBtn.addEventListener("click", () => {
    setMenuOpen(false, false);
    if (!gateUnlocked()) {
      showDialogue(
        `Finish the path first — need ${GEMS_TO_OPEN_GATE} gems and beat Hell-gato, then walk past the gate.`,
      );
      playSfx("deny");
      return;
    }
    playSfx("select");
    startCine("credits");
  });
  nav.appendChild(creditsMenuBtn);

  const infoMenuBtn = document.createElement("a");
  infoMenuBtn.className = "pixel-btn";
  infoMenuBtn.href = "/info/";
  infoMenuBtn.innerHTML = `<span class="btn-icon">☰</span>SIMPLE PAGE`;
  nav.appendChild(infoMenuBtn);

  creditsBtn?.addEventListener("click", () => {
    if (!gateUnlocked()) {
      showDialogue("Credits roll once the road is walked — finish the journey first!");
      playSfx("deny");
      return;
    }
    playSfx("select");
    startCine("credits");
  });

  const updateHint = () => {
    if (bossIntro) {
      hint.hidden = true;
      return;
    }
    if (phase !== "play" || open || (dialogueBox && !dialogueBox.hidden)) {
      hint.hidden = true;
      return;
    }

    const npc = nearbyNpc(player);
    if (npc) {
      hint.hidden = false;
      hint.textContent = `> A friendly face — ${actKey} to say hi`;
      return;
    }

    const crumb = nearbyCrumb(player);
    if (crumb) {
      hint.hidden = false;
      hint.textContent = `> ${crumb.hint.replaceAll("{KEY}", actKey)}`;
      return;
    }

    if (nearHeal(player.x + player.w / 2, player.y + player.h / 2)) {
      hint.hidden = false;
      hint.textContent = `> Cool well water — ${actKey} for a sip`;
      return;
    }

    if (ladderAt(player.x, player.y, player.w, player.h)) {
      hint.hidden = false;
      hint.textContent = isTouch
        ? "> Climbable! Drag ▲/▼ to scale the sign"
        : "> Climbable! W/S to scale the sign";
      return;
    }

    if (nearEastGate(player.x + player.w / 2, player.y + player.h / 2)) {
      hint.hidden = false;
      if (!bossDown) {
        hint.textContent = `> A sealed gate — ${actKey} to size it up`;
      } else if (!gateUnlocked()) {
        hint.textContent = `> The gate wants gems — ${souls}/${GEMS_TO_OPEN_GATE} found`;
      } else {
        hint.textContent = "> The gate stands open — stroll east, hero";
      }
      return;
    }

    hint.hidden = true;
  };

  const tryInteract = () => {
    // Townsfolk first — crumbs nearby were stealing SPACE
    const npc = nearbyNpc(player);
    if (npc) {
      showDialogue(npc.line.replaceAll("{KEY}", actKey), npc.name);
      playSfx("talk");
      return;
    }

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
        showDialogue("Ahh — cool well water. Hearts topped right up!");
      } else {
        showDialogue("Hearts already full! Save a sip for the road.");
        playSfx("talk");
      }
      return;
    }

    if (nearEastGate(player.x + player.w / 2, player.y + player.h / 2)) {
      if (!bossDown) {
        showDialogue(
          "The gate won't budge — Hell-gato still prowls this yard. Deal with the beast, then we'll talk.",
        );
        playSfx("deny");
      } else if (!gateUnlocked()) {
        showDialogue(
          `The gate hums softly… it wants ${GEMS_TO_OPEN_GATE} soul gems and you carry ${souls}. The purple ones glinting along the street — go gather the rest!`,
        );
        playSfx("deny");
      } else {
        showDialogue(
          "Every gem gathered, Hell-gato bested… the gate swings open! The road's end waits just east.",
        );
        playSfx("win");
      }
      return;
    }

    playSfx("deny");
  };

  const fsBtn = document.getElementById("fs-btn") as HTMLButtonElement | null;

  const isFsActive = () => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
  };

  const isImmersive = () =>
    document.documentElement.classList.contains("is-immersive") || isFsActive();

  const syncFsBtn = () => {
    if (!fsBtn) return;
    const blocked = document.documentElement.classList.contains("game-portrait-block");
    const show = isTouch && !blocked && !isImmersive();
    fsBtn.hidden = !show;
    if (!window.isSecureContext) {
      fsBtn.textContent = "HTTPS?";
      fsBtn.title = "Open https://… — Chrome blocks fullscreen on http";
    } else {
      fsBtn.textContent = "FULL";
      fsBtn.title = "Hide browser bar";
    }
  };

  const lockLandscape = () => {
    const orient = screen.orientation as ScreenOrientation & {
      lock?: (mode: string) => Promise<void>;
    };
    void orient.lock?.("landscape").catch(() => {});
  };

  /** Maximize game even when Fullscreen API is blocked (iOS / policy). */
  const syncVisualViewport = () => {
    const vv = window.visualViewport;
    const w = Math.round(vv?.width ?? window.innerWidth);
    const h = Math.round(vv?.height ?? window.innerHeight);
    const top = Math.round(vv?.offsetTop ?? 0);
    const left = Math.round(vv?.offsetLeft ?? 0);
    const root = document.documentElement.style;
    root.setProperty("--vvw", `${w}px`);
    root.setProperty("--vvh", `${h}px`);
    root.setProperty("--vv-top", `${top}px`);
    root.setProperty("--vv-left", `${left}px`);
    document.body.style.height = `${h}px`;
  };

  const enterImmersive = () => {
    document.documentElement.classList.add("is-immersive");
    document.documentElement.classList.add("is-fullscreen");
    lockLandscape();
    syncVisualViewport();
    window.scrollTo(0, 0);
    requestAnimationFrame(syncVisualViewport);
    setTimeout(syncVisualViewport, 100);
    setTimeout(syncVisualViewport, 400);
    syncFsBtn();
  };

  /** Real Fullscreen API when the browser allows it (Android Chrome + HTTPS). */
  const tryNativeFullscreen = (): Promise<boolean> => {
    if (isFsActive()) return Promise.resolve(true);
    if (!window.isSecureContext) return Promise.resolve(false);

    const targets: HTMLElement[] = [document.documentElement, document.body].filter(
      Boolean,
    ) as HTMLElement[];

    const requestOn = async (node: HTMLElement): Promise<void> => {
      const el = node as HTMLElement & {
        requestFullscreen?: (opts?: FullscreenOptions) => Promise<void>;
        webkitRequestFullscreen?: () => void;
      };
      // Bare call first — { navigationUI: "hide" } rejects on many Chrome builds
      if (typeof el.requestFullscreen === "function") {
        try {
          await el.requestFullscreen();
        } catch {
          await el.requestFullscreen!({ navigationUI: "hide" });
        }
        return;
      }
      if (typeof el.webkitRequestFullscreen === "function") {
        el.webkitRequestFullscreen();
        return;
      }
      throw new Error("no fs");
    };

    const attempt = async (i: number): Promise<boolean> => {
      if (i >= targets.length) return false;
      try {
        await requestOn(targets[i]);
        document.documentElement.classList.add("is-fullscreen");
        lockLandscape();
        syncFsBtn();
        return true;
      } catch {
        return attempt(i + 1);
      }
    };

    return attempt(0);
  };

  const tryPlayFullscreen = () => {
    // Always expand the game first (works everywhere)
    enterImmersive();
    // Then try true browser fullscreen on top
    void tryNativeFullscreen().then((ok) => {
      if (ok) enterImmersive();
      syncFsBtn();
    });
    return true;
  };

  const onFullscreenChange = () => {
    const on = isFsActive();
    document.documentElement.classList.toggle("is-fullscreen", on || isImmersive());
    if (!on && !document.documentElement.classList.contains("is-immersive")) {
      document.documentElement.classList.remove("is-fullscreen");
    }
    syncFsBtn();
  };
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  window.visualViewport?.addEventListener("resize", () => {
    if (document.documentElement.classList.contains("is-immersive")) {
      syncVisualViewport();
    }
  });
  window.visualViewport?.addEventListener("scroll", () => {
    if (document.documentElement.classList.contains("is-immersive")) {
      syncVisualViewport();
    }
  });

  // Landscape phone: go full-bleed immediately (no empty bars)
  if (isTouch && window.matchMedia("(orientation: landscape)").matches) {
    enterImmersive();
  }
  window.matchMedia("(orientation: landscape)").addEventListener("change", (event) => {
    if (!isTouch) return;
    if (event.matches) enterImmersive();
    else {
      document.documentElement.classList.remove("is-immersive", "is-fullscreen");
      document.body.style.height = "";
      syncFsBtn();
    }
  });

  const armFsBtn = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    tryPlayFullscreen();
    startMusic();
  };
  // Prefer click — keeps user activation for Fullscreen API in Chrome
  fsBtn?.addEventListener("click", armFsBtn);

  if (isTouch) {
    syncFsBtn();
    window.addEventListener("orientationchange", () => setTimeout(syncFsBtn, 200));
    window.matchMedia("(orientation: portrait)").addEventListener("change", syncFsBtn);
  }

  const dismissStartPrompt = () => {
    if (pressKey) pressKey.hidden = true;
    controlsHint?.classList.add("is-playing");
  };

  let musicEl: HTMLAudioElement | null = null;
  let musicSrc = "";

  const playMusic = (src: string, volume: number) => {
    if (musicEl && musicSrc === src) return;
    musicEl?.pause();
    musicEl = new Audio(src);
    musicEl.loop = true;
    musicEl.volume = volume;
    musicSrc = src;
    musicEl.play().catch(() => {
      /* autoplay blocked until gesture */
    });
  };

  const startMusic = () => {
    if (musicStarted) return;
    musicStarted = true;
    unlockAudio();
    dismissStartPrompt();
    playMusic(MUSIC_SRC, 0.35);
  };

  window.addEventListener("keydown", (event) => {
    keys.add(event.key);
    startMusic();

    if (phase === "intro") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advanceCine();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        endCine();
        return;
      }
      return;
    }

    if (phase === "credits") {
      if (event.key === "Escape") {
        event.preventDefault();
        endCine();
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        creditFast = true;
        return;
      }
      return;
    }

    if (bossIntro) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        advanceBossIntro();
      }
      return;
    }

    if (event.key === "m" || event.key === "M") {
      if (!open) setMenuOpen(nav.hasAttribute("hidden"));
      return;
    }

    if (open) {
      if (event.key === "Escape") {
        closeSection();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const line = 48;
      const page = Math.max(line * 4, modalBody.clientHeight - 24);

      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        scrollModal(line);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        scrollModal(-line);
        return;
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        scrollModal(page);
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        scrollModal(-page);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        modalBody.scrollTop = 0;
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        modalBody.scrollTop = modalBody.scrollHeight;
        return;
      }
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
      if (dialogueShowing()) {
        hideDialogue();
        updateHint();
        return;
      }
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
    if (event.key === " " || event.key === "Enter") creditFast = false;
  });

  // --- touch: left stick move/run, right JUMP / HIT / ACT ---

  const STICK_DEAD = 14;
  const STICK_MAX = 52;

  let gestureId: number | null = null;
  let gestureStartX = 0;
  let gestureStartY = 0;
  let stickDragging = false;
  let runHeld = false; // RUN button held — acts like Shift on desktop

  const clearMoveKeys = () => {
    keys.delete("ArrowLeft");
    keys.delete("ArrowRight");
    keys.delete("a");
    keys.delete("d");
    keys.delete("w");
    keys.delete("s");
    keys.delete("W");
    keys.delete("S");
    keys.delete("ArrowUp");
    keys.delete("ArrowDown");
    keys.delete("Shift");
  };

  const placeStick = (clientX: number, clientY: number) => {
    if (!stickEl || !gameFrame) return;
    const rect = gameFrame.getBoundingClientRect();
    stickEl.hidden = false;
    stickEl.style.left = `${clientX - rect.left}px`;
    stickEl.style.top = `${clientY - rect.top}px`;
    if (stickKnob) stickKnob.style.transform = "translate(-50%, -50%)";
  };

  const hideStick = () => {
    if (stickEl) stickEl.hidden = true;
    if (stickKnob) stickKnob.style.transform = "translate(-50%, -50%)";
  };

  const applyStick = (dx: number, dy: number) => {
    clearMoveKeys();
    const dist = Math.hypot(dx, dy);
    if (dist < STICK_DEAD) {
      if (stickKnob) stickKnob.style.transform = "translate(-50%, -50%)";
      return;
    }

    const clamped = Math.min(dist, STICK_MAX);
    const ux = (dx / dist) * clamped;
    const uy = (dy / dist) * clamped;
    if (stickKnob) {
      stickKnob.style.transform = `translate(calc(-50% + ${ux}px), calc(-50% + ${uy}px))`;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    if (nx < -0.32) keys.add("ArrowLeft");
    if (nx > 0.32) keys.add("ArrowRight");
    // Up/down only steer ladder climbs — jumping lives on the JUMP button.
    if (ny < -0.38) keys.add("w");
    if (ny > 0.38) keys.add("s");
    // Run only via RUN button (or Shift on desktop) — stick stays walk.
    if (runHeld) keys.add("Shift");
  };

  const touchAct = () => {
    if (phase === "intro") {
      advanceCine();
      return;
    }
    if (phase === "credits" || open) return;
    if (bossIntro) {
      advanceBossIntro();
      return;
    }
    if (phase !== "play") return;
    if (dialogueShowing()) {
      hideDialogue();
      updateHint();
      return;
    }
    tryInteract();
  };

  const touchAttack = () => {
    if (phase === "intro") {
      advanceCine();
      return;
    }
    if (phase === "credits" || open || bossIntro) return;
    if (phase !== "play") return;
    if (dialogueShowing()) {
      hideDialogue();
      updateHint();
      return;
    }
    if (tryAttack(player)) playSfx("select");
  };

  const touchJump = () => {
    if (phase === "intro") {
      advanceCine();
      return;
    }
    if (phase === "credits" || open || bossIntro) return;
    if (phase !== "play") return;
    if (dialogueShowing()) {
      hideDialogue();
      updateHint();
      return;
    }
    if (tryJump(player)) playSfx("jump");
  };

  const isGesturePointer = (event: PointerEvent) =>
    event.pointerType === "touch" || event.pointerType === "pen" || isTouch;

  if (isTouch) {
    document.documentElement.classList.add("is-touch");
    touchControls?.classList.add("is-active");
    canvas.style.touchAction = "none";
    touchControls?.addEventListener("contextmenu", (event) => event.preventDefault());

    // Left zone: virtual stick only
    if (moveZone) {
      moveZone.style.touchAction = "none";
      moveZone.addEventListener("touchstart", (event) => event.preventDefault(), {
        passive: false,
      });

      moveZone.addEventListener("pointerdown", (event) => {
        if (!isGesturePointer(event)) return;
        if (open || phase === "credits") return;
        event.preventDefault();
        tryPlayFullscreen();
        startMusic();
        dismissStartPrompt();

        if (phase === "intro") {
          advanceCine();
          return;
        }
        if (bossIntro) {
          advanceBossIntro();
          return;
        }
        if (phase !== "play") return;

        gestureId = event.pointerId;
        gestureStartX = event.clientX;
        gestureStartY = event.clientY;
        stickDragging = false;
        moveZone.setPointerCapture(event.pointerId);
        placeStick(event.clientX, event.clientY);
      });

      moveZone.addEventListener("pointermove", (event) => {
        if (event.pointerId !== gestureId) return;
        if (phase !== "play" || open || bossIntro) return;

        const dx = event.clientX - gestureStartX;
        const dy = event.clientY - gestureStartY;
        if (!stickDragging && Math.hypot(dx, dy) >= STICK_DEAD) stickDragging = true;
        applyStick(dx, dy);
      });

      const endMove = (event: PointerEvent) => {
        if (event.pointerId !== gestureId) return;
        clearMoveKeys();
        hideStick();
        gestureId = null;
        stickDragging = false;
      };

      moveZone.addEventListener("pointerup", endMove);
      moveZone.addEventListener("pointercancel", endMove);
      moveZone.addEventListener("lostpointercapture", (event) => {
        if (event.pointerId === gestureId) endMove(event);
      });
    }

    // Right buttons: HIT / ACT (block double-tap zoom)
    for (const btn of touchControls?.querySelectorAll<HTMLElement>("[data-tc]") ?? []) {
      const action = btn.dataset.tc!;
      const blockZoom = (event: Event) => event.preventDefault();
      btn.addEventListener("touchstart", blockZoom, { passive: false });
      btn.addEventListener("gesturestart", blockZoom as EventListener);

      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        tryPlayFullscreen();
        btn.setPointerCapture(event.pointerId);
        btn.classList.add("is-held");
        startMusic();
        dismissStartPrompt();
        if (action === "act") touchAct();
        if (action === "attack") touchAttack();
        if (action === "jump") touchJump();
        if (action === "run") {
          runHeld = true;
          keys.add("Shift");
        }
      });
      const release = () => {
        btn.classList.remove("is-held");
        if (action === "run") {
          runHeld = false;
          keys.delete("Shift");
        }
      };
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointercancel", release);
      btn.addEventListener("lostpointercapture", release);
    }
  }

  // Tap cinematic overlay (intro / credits)
  cineOverlay?.addEventListener("pointerdown", (event) => {
    if (phase === "intro") {
      event.preventDefault();
      startMusic();
      advanceCine();
    } else if (phase === "credits") {
      creditFast = true;
    }
  });
  cineOverlay?.addEventListener("pointerup", () => {
    if (phase === "credits") creditFast = false;
  });
  cineOverlay?.addEventListener("pointercancel", () => {
    if (phase === "credits") creditFast = false;
  });

  creditsSkip?.addEventListener("pointerdown", (event) => event.stopPropagation());
  creditsSkip?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (phase === "credits") endCine();
  });

  const update = (dt: number) => {
    if (phase === "credits") {
      updateCreditsRoll(dt);
      return;
    }

    if (open || phase !== "play") return;

    const boss = hellGato();
    const bossAlive = Boolean(boss && boss.alive && !boss.dying);
    const px = player.x + player.w / 2;

    // Trigger anime-style boss talk when you first enter the yard
    if (!sawBossIntro && !bossIntro && bossAlive && px > BOSS_ARENA.minX - 20 && px < EAST_GATE.x) {
      startBossIntro();
    }

    if (bossIntro) {
      player.vx = 0;
      player.vy = 0;
      updateHint();
      return;
    }

    movePlayer(player, keys, dt);

    // Locked until Hell-gato is dead AND enough soul gems
    if (!gateUnlocked() && player.x + player.w > EAST_GATE.x) {
      player.x = EAST_GATE.x - player.w;
      player.vx = 0;
      if (gateBumpT <= 0) {
        if (!bossDown) {
          showDialogue("Beat Hell-gato first. Then come back with soul gems.");
        } else {
          showDialogue(`Need ${GEMS_TO_OPEN_GATE} soul gems to open the gate. You have ${souls}.`);
        }
        playSfx("deny");
        gateBumpT = 2.4;
      }
    }

    for (const enemy of enemies) {
      // Hell-gato waits until the talk ends
      if (enemy.kind === "hound" && !bossFightReady) continue;
      updateEnemy(enemy, dt);
    }

    const combatFoes =
      bossFightReady || !bossAlive ? enemies : enemies.filter((e) => e.kind !== "hound");
    const bossBefore = hellGato();
    const bossWasUp = Boolean(bossBefore && bossBefore.alive && !bossBefore.dying);
    const combat = resolveCombat(player, combatFoes, dt);
    if (combat === "hit") playSfx("hit");
    if (combat === "hurt") {
      playSfx("hurt");
      updateHpHud();
    }
    if (combat === "kill") {
      playSfx("kill");
      updateKillHud();
      const bossNow = hellGato();
      if (!bossDown && bossWasUp && bossNow && (bossNow.dying || !bossNow.alive)) {
        bossDown = true;
        if (gateUnlocked()) {
          showDialogue(`Hell-gato falls. ${souls} gems ready — the exit gate opens. Walk east.`);
        } else {
          showDialogue(
            `Hell-gato falls. Gate still needs ${GEMS_TO_OPEN_GATE} gems (you have ${souls}). Collect more, then return.`,
          );
        }
        playSfx(gateUnlocked() ? "win" : "secret");
      }
    }

    tickBossHeartSpawns(
      pickups,
      dt,
      bossAlive && bossFightReady,
      player.x + player.w / 2,
      player.hp,
    );

    // pick up soul gems / hearts (wide radius — gems sit on the road)
    const pcx = player.x + player.w / 2;
    for (const p of pickups) {
      if (p.taken) continue;
      const nearX = Math.abs(pcx - p.x) < 28;
      const nearY = player.y + player.h > p.y - 40 && player.y < p.y + 20;
      if (!nearX || !nearY) continue;

      if (p.kind === "heart") {
        if (player.hp >= player.maxHp) continue;
        p.taken = true;
        player.hp = Math.min(player.maxHp, player.hp + 1);
        updateHpHud();
        playSfx("secret");
      } else {
        p.taken = true;
        souls += 1;
        updateGemHud();
        // Gem also tops up a heart if you're hurt
        if (player.hp < player.maxHp) {
          player.hp += 1;
          updateHpHud();
        }
        playSfx("select");
        if (souls === GEMS_TO_OPEN_GATE && bossDown) {
          showDialogue("That's enough gems — the church gate will open now.");
          playSfx("win");
        }
      }
    }

    // End of the road — credits
    if (gateUnlocked() && !sawCredits && player.x >= getSceneWorldW() - player.w - 12) {
      startCreditsRoll();
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

    if (gateBumpT > 0) gateBumpT -= dt;

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
      gateOpen: gateUnlocked(),
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

  const finishBoot = () => {
    if (phase !== "boot") return;
    // Intro ready underneath so shutters peel onto it — never a game flash
    startCine("intro");
    if (!bootGate) return;

    bootGate.classList.add("is-open");
    const top = bootGate.querySelector(".boot-shutter-top");
    const clear = (event?: Event) => {
      if (event && event.target !== top) return;
      bootGate.classList.add("is-done");
      top?.removeEventListener("transitionend", clear);
    };
    top?.addEventListener("transitionend", clear);
    window.setTimeout(() => clear(), 1300);
  };

  loadAssets()
    .then((loaded) => {
      assets = loaded;
      requestAnimationFrame(loop);
      window.setTimeout(finishBoot, 900);
    })
    .catch((error) => {
      console.error(error);
      hint.hidden = false;
      hint.textContent = "> FAILED TO LOAD ASSETS";
      if (bootGate) bootGate.classList.add("is-done");
      startCine("intro");
    });

  initDoodlePad();
}
