/** Action-specific SFX (Kenney CC0: UI Audio + RPG Audio). */

export type SfxName =
  | "jump"
  | "talk"
  | "open"
  | "close"
  | "menu"
  | "menuClose"
  | "select"
  | "deny"
  | "secret"
  | "hit"
  | "hurt"
  | "kill";

const SFX_FILES: Record<SfxName, string> = {
  jump: "/img/gothicvania/sfx/jump.ogg",
  talk: "/img/gothicvania/sfx/talk.ogg",
  open: "/img/gothicvania/sfx/open.ogg",
  close: "/img/gothicvania/sfx/close.ogg",
  menu: "/img/gothicvania/sfx/menu.ogg",
  menuClose: "/img/gothicvania/sfx/menu-close.ogg",
  select: "/img/gothicvania/sfx/select.ogg",
  deny: "/img/gothicvania/sfx/deny.ogg",
  secret: "/img/gothicvania/sfx/secret.ogg",
  hit: "/img/gothicvania/sfx/hit.ogg",
  hurt: "/img/gothicvania/sfx/hurt.ogg",
  kill: "/img/gothicvania/sfx/kill.ogg",
};

const VOLUME: Record<SfxName, number> = {
  jump: 0.45,
  talk: 0.55,
  open: 0.5,
  close: 0.45,
  menu: 0.4,
  menuClose: 0.4,
  select: 0.45,
  deny: 0.35,
  secret: 0.5,
  hit: 0.55,
  hurt: 0.5,
  kill: 0.55,
};

const buffers = new Map<SfxName, AudioBuffer>();
let ctx: AudioContext | null = null;
let loadPromise: Promise<void> | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

async function loadAll() {
  const ac = audio();
  await Promise.all(
    (Object.keys(SFX_FILES) as SfxName[]).map(async (name) => {
      try {
        const res = await fetch(SFX_FILES[name]);
        const data = await res.arrayBuffer();
        buffers.set(name, await ac.decodeAudioData(data.slice(0)));
      } catch (err) {
        console.warn(`SFX missing: ${name}`, err);
      }
    }),
  );
}

export function unlockAudio() {
  audio();
  if (!loadPromise) loadPromise = loadAll();
}

export function playSfx(name: SfxName) {
  try {
    unlockAudio();
    const ac = audio();
    const buffer = buffers.get(name);

    if (!buffer) {
      void loadPromise?.then(() => {
        if (buffers.has(name)) playSfx(name);
      });
      return;
    }

    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buffer;
    gain.gain.value = VOLUME[name];
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch {
    /* audio unavailable */
  }
}
