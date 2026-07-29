import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { site, url } from "@/lib/site";
import { ScrollReveal } from "./ScrollReveal";
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
  // Four weights, not five. Every weight is a separate file fetched before
  // text can paint in it; 500 was doing work 400 and 600 already covered.
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

/** Anything the machine measured is set in mono. */
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  // Mono appears only in small labels and measured values — one weight.
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  /*
   * metadataBase turns every relative canonical and social image below into an
   * absolute URL. Without it Next emits relative og:image values, which no
   * crawler resolves.
   */
  metadataBase: new URL(site.url),
  title: {
    default: "Free ATS Resume Builder — see what the parser recovered",
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  keywords: [
    "ats resume builder",
    "free resume builder",
    "ats resume checker",
    "resume parser test",
    "ats friendly resume",
    "resume pdf export",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: "/",
    title: "Free ATS Resume Builder — see what the parser recovered",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Free ATS Resume Builder",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false, address: false },
};

/** Drives the browser chrome colour on mobile. */
export const viewport = {
  themeColor: "#0F6FB8",
  width: "device-width",
  initialScale: 1,
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
        {/*
          Organisation and site identity, stated once for the whole site.
          Page-level structured data (FAQ, software, breadcrumbs) lives on the
          page it describes.
        */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: site.name,
              url: url("/"),
              description: site.description,
              inLanguage: "en",
            }),
          }}
        />
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
