import Link from "next/link";
import { COMPANY_LEGAL } from "@/lib/legal";

export default function FounderPage() {
  return (
    <div className="page-container founder-page">
      <p className="platform-eyebrow">The Consc Company · Follow the build</p>
      <h1 className="platform-title">Mission before the pitch</h1>
      <p className="platform-lead">
        A community of innovators. A useful knowledge base. Real explorations in aerospace,
        nanotechnology, and nuclear fusion — connected the right way for the right innovation.
      </p>

      <section className="about-section sponsor-callout" id="mission">
        <h2>The mission</h2>
        <ul>
          <li>Build a community of innovators</li>
          <li>Grow a database of useful knowledge</li>
          <li>Make innovations — and keep shipping them</li>
          <li>
            Connect the right knowledge, in the right direction, in the right way, for the right
            innovation
          </li>
          <li>Expand toward the space industry with substance, not hype</li>
        </ul>
        <p style={{ marginTop: "1rem" }}>
          Promise: conscRAG stays <strong>free forever for innovators</strong>, and keeps improving.
        </p>
      </section>

      <section className="about-section" id="founder">
        <h2>Founder</h2>
        <p>
          <strong>Vee</strong> · 19 · Canada ·{" "}
          <a href={`mailto:${COMPANY_LEGAL.contactEmail}`}>{COMPANY_LEGAL.contactEmail}</a>
        </p>
        <p>
          Self-taught through books on technology, space, and science. Grew up around a truck
          manufacturing factory — building with scraps — and works in long-term care. conscRAG is a
          first step toward an aerospace career, built in public.
        </p>
      </section>

      <section className="about-section" id="support">
        <h2>Support the build</h2>
        <p>
          Deep tech should not wait only on governments or opaque VC plays. If you would rather fund
          a transparent movement, start here.
        </p>

        <p className="founder-milestone">
          <strong>Now — $10 first donation</strong>
          <br />
          The first public signal that this journey should continue. It funds hosting, AI usage, and
          knowledge growth while the platform stays open.
        </p>

        <p className="founder-milestone">
          <strong>Long-term — $1M milestone</strong>
          <br />
          Unlocks stronger proof, unites engineers and innovators, and moves toward a public-company
          path where co-builders can join with clear traction.
        </p>

        <p>
          What your support does: infrastructure · intelligence · knowledge · keeping innovators free
          to explore.
        </p>
      </section>

      <section className="about-section" id="ask">
        <h2>The ask</h2>
        <p>
          Help start this journey with a small donation — for the future of the space industry, and
          for open expansion into it. Watch the $1M milestone; then we build together.
        </p>
        <div className="cta-row">
          <a
            href={`mailto:${COMPANY_LEGAL.contactEmail}?subject=Support%20conscRAG%20%E2%80%94%20%2410%20first%20donation`}
            className="btn btn-primary"
          >
            Donate to prove it — $10
          </a>
          <Link href="/create" className="btn btn-secondary">
            Generate your idea
          </Link>
        </div>
        <p className="founder-note">
          Open Collective fiscal hosting is in progress. Until the public donate link is live, email
          me and I will guide the first donation personally.
        </p>
      </section>
    </div>
  );
}
