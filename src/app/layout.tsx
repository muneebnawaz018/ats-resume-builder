import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

/**
 * Plex was drawn for an engineering company and carries that in its skeleton —
 * neither the neutral default (Roboto, Inter) nor a personality face fighting
 * the content. See docs/09-design.md.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/** Editorial register for long-form guides. Never used in the application. */
const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
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
      className={`${plexSans.variable} ${plexMono.variable} ${plexSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
