import { AppProviders } from "@/ui/theme";

/**
 * MUI is mounted here, not in the root layout.
 *
 * The editor is the only route that needs it. Mounting it at the root meant
 * the two content routes — the pages that actually have to rank — downloaded
 * and executed the MUI and Emotion runtime to render static HTML.
 */
export default function BuilderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppProviders>{children}</AppProviders>;
}
