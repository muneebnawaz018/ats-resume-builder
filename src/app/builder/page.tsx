import type { Metadata } from "next";
import { AppProviders } from "@/ui/theme/AppProviders";
import { EditorShell } from "@/ui/editor/EditorShell";

/** A stateful tool page has nothing to rank on. See docs/06-seo.md. */
export const metadata: Metadata = {
  title: "Builder",
  robots: { index: false, follow: false },
};

export default function BuilderPage() {
  return (
    <AppProviders>
      <EditorShell />
    </AppProviders>
  );
}
