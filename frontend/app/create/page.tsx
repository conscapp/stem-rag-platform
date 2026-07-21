"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QueryBox from "@/components/QueryBox";
import MarkdownMath from "@/components/MarkdownMath";
import NoveltyPanel from "@/components/NoveltyPanel";
import AiDisclaimer from "@/components/AiDisclaimer";
import { formatDomain } from "@/lib/domains";
import { LEGAL_VERSION } from "@/lib/legal";
import { queryRag, checkNovelty, submitInnovation, type QueryResponse, type NoveltyReport } from "@/lib/api";

export default function CreatePage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [novelty, setNovelty] = useState<NoveltyReport | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("anonymous");
  const [innovationSummary, setInnovationSummary] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [publishConsent, setPublishConsent] = useState(false);

  const sources = result?.sources.map((s) => ({
    index: s.index,
    source_file: s.source_file,
    subject: s.subject,
    concepts: s.concepts,
    related_subjects: s.related_subjects,
    domains: s.domains,
  })) ?? [];

  const handleQuery = async (
    query: string,
    selectedDomain: string,
    subject: string,
    proofMode: boolean
  ) => {
    setLoading(true);
    setError("");
    setSuccess("");
    setResult(null);
    setNovelty(null);
    try {
      const res = await queryRag(query, selectedDomain, subject || undefined, proofMode);
      setResult(res);
      setContent(res.answer);
      if (!title) setTitle(query.slice(0, 100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNovelty = async () => {
    if (!title.trim() || !content.trim() || !domain) return;
    setChecking(true);
    setError("");
    setNovelty(null);
    try {
      const report = await checkNovelty({
        title: title.trim(),
        content_markdown: content.trim(),
        domain,
        sources,
      });
      setNovelty(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Novelty check failed");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !innovationSummary.trim() || !domain) {
      setError("Complete domain, title, innovation summary, and analysis before submitting.");
      return;
    }
    if (!termsAccepted) {
      setError("Accept the Terms of Use and Privacy Policy before submitting.");
      return;
    }
    if (!publishConsent) {
      setError("Confirm portfolio publication consent before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await submitInnovation({
        title: title.trim(),
        content_markdown: content.trim(),
        author_name: authorName.trim() || "anonymous",
        domain,
        sources,
        innovation_summary: innovationSummary.trim(),
        terms_accepted: true,
        terms_version: LEGAL_VERSION,
        publish_consent: publishConsent,
      });
      setSuccess(
        "Submitted for review. Cross-domain ideas score higher — approved explorations appear in the portfolio."
      );
      setTimeout(() => router.push("/feed"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission rejected");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container create-page">
      <div className="page-header">
        <p className="platform-eyebrow">Innovation Lab · No experience needed</p>
        <h1 className="platform-title">Generate your idea</h1>
        <p className="page-desc">
          Type a hunch in plain language — no experience needed. The four-agent pipeline turns it
          into cross-STEM evidence, connections, and next questions — usually in 30–60 seconds.
          STEM explorers: publish for review — cross-domain ideas score higher.
        </p>
        <div className="create-expectations" aria-label="What to expect">
          <span><strong>1</strong> Ask naturally</span>
          <span><strong>2</strong> Wait 30–60 sec</span>
          <span><strong>3</strong> Review evidence</span>
        </div>
      </div>

      <QueryBox
        domain={domain}
        onDomainChange={setDomain}
        onSubmit={handleQuery}
        loading={loading}
      />

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {result && (
        <div className="result-panel">
          <AiDisclaimer />
          {result.interpreter_restatement && (
            <div className="interpreter-restatement platform-panel">
              <p className="panel-label">We understood your idea as</p>
              <p className="interpreter-text">{result.interpreter_restatement}</p>
            </div>
          )}
          <div className="result-header">
            <span className="model-badge">Domain · {formatDomain(domain)}</span>
            <span>{result.sources.length} evidence blocks</span>
            <span>
              Subjects: {[...new Set(result.sources.map((s) => s.subject).filter(Boolean))].join(", ") || "cross-STEM"}
            </span>
          </div>

          {result.agents && result.agents.length > 0 && (
            <div className="agent-pipeline">
              <p className="panel-label">Agent pipeline</p>
              <ol className="agent-steps">
                {result.agents.map((a, i) => (
                  <li key={i}>
                    <strong>{a.agent}</strong>
                    <span className="ref-meta"> · {a.role}</span>
                    <p className="agent-summary">{a.summary}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.sources.length > 0 && (
            <details className="citation-block">
              <summary>Evidence package ({result.sources.length})</summary>
              <ol className="reference-list">
                {result.sources.map((s) => (
                  <li key={s.index}>
                    <span className="ref-num">[{s.index}]</span>
                    <span>{s.source_file}</span>
                    {s.subject && <span className="ref-meta"> · {s.subject}</span>}
                    {s.concepts && s.concepts.length > 0 && (
                      <span className="ref-meta"> · {s.concepts.slice(0, 4).join(", ")}</span>
                    )}
                    <p className="ref-excerpt">{s.text.slice(0, 280)}…</p>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="edit-section platform-panel" style={{ marginTop: "1.25rem" }}>
            <label>
              Innovation title
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setNovelty(null); }}
                placeholder="Name your deep-tech innovation"
              />
            </label>
            <label>
              What is novel? (required for sponsorship review)
              <textarea
                value={innovationSummary}
                onChange={(e) => setInnovationSummary(e.target.value)}
                rows={2}
                placeholder="What makes this innovation novel?"
              />
            </label>
            <label>
              Contributor
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="anonymous"
              />
            </label>
            <label>
              Analysis report (editable)
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setNovelty(null); }}
                rows={16}
              />
            </label>
          </div>

          <div className="preview-section">
            <h3>Report preview</h3>
            <MarkdownMath content={content} />
          </div>

          <div className="consent-block platform-panel">
            <label className="consent-label">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                I understand my submission will be processed by AI and reviewed by The consc company.
              </span>
            </label>
            <label className="consent-label">
              <input
                type="checkbox"
                checked={publishConsent}
                onChange={(e) => setPublishConsent(e.target.checked)}
              />
              <span>
                If approved, I consent to publication in the public portfolio under my contributor name.
              </span>
            </label>
          </div>

          <div className="submit-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCheckNovelty}
              disabled={checking || !title.trim() || !content.trim() || !domain}
            >
              {checking ? "Checking…" : "Validate Novelty"}
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim() || !innovationSummary.trim() || !domain || !termsAccepted || !publishConsent}
            >
              {submitting ? "Submitting…" : "Publish for review"}
            </button>
          </div>

          {novelty && <NoveltyPanel report={novelty} />}
        </div>
      )}
    </div>
  );
}
