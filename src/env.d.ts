/// <reference types="@astrojs/cloudflare" />

declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}
