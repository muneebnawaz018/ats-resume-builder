import type { Metadata } from "next";
import { PrivacyContent } from "@/ui/views";

/** Route file: metadata only. The page lives in @/ui/views. */
export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Your resume never leaves your browser. No accounts, no uploads, no tracking of document contents.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <PrivacyContent />;
}
