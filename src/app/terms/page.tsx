import type { Metadata } from "next";
import { TermsContent } from "@/ui/views";

/** Route file: metadata only. The page lives in @/ui/views. */
const DESC =
  "Plain terms for a free, browser-only resume builder. No accounts, no payment, no warranty of ATS outcomes.";

export const metadata: Metadata = {
  title: "Terms of use",
  description: DESC,
  alternates: { canonical: "/terms" },
  /* See the note in privacy/page.tsx: og:url is inherited otherwise. */
  openGraph: { url: "/terms", title: "Terms of use", description: DESC },
  twitter: {
    card: "summary_large_image",
    title: "Terms of use",
    description: DESC,
  },
};

export default function Page() {
  return <TermsContent />;
}
