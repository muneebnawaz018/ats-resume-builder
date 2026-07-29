import type { NextConfig } from "next";

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

export default nextConfig;
