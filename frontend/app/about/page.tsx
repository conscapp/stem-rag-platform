import Link from "next/link";
import { COMPANY_LEGAL } from "@/lib/legal";

export default function AboutPage() {
  return (
    <div className="page-container about-page">
      <p className="platform-eyebrow">The Consc Company</p>
      <h1 className="platform-title">What conscRAG is</h1>
      <p className="platform-lead">
        An open polymath platform for aerospace, nanotechnology, and nuclear fusion — so curious
        innovators and STEM explorers can turn hunches into grounded explorations.
      </p>

      <section className="about-section sponsor-callout">
        <h2>The product</h2>
        <p>
          conscRAG translates plain language into technical search, retrieves evidence across
          physics, chemistry, math, and engineering, and connects what we know. We never declare
          ideas possible or impossible — only what information is missing.
        </p>
      </section>

      <section className="about-section">
        <h2>What we are building</h2>
        <ul>
          <li>
            <strong>conscRAG</strong> — Interpreter, Navigator, Connector, Synthesizer
          </li>
          <li>
            <strong>Three domains</strong> — Aerospace, Nanotechnology, Nuclear Fusion
          </li>
          <li>
            <strong>Four STEM subjects</strong> — connected in one workflow
          </li>
          <li>
            <strong>Community portfolio</strong> — publish exploratory ideas for review
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>For innovators</h2>
        <p>
          Free forever for innovators. No PhD required to start. Cross-domain ideas are welcome —
          that is the point.
        </p>
        <div className="cta-row">
          <Link href="/create" className="btn btn-primary">
            Generate your idea
          </Link>
          <Link href="/founder" className="btn btn-secondary">
            Mission &amp; support
          </Link>
        </div>
      </section>

      <section className="about-section">
        <h2>Contact &amp; license</h2>
        <p>
          Platform: <a href="https://conscrag.com">conscrag.com</a> · Product: conscRAG · Company:
          The Consc Company · Contact:{" "}
          <a href={`mailto:${COMPANY_LEGAL.contactEmail}`}>{COMPANY_LEGAL.contactEmail}</a> · MIT
          License (open core)
        </p>
      </section>
    </div>
  );
}
