import type { Metadata } from "next";
import { site } from "@/lib";
import { HomeView } from "@/ui/views";

/*
 * Route file: metadata and nothing else.
 *
 * Next requires this to be called `page.tsx`, so the page itself lives in
 * @/ui/views under its own name, a folder of identically named files is not
 * navigable in an editor.
 */
export const metadata: Metadata = {
  title: "Free ATS Resume Builder: see what the parser reads",
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Free ATS Resume Builder: see what the parser reads",
    description: site.description,
  },
};

export default function Page() {
  return <HomeView />;
}
