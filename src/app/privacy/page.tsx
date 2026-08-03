import type { Metadata } from "next";
import { PrivacyContent } from "@/ui/views";

/** Route file: metadata only. The page lives in @/ui/views. */
const DESC =
  "Your resume never leaves your browser. No accounts, no uploads, no tracking of document contents.";

export const metadata: Metadata = {
  title: "Privacy",
  description: DESC,
  alternates: { canonical: "/privacy" },
  /*
   * Without an explicit url here the page inherits the root layout's og:url,
   * which points at the home page, so anything shared from this page
   * advertises a different address than the one that was shared.
   */
  openGraph: { url: "/privacy", title: "Privacy", description: DESC },
  twitter: { card: "summary_large_image", title: "Privacy", description: DESC },
};

export default function Page() {
  return <PrivacyContent />;
}
