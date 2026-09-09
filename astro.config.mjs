import { defineConfig } from "astro/config";

// Static, client-rendered analysis. No server, no API keys, no data leaves the
// browser. DataForSEO stays an optional BYO-key enrichment layer (not wired in
// the MVP) so the default run spends nothing.
//
// Served as a subdirectory of the main site rather than its own subdomain,
// so every tool builds authority on the same host instead of on four
// separate ones. A Cloudflare Worker on novasanchez.com proxies
// /nav-sense/* to this project's own deployment.
export default defineConfig({
  site: "https://novasanchez.com",
  base: "/nav-sense",
  trailingSlash: "always",
});
