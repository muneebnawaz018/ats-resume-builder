import type { Metadata } from "next";
import { EditorShell } from "@/ui/editor";

/** A stateful tool page has nothing to rank on. See docs/06-seo.md. */
export const metadata: Metadata = {
  title: "Builder",
  robots: { index: false, follow: false },
  /*
   * Without this the page inherits the root layout's canonical and declares
   * itself a duplicate of the home page, a contradiction next to noindex.
   */
  alternates: { canonical: "/resume-builder" },
};

export default function BuilderPage() {
  return <EditorShell />;
}
