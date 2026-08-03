import Link from "next/link";
import { site } from "@/lib";
import { LegalView } from "@/ui/views";

/**
 * Plain terms for a free tool that holds none of your data. Written to be read
 * rather than skipped, anything a normal person would care about is stated in
 * a sentence, not buried in a clause.
 *
 * This is not legal advice and has not been reviewed by a lawyer. Before
 * taking money or handling data server-side, it needs to be.
 */
export function TermsContent() {
  return (
    <LegalView kicker="Terms" title="Terms of use" updated="30 July 2026" path="/terms">

        <p>
          Using {site.name} means you accept what is below. It is short
          because the service is simple: a free tool that runs in your
          browser and keeps nothing.
        </p>

        <h2>What you get</h2>
        <p>
          Permission to use the site to write, style, export and check
          resumes, for yourself or for other people, personally or
          commercially. There is no charge, no usage limit, and no account.
        </p>

        <h2>What you own</h2>
        <p>
          Your resume is yours. We claim no rights over anything you write or
          export, and we could not use it if we wanted to, because it never reaches
          us. See the <Link href="/privacy">privacy page</Link>.
        </p>

        <h2>Your responsibilities</h2>
        <ul>
          <li>
            Keep your own backups. Your documents live in your browser, and
            clearing its data deletes them. Export the JSON file regularly.
          </li>
          <li>
            Do not use the site to break the law, or attempt to disrupt it for
            other people.
          </li>
          <li>
            Make sure what your resume says is true. The tool checks structure,
            not honesty.
          </li>
        </ul>

        <h2>What we do not promise</h2>
        <p>
          No applicant tracking system publishes how it parses documents, and
          vendors change their parsers without notice. So we do not promise
          that a resume built or checked here will be read correctly by any
          particular system, that any check is exhaustive, or that using this
          tool will affect whether you get an interview.
        </p>
        <p>
          The site is provided as it is, without warranty of any kind. To the
          extent the law allows, we are not liable for any loss arising from
          using it, including lost documents, missed applications, or an
          outcome in a hiring process.
        </p>

        <h2>Availability</h2>
        <p>
          This is an early project. Features may change or be removed, and the
          site may be unavailable at times. Because everything runs locally, a
          site outage does not put your documents at risk, but it does mean
          you cannot reach the editor until it is back.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may change; the date at the top will change with them.
          Continuing to use the site after a change means accepting it.
        </p>

        <p>
          <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/">Back to the site</Link>
        </p>
    </LegalView>
  );
}
