import Link from "next/link";

const DOMAINS = [
  {
    name: "Aerospace",
    desc: "Rockets, orbits, propulsion — explore from intuition, not textbooks.",
  },
  {
    name: "Nanotechnology",
    desc: "Atoms, surfaces, quantum effects — ask what-if questions at the smallest scale.",
  },
  {
    name: "Nuclear Fusion",
    desc: "Isotopes, plasma, energy — ask plain questions about fusion without the jargon.",
  },
];

const AGENTS = [
  {
    label: "01 — Interpreter",
    title: "Understand",
    desc: "Turns your plain idea into technical search language so the system knows what to look for.",
  },
  {
    label: "02 — Navigator",
    title: "Retrieve",
    desc: "Searches deeply across physics, chemistry, math, and engineering in our knowledge base.",
  },
  {
    label: "03 — Connector",
    title: "Link",
    desc: "Connects evidence across STEM and lists what information is still missing — never judges possible or impossible.",
  },
  {
    label: "04 — Synthesizer",
    title: "Explore",
    desc: "Builds paths forward from evidence and suggests what to ask next.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-full">
        <div className="hero-inner">
          <p className="platform-eyebrow">The consc company</p>
          <h1 className="platform-title">
            Turn intuition<br />
            into innovation
          </h1>
          <p className="platform-lead">
            conscRAG helps anyone think like a polymath. Type a hunch or question in plain language —
            we translate it, retrieve cross-STEM evidence, and explore paths forward. Missing data is
            not a dead end.
          </p>

          <div className="domain-pills">
            <span className="domain-pill">Aerospace</span>
            <span className="domain-pill">Nanotechnology</span>
            <span className="domain-pill">Nuclear Fusion</span>
          </div>

          <div className="hero-actions">
            <Link href="/create" className="btn btn-primary btn-lg">
              Explore an Idea
            </Link>
            <Link href="/about" className="btn btn-secondary btn-lg">
              Our Mission
            </Link>
          </div>
        </div>
        <span className="hero-scroll-hint">Scroll</span>
      </section>

      <section className="story-section">
        <div className="story-inner story-grid">
          <div>
            <p className="platform-eyebrow">Mission</p>
            <h2 className="section-title">Anyone can innovate<br />with a basic idea</h2>
          </div>
          <div>
            <p className="story-body">
              You do not need a PhD to ask the right question. A rough intuition — “what if we used
              another hydrogen isotope?” or “energy at room temperature?” — is enough to start.
            </p>
            <p className="story-body">
              The consc company built conscRAG for explorers and supporters who believe deep-tech
              innovation should be open to everyone, not just experts.
            </p>
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="story-inner">
          <p className="platform-eyebrow">How it works</p>
          <h2 className="section-title">Four agents. One polymath mind.</h2>
          <div className="agent-grid" style={{ marginTop: "3rem" }}>
            {AGENTS.map((agent) => (
              <div key={agent.label} className="story-stat">
                <p className="story-stat-label">{agent.label}</p>
                <p className="story-stat-title">{agent.title}</p>
                <p className="story-stat-desc">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="story-inner">
          <p className="platform-eyebrow">Domains</p>
          <h2 className="section-title">Where we explore</h2>
          <div className="domain-strip">
            {DOMAINS.map((d) => (
              <article key={d.name} className="domain-card">
                <p className="domain-card-label">Innovation domain</p>
                <h3>{d.name}</h3>
                <p>{d.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-cta">
        <p className="platform-eyebrow">Innovation Lab</p>
        <h2 className="section-title">Start with a question</h2>
        <p className="platform-lead">
          No jargon required. Our agents rephrase your idea, search the knowledge base, connect
          the science, and tell you what is missing — never what is impossible.
        </p>
        <Link href="/create" className="btn btn-primary btn-lg">
          Explore an Idea
        </Link>
      </section>
    </>
  );
}
