import { defineConfig } from "vite";

// `base` must match the GitHub repo name so assets resolve correctly
// when published to https://<user>.github.io/<repo>/.
// If you name the repo something other than "gridbots", change this.
export default defineConfig({
  base: "/gridbots/",
});
