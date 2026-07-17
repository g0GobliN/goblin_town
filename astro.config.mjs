import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  site: "https://g0.monster",
  output: "static",
  trailingSlash: "always",
  adapter: cloudflare(),
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/admin") && !page.includes("/api/"),
    }),
  ],
  server: { port: 4321, host: true },
  // HTTPS so phone LAN testing can use Fullscreen API (blocked on plain http://)
  vite: {
    plugins: [basicSsl()],
  },
});
