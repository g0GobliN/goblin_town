# Launch posts for Goblin Town

Ready-to-use drafts. Tweak the voice to taste — post as yourself, reply to every comment
in the first 2 hours (that's what keeps posts alive on every platform).

**Before posting anywhere:** deploy the new OG image first, and record a 10–15 second
screen capture of walking through the town (phone-vertical for Instagram, landscape for
everything else). Motion gets 5–10× the engagement of a static image.

---

## Show HN (Hacker News)

> **Title:** Show HN: My portfolio is a playable pixel-art town
>
> URL: https://g0.monster
>
> **First comment (post immediately after submitting):**
>
> Hi HN — I'm an IT engineer in Tokyo. Instead of a resume page I built my portfolio
> as a small pixel-art town you walk through: houses open onto my projects and notes,
> there's a doodle wall where visitors can leave sketches, and a few surprises if you
> explore.
>
> Tech: Astro + a vanilla TypeScript canvas engine (no game framework), Cloudflare
> Pages/Workers, Firestore for the doodle wall and comments. Art is from the
> Gothicvania packs by Ansimuz.
>
> Things that were harder than expected: mobile touch controls, fullscreen on iOS
> Safari, and making a canvas game load fast enough that people don't bounce.
> Happy to answer anything — and leave a doodle in the town if you stop by.

Tips: post Tue–Thu, 8–10am US Eastern (9–11pm JST). Don't resubmit the same day if it
doesn't take off; you can retry once after a week or two.

---

## Reddit — r/webdev

> **Title:** I made my portfolio a playable pixel-art game instead of a resume page
>
> Body: same content as the HN first comment, slightly more casual. Reddit likes
> honesty about tradeoffs — mention what you'd do differently. Attach the screen
> recording, not a static screenshot.

Also fits: **r/WebGames** (as a game, keep the "portfolio" angle light),
**r/PixelArt** (lead with the art: "I turned the Gothicvania asset packs into a
walkable portfolio town" — credit Ansimuz prominently), **r/SideProject**.
One subreddit per day, not all at once — Reddit flags cross-posted spam.

---

## X / Twitter (@g0GobliN)

> instead of a resume, I built a town 🏘️👺
>
> my portfolio is now a pixel-art game: walk the streets, open houses to see my
> work, fight a skeleton, leave a doodle on the wall
>
> built with Astro + canvas + Cloudflare Workers, art by Ansimuz
>
> play it → g0.monster
>
> [attach the 15s screen recording]

Follow-up thread ideas (one per day): the doodle wall with visitor sketches, the
mobile touch-controls story, a before/after of the OG share card, "things iOS
Safari fullscreen taught me about suffering."

---

## LinkedIn

> I rebuilt my portfolio as a playable pixel-art game.
>
> Instead of scrolling a resume, you walk through a little night town: each house
> is a project, the library holds my notes, and visitors can leave a doodle on the
> town wall.
>
> Under the hood: Astro, a hand-written TypeScript canvas engine, Cloudflare
> Pages + Workers, and Firestore. No game framework — I wanted to understand every
> frame.
>
> Play it here: https://g0.monster
> (Works on phones too — turn your phone sideways.)

---

## Zenn (Japanese) — article draft outline

> **タイトル案:** ポートフォリオを「遊べるゲーム」にした話 — Astro + Canvas + Cloudflare Workers
>
> 1. **はじめに** — 履歴書ページではなく、歩き回れるピクセルアートの町を作った理由
> 2. **技術構成** — Astro 7 / 素の TypeScript + Canvas(ゲームフレームワーク不使用)/
>    Cloudflare Pages + Workers / Firestore(落書きウォール・コメント)
> 3. **ゲームエンジンを自作した話** — 物理、シーン管理、スプライトアニメーション
> 4. **ハマったところ** — iOS Safari のフルスクリーン、モバイルのタッチ操作、
>    Canvas ゲームの初期ロード最適化
> 5. **訪問者が落書きを残せる仕組み** — Firestore REST + セキュリティルール設計
> 6. **まとめ** — デモ: https://g0.monster (スマホは横向きで)
>
> タグ: `Astro` `Cloudflare` `TypeScript` `個人開発` `ゲーム開発`

Same outline works for **dev.to** in English. Publish Zenn and dev.to versions the
same week as the HN post — each article links to g0.monster and becomes a backlink
that feeds Google ranking.

---

## Everywhere: the call to action

End every post with some variant of **"leave a doodle in my town"** — it gives
people a reason to visit _and_ something they'll screenshot and share back.
