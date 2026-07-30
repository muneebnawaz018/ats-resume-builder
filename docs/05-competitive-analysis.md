# Competitive Analysis

## Landscape

| Product | Model | Free export | Local data | Deep customization | ATS lint | DOCX quality |
| --- | --- | --- | --- | --- | --- | --- |
| Zety | Sub, ~$24/mo | No | No | Low | Marketing-grade | Table-based |
| Resume.io | Sub, ~$25/mo | No | No | Low | Shallow | Table-based |
| Novoresume | Freemium | Limited | No | Low | Shallow | Mixed |
| Kickresume | Freemium | Limited | No | Medium | Shallow | Mixed |
| Enhancv | Sub | No | No | Medium | Shallow | Design-first, ATS-poor |
| Rezi | Sub | Limited | No | Low | Genuine, paywalled | Decent |
| Teal | Freemium | Yes | No | Low | Genuine, mostly paid | Decent |
| FlowCV | Free-leaning | Yes | No | Medium | Basic | Decent |
| Standard Resume | Sub | No | No | Low | None | Good |
| Canva | Freemium | Yes | No | Very high | None | ATS-hostile by design |
| LaTeX/Overleaf | Free | Yes | No | Total | None | No DOCX |
| JSON Resume | Free OSS | Yes | Yes | Via themes | None | Weak |

## Where the gaps actually are

**Nobody combines free export + local-only data + deep customization + real ATS linting.** Individually each exists somewhere; the combination does not, and the reason is structural rather than technical.

- Free unlimited export is blocked because the download *is* the paywall for the subscription products.
- Local-only data is blocked because the email address feeds the funnel.
- Deep customization is blocked because a locked template guarantees the output looks acceptable, which protects the brand and reduces support load.
- Real ATS linting is blocked because honest linting means telling users their design choices are bad, which conflicts with selling attractive templates.

An independent, free tool has none of these constraints. That is the opening. It is not a technology advantage and should not be described as one.

**Secondary gaps:**

- DOCX exports across the category are frequently table-based, which is the exact failure the products claim to prevent. A genuinely paragraph-based DOCX is a defensible, checkable claim.
- Theme portability does not exist anywhere. Exportable theme JSON that users share is a community mechanic no incumbent will copy.
- Version diffing for per-job tailoring exists only in Teal, behind payment.

## Honest risk assessment

**Technical risk: low.** Everything in the v1 scope is well-trodden. The two genuinely hard parts are DOCX correctness (slow, opaque debugging, budget a week, not a day) and import classification (accuracy ceiling around 80% on conventional resumes, materially worse on designed ones). Neither threatens the project; both threaten the schedule.

**Distribution risk: high, and this is the real constraint.**

Search terms in this category, "resume builder", "free resume builder", "ats resume", are among the most commercially contested on the web. The incumbents run large content operations and buy the ads. Ranking on head terms is not realistic for a new site.

What is realistic:

- **Long-tail and tool-intent queries.** "ats resume checker free no signup", "resume builder that doesn't require payment to download", "convert resume to ats friendly docx", "resume builder no account", specific format queries by country or role. Lower volume, far higher intent, and the incumbents write blog posts rather than tools for these.
- **Programmatic pages with genuine utility.** A page per role ("ATS resume for backend engineer") is only worth building if each page contains a real prefilled starting document and role-specific rules, not spun text. Thin programmatic pages are a liability under current search quality systems.
- **Community distribution.** r/resumes, r/EngineeringResumes, r/cscareerquestions, Hacker News, Product Hunt, Dev.to. The "free, no signup, data never leaves your browser" framing performs well in these venues specifically because it reads as a reaction against the incumbents.
- **Open source.** Publishing the source makes the privacy claim verifiable rather than asserted, and GitHub is a distribution channel in its own right.

**Monetisation reality.** Display advertising on this traffic pays roughly $2–8 RPM. At 50,000 monthly pageviews (an achievement, not a baseline) that is $100–400/month. Resume traffic is also structurally hostile to ad models: users arrive once, complete a task, and leave. Return visits are rare, session depth is low.

If revenue matters, ads are the wrong instrument. Better options, in order:

1. Keep the core free forever; charge for genuinely optional convenience (cloud sync across devices, unlimited stored versions). This requires a backend and should not be built until demand is demonstrated.
2. Affiliate links to job boards and interview prep, disclosed.
3. Donations/sponsorship if open source.

Ads are acceptable as a small, non-intrusive layer, but should be treated as incidental rather than as the plan. Anything that degrades the "free and clean" positioning attacks the only real differentiator.

**Overall:** the build is very likely to succeed. Reaching meaningful traffic through search alone is unlikely. Reaching a useful audience through community distribution plus long-tail intent queries is plausible. Plan for the second.

## Strategic recommendation

Lead with the linter, not the builder.

"Check whether your resume survives ATS parsing" is a single-purpose, shareable, low-commitment tool with a clear query intent and no dominant free incumbent. It requires no account and no data upload. The builder then becomes the natural next step for users whose resume fails the check.

That ordering also inverts the acquisition problem: the checker is the thing people link to and search for; the builder is the thing people use once they arrive.
