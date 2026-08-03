import type { Metadata } from "next";
import { NotFoundView } from "@/ui/views";

/**
 * Route file: metadata only. The page lives in @/ui/views/NotFoundView.
 *
 * An error page must never be indexed, and it must not claim a canonical of
 * its own, or a crawler that reaches it treats it as a real page.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundView />;
}
