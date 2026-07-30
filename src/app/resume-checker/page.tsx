import type { Metadata } from "next";
import { CheckerView } from "@/ui/views";

/** Route file: metadata only. The page lives in @/ui/views/CheckerView. */
const DESC =
  "Upload nothing. Read your resume back the way hiring software does and see exactly which fields survived extraction.";

export const metadata: Metadata = {
  title: "ATS Resume Checker: does your resume survive parsing?",
  description: DESC,
  alternates: { canonical: "/resume-checker" },
  openGraph: {
    url: "/resume-checker",
    title: "ATS Resume Checker: does your resume survive parsing?",
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: "ATS Resume Checker",
    description: DESC,
  },
};

export default function Page() {
  return <CheckerView />;
}
