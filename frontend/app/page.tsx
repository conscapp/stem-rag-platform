import Link from "next/link";

const DOMAINS = [
  {
    name: "Aerospace",
    desc: "Propulsion, orbits, and materials — from a hunch to grounded exploration.",
  },
  {
    name: "Nanotechnology",
    desc: "Atoms, surfaces, and engineered matter — ask what-if at the smallest scale.",
  },
  {
    name: "Nuclear Fusion",
    desc: "Plasma, isotopes, and energy pathways — first-principles, not hype.",
  },
];

const AGENTS = [
  {
    label: "01 — Interpreter",
    title: "Understand",
    desc: "Turns your plain idea into technical search language.",
  },
  {
    label: "02 — Navigator",
    title: "Retrieve",
    desc: "Finds evidence across physics, chemistry, math, and engineering.",
  },
  {
    label: "03 — Connector",
    title: "Link",
    desc: "Connects cross-STEM evidence and names what is still missing.",
  },
  {
    label: "04 — Synthesizer",
    title: "Explore",
    desc: "Builds paths forward and suggests what to ask next.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-full">
        <div className="hero-inner">
          <p className="platform-eyebrow">The Consc Company · conscRAG</p>
          <h1 className="platform-title">
            Your hunch can start
            <br />
            something real
          </h1>
          <p className="platform-lead">
            Generate an idea on conscrag.com — no experience needed. We turn plain-language
            intuition into cross-STEM evidence for aerospace, nanotechnology, and nuclear fusion —
            visionary, but grounded in first principles.
          </p>

          <div className="domain-pills">
            <span className="domain-pill">Aerospace</span>
            <span className="domain-pill">Nanotechnology</span>
            <span className="domain-pill">Nuclear Fusion</span>
          </div>

          <div className="hero-actions">
            <Link href="/create" className="btn btn-primary btn-lg">
              Generate your idea
            </Link>
            <Link href="/founder" className="btn btn-secondary btn-lg">
              Follow the build
            </Link>
          </div>
        </div>
        <span className="hero-scroll-hint">Scroll</span>
      </section>

      <section className="story-section">
        <div className="story-inner story-grid">
          <div>
            <p className="platform-eyebrow">For the curious</p>
            <h2 className="section-title">
              Ideas should not
              <br />
              die in notebooks
            </h2>
          </div>
          <div>
            <p className="story-body">
              You have a hunch about fusion, rockets, or materials — but Google gives fragments, and
              experts feel unreachable. You want to turn intuition into something real, and be taken
              seriously without a PhD.
            </p>
            <p className="story-body">
              conscRAG synthesizes what we know, shows what is missing, and never declares your idea
              possible or impossible. Your hunch might be the missing piece.
            </p>
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="story-inner story-grid">
          <div>
            <p className="platform-eyebrow">The mission</p>
            <h2 className="section-title">
              A credible path
              <br />
              to deep space
            </h2>
          </div>
          <div>
            <p className="story-body">
              Fusion propulsion and nanotech materials matter — but hype without substance does not.
              conscRAG is built as an open knowledge movement: useful evidence, transparent process,
              and room for innovators to explore together.
            </p>
            <p className="story-body">
              Follow the build. Share what feels visionary and first-principles. Help prove that
              deep tech can stay open.
            </p>
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="story-inner">
          <p className="platform-eyebrow">How it works</p>
          <h2 className="section-title">Four agents. One clear process.</h2>
          <p className="story-body" style={{ marginTop: "1rem", maxWidth: "560px" }}>
            One workflow across aerospace, nanotech, and fusion — so explorers are not stuck in a
            single silo.
          </p>
          <div className="agent-grid" style={{ marginTop: "2.5rem" }}>
            {AGENTS.map((agent) => (
              <div key={agent.label} className="story-stat">
                <p className="story-stat-label">{agent.label}</p>
                <p className="story-stat-title">{agent.title}</p>
                <p className="story-stat-desc">{agent.desc}</p>
              </div>
            ))}
          </div>
          <div className="cta-row" style={{ marginTop: "2rem" }}>
            <Link href="/create" className="btn btn-secondary">
              See it on a real question
            </Link>
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
        <p className="platform-eyebrow">Start here</p>
        <h2 className="section-title">Generate your idea on conscrag.com</h2>
        <p className="platform-lead">
          Free for innovators. Explore first — or support the build if you believe open deep tech
          should exist.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link href="/create" className="btn btn-primary btn-lg">
            Generate your idea
          </Link>
          <Link href="/founder#support" className="btn btn-secondary btn-lg">
            Support the build
          </Link>
        </div>
      </section>
    </>
  );
}
