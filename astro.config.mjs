import { defineConfig } from "astro/config";

// Static, client-rendered analysis. No server, no API keys, no data leaves the
// browser. DataForSEO stays an optional BYO-key enrichment layer (not wired in
// the MVP) so the default run spends nothing.
export default defineConfig({
  site: "https://github.com/rodrigoscz/nav-sense",
});
