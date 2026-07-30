import type { NextConfig } from "next";
import SondaNextPlugin from "sonda/next";

const nextConfig: NextConfig = {
  // Static export: content routes prerender to real HTML, and the whole app
  // deploys as files with no server. See docs/03-architecture.md.
  output: "export",
  // Static hosts serve /path/index.html rather than /path.
  trailingSlash: true,
  images: {
    // No image optimisation server exists in a static export.
    unoptimized: true,
  },
  typedRoutes: true,
};

/*
 * Bundle analysis, off unless asked for: `npm run analyze`.
 *
 * The number that matters here is what a content route ships. It regressed
 * once already — a barrel exporting both design tokens and the MUI theme put
 * Emotion on every static page — and a treemap is how you see that in seconds
 * rather than by diffing chunk sizes by hand.
 *
 * Sonda needs real source maps to attribute bytes to files, so the analyze
 * script turns them on for that build only; shipping them would publish the
 * source and slow the build for everyone else.
 */
const withSonda = SondaNextPlugin({
  enabled: process.env.ANALYZE === "true",
  format: "html",
  filename: "sonda",
  outputDir: ".sonda",
  // Sizes are meaningless for budget work unless they are compressed sizes.
  gzip: true,
  brotli: true,
  // Attribute bytes to the file that caused them, including dependencies.
  deep: true,
  sources: true,
  open: false,
});

export default process.env.ANALYZE === "true"
  ? withSonda(nextConfig)
  : nextConfig;
