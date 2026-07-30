import type { MetadataRoute } from "next";
import { url } from "@/lib";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The editor holds no indexable content and carries a noindex tag too.
      disallow: "/resume-builder",
    },
    sitemap: url("/sitemap.xml"),
  };
}
