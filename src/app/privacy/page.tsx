import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import css from "../home.module.css";
import { SiteNav } from "../SiteNav";

/**
 * Short because there is little to disclose. Every claim here is a fact about
 * how the app is built — no server receives a resume, so no policy is needed
 * to describe what happens to one after it arrives.
 *
 * Keep this file honest: if analytics or a backend is ever added, this page
 * changes in the same commit.
 */
export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Your resume never leaves your browser. No accounts, no uploads, no tracking of document contents.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "30 July 2026";

export default function PrivacyPage() {
  return (
    <div className={css.page} data-scroller>
      <SiteNav current="other" />

      <div className={css.wrap}>
        <article className={css.legal}>
          <p className={css.kicker}>Privacy</p>
          <h1 className={css.h2}>What happens to your data</h1>
          <p className={css.legalMeta}>Last updated {UPDATED}</p>

          <p>
            Short version: your resume never leaves your browser, and there is
            no account to create.
          </p>

          <h2>Your documents</h2>
          <p>
            Resumes you write, and files you check, are processed entirely in
            the tab you have open. They are stored in your browser&rsquo;s
            IndexedDB, on your own machine. No copy is sent to {site.name} or
            to anyone else, and there is no server that could receive one.
          </p>
          <p>
            You can verify this rather than take our word for it: open your
            browser&rsquo;s network tab and use the app. No request carries
            your document.
          </p>

          <h2>What this means for you</h2>
          <ul>
            <li>
              Clearing your browser data deletes your resumes permanently. We
              cannot restore them, because we never had them.
            </li>
            <li>
              Your documents do not follow you to another browser or device.
              Export the JSON file and open it elsewhere.
            </li>
            <li>
              Nobody at {site.name} can read your employment history, and no
              subpoena or breach can expose it from our side.
            </li>
          </ul>

          <h2>Accounts</h2>
          <p>
            There are none. We do not ask for an email address, a name, or a
            payment method, so there is no account database to hold anything
            about you.
          </p>

          <h2>Analytics</h2>
          <p>
            The site does not currently run analytics or advertising scripts. If
            that changes, it will be limited to aggregate page counts, it will
            never include resume content, and this page will say so before it
            ships.
          </p>

          <h2>Hosting</h2>
          <p>
            The site is a set of static files served by a hosting provider. Like
            any web host, it records standard request logs — IP address, time,
            and which file was requested. That is a property of the internet,
            not something the app collects or has access to.
          </p>

          <h2>Cookies</h2>
          <p>
            None are set. The app stores a small amount of local data — your
            documents and which one you had open — using browser storage, which
            never travels to a server the way a cookie does.
          </p>

          <h2>Changes</h2>
          <p>
            If this policy changes, the date at the top changes with it. A
            change that affects what leaves your browser will be stated plainly
            rather than folded into a paragraph.
          </p>

          <p>
            <Link href="/terms">Terms of use</Link> ·{" "}
            <Link href="/">Back to the site</Link>
          </p>
        </article>
      </div>
    </div>
  );
}
