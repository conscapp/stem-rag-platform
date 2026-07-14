import Link from "next/link";
import { COMPANY_LEGAL } from "@/lib/legal";

export default function AboutPage() {
  return (
    <div className="page-container about-page">
      <p className="platform-eyebrow">The consc company</p>
      <h1 className="platform-title">Making polymaths of everyone</h1>
      <p className="platform-lead">
        conscRAG at <strong>conscrag.com</strong> is built so anyone with curiosity can innovate —
        even with just a basic idea and no deep STEM background.
      </p>

      <section className="about-section sponsor-callout">
        <h2>Our bet</h2>
        <p>
          Breakthroughs start as intuition. “What if we used another isotope?” “What about energy
          at room temperature?” You should not need years of training to explore those questions.
        </p>
        <p style={{ marginTop: "1rem" }}>
          conscRAG translates plain language into technical search, retrieves evidence across
          physics, chemistry, math, and engineering, and connects what we know. We never declare
          ideas possible or impossible — only what information is missing.
        </p>
      </section>

      <section className="about-section">
        <h2>What we are building</h2>
        <ul>
          <li><strong>conscRAG</strong> — Interpreter, Navigator, Connector, Synthesizer</li>
          <li><strong>Three domains</strong> — Aerospace, Nanotechnology, Nuclear Fusion</li>
          <li><strong>Four STEM subjects</strong> — connected by information science</li>
          <li><strong>Community portfolio</strong> — share explorations with supporters</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>How the agent pipeline works</h2>
        <ol>
          <li><strong>Interpreter</strong> — rephrases your plain idea into technical search terms</li>
          <li><strong>Navigator</strong> — retrieves evidence deeply from our knowledge base</li>
          <li><strong>Connector</strong> — links cross-STEM evidence and lists missing information</li>
          <li><strong>Synthesizer</strong> — explores paths forward and suggests next questions</li>
        </ol>
      </section>

      <section className="about-section">
        <h2>Community &amp; support</h2>
        <p>
          This platform is for explorers and the public who want to support deep-tech innovation.
          Bootstrap today, community donations tomorrow. Every contribution grows the knowledge base.
        </p>
        <div className="cta-row">
          <a href="https://opencollective.com" className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Support via Open Collective
          </a>
          <Link href="/create" className="btn btn-secondary">
            Explore an Idea
          </Link>
        </div>
      </section>

      <section className="about-section">
        <h2>Contact &amp; license</h2>
        <p>
          Platform: <a href="https://conscrag.com">conscrag.com</a> · Product: conscRAG ·
          Company: The consc company · Contact:{" "}
          <a href={`mailto:${COMPANY_LEGAL.contactEmail}`}>{COMPANY_LEGAL.contactEmail}</a> · MIT License (open core)
        </p>
      </section>
    </div>
  );
}
