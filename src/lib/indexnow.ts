const INDEXNOW_HOST = "g0.monster";
const INDEXNOW_KEY = "269a59572c1c473bb1841ecbd0e74682";

/**
 * Notify IndexNow (Bing, Yandex) that a URL was added, changed, or removed,
 * so it gets (re)crawled without waiting on the next scheduled pass.
 * Best-effort only — a failure here must never block the actual save/delete.
 */
export async function pingIndexNow(url: string): Promise<void> {
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    });
  } catch {
    /* best-effort notification only */
  }
}
