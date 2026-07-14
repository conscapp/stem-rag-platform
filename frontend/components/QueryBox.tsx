"use client";

import { useState } from "react";
import { DOMAIN_OPTIONS, EXAMPLE_QUERIES, EXAMPLE_QUERIES_ALT } from "@/lib/domains";

interface QueryBoxProps {
  domain: string;
  onDomainChange: (domain: string) => void;
  onSubmit: (query: string, domain: string, subject: string, proofMode: boolean) => void;
  loading?: boolean;
}

export default function QueryBox({ domain, onDomainChange, onSubmit, loading }: QueryBoxProps) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [proofMode, setProofMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3 || !domain) return;
    onSubmit(query.trim(), domain, subject, proofMode);
  };

  const examples = domain
    ? [EXAMPLE_QUERIES[domain], EXAMPLE_QUERIES_ALT[domain]].filter(Boolean) as string[]
    : [];

  return (
    <div className="query-box platform-panel">
      <div className="panel-head">
        <p className="panel-label">Your idea or question</p>
        <p className="panel-hint">Plain language is fine · Interpreter → Navigator → Connector → Synthesizer</p>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a hunch, question, or possibility — e.g. “Can we use another hydrogen isotope?” or “How could nuclear energy work at room temperature?”"
          rows={5}
          disabled={loading}
          className="platform-input"
        />
        <div className="query-controls">
          <div className="control-group">
            <label className="control-label">Domain</label>
            <select
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              disabled={loading}
              required
              className="platform-select"
            >
              <option value="">Select domain</option>
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label className="control-label">Subject filter</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
              className="platform-select"
            >
              <option value="">All STEM subjects</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="math">Math</option>
              <option value="engineering">Engineering</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{ marginBottom: "0.65rem" }}
          >
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || query.trim().length < 3 || !domain}
          >
            {loading ? "Exploring your idea…" : "Explore"}
          </button>
        </div>
        {showAdvanced && (
          <label className="proof-toggle" style={{ marginTop: "0.75rem" }}>
            <input
              type="checkbox"
              checked={proofMode}
              onChange={(e) => setProofMode(e.target.checked)}
              disabled={loading}
            />
            Formal proof mode (slower, more rigorous)
          </label>
        )}
      </form>
      {examples.length > 0 && (
        <div className="example-queries">
          <span className="examples-label">Try asking</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => setQuery(example)}
              disabled={loading}
              style={{ marginBottom: "0.5rem" }}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
