import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/ui/theme/AppProviders";
import "./globals.css";

/**
 * One sans for everything, one mono for measured values.
 *
 * Plus Jakarta Sans has open apertures and generous counters, which is what
 * makes long stretches of text comfortable rather than tiring. It carries
 * enough character to not read as a default, and it stays legible down to the
 * 11px labels in the editor — a display serif could not do both jobs.
 */
const sans = Plus_Jakarta_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Anything the machine measured is set in mono. */
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ATS Resume Builder — see what the parser recovered",
    template: "%s · ATS Resume Builder",
  },
  description:
    "Build a resume, export it, then read it back the way hiring software does. Free, unlimited downloads, and your resume never leaves your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
    >
      {/*
        Browser extensions (password managers, colour pickers) add attributes
        to <body> before React hydrates, which React reports as a mismatch.
        Nothing in this app writes to body, so the warning is always noise.
      */}
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
