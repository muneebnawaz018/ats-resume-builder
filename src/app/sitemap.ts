import type { MetadataRoute } from "next";
import { url } from "@/lib/site";

/**
 * Written to /sitemap.xml at build time. The builder is deliberately absent —
 * a stateful tool page has nothing to rank on and only dilutes the crawl.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: url("/resume-checker"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
