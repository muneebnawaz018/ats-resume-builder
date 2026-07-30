import type { MetadataRoute } from "next";

/**
 * Web app manifest, for the Android install prompt.
 *
 * Static export has no server, so this bakes to /manifest.webmanifest at
 * build time like every other route.
 *
 * `display: "browser"` on purpose. A standalone window hides the URL bar, and
 * this app's whole claim is that a resume never leaves the machine it was
 * opened on. Somebody checking that claim should be able to see where they
 * are.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATS Resume Builder",
    short_name: "ATS Resume",
    description:
      "See your resume the way applicant tracking software does, before you send it.",
    start_url: "/",
    display: "browser",
    background_color: "#FFFFFF",
    theme_color: "#0F6FB8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Lets a launcher mask the icon to its own shape without clipping the mark.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
