import type { Metadata } from "next";
import { TermsContent } from "@/ui/views";

/** Route file: metadata only. The page lives in @/ui/views. */
export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Plain terms for a free, browser-only resume builder. No accounts, no payment, no warranty of ATS outcomes.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <TermsContent />;
}
