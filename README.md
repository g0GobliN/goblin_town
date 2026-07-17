# Goblin Town

Playable portfolio by **Vishal Gurung** (goblin) — live at [g0.monster](https://g0.monster).

A little night town you can walk through. Houses open onto work, notes, doodles, and a way to say hello. Prefer reading? There’s a plain summary at [/info](https://g0.monster/info).

## What’s here

- **/** — the town (move, talk, fight, open doors)
- **/info** — text summary of everything
- **/work/[slug]** · **/blog/[slug]** — project & post pages

## Me

Grew up in Nepal. Live in Tokyo. IT engineer by day; side projects, open source, and weird experiments by night.

- Email: grgvishal.gurung17@gmail.com
- GitHub: [g0GobliN](https://github.com/g0GobliN)
- Instagram: [goblin01_](https://instagram.com/goblin01_)

## Art & sound

Pixel assets from the Gothicvania packs (Ansimuz / itch.io) — see licenses under `public/img/gothicvania/`. Site code is MIT; those packs keep their own terms.

## Local phone testing

```bash
npm run dev
```

Open **`https://192.168.x.x:4321`** on your phone (same Wi‑Fi). Accept the self-signed cert warning once.

Fullscreen (hiding the browser bar) only works over **HTTPS** — plain `http://` is blocked by Chrome.

Push to `main` → GitHub Action builds and deploys. Add these repo secrets:

- `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID`
- `PUBLIC_FIREBASE_*` · `PUBLIC_DOODLE_*` (build)
- `ADMIN_EMAIL` · `FIREBASE_SERVICE_ACCOUNT` · doodle keys (admin — also set in Cloudflare Pages env)
