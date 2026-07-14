"use client";

import type { NoveltyReport } from "@/lib/api";

interface NoveltyPanelProps {
  report: NoveltyReport;
}

export default function NoveltyPanel({ report }: NoveltyPanelProps) {
  const scoreColor =
    report.novelty_score >= 70 ? "score-high" :
    report.novelty_score >= 40 ? "score-mid" : "score-low";

  return (
    <div className={`novelty-panel ${report.recommendation === "reject" ? "novelty-reject" : ""}`}>
      <h3>Novelty Analysis</h3>
      <div className="novelty-stats">
        <div className={`novelty-score ${scoreColor}`}>
          <span className="score-value">{report.novelty_score.toFixed(0)}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="novelty-tags">
          <span className={`tag ${report.is_cross_disciplinary ? "tag-ok" : "tag-warn"}`}>
            {report.is_cross_disciplinary ? "Cross-STEM" : "Single field only"}
          </span>
          <span className={`tag ${report.is_duplicate ? "tag-warn" : "tag-ok"}`}>
            {report.is_duplicate ? "Similar to existing" : "Novel"}
          </span>
          {report.disciplines.map((d) => (
            <span key={d} className="tag tag-discipline">{d}</span>
          ))}
        </div>
      </div>

      {report.rejection_reason && (
        <p className="novelty-reason">{report.rejection_reason}</p>
      )}

      {report.similar_innovations.length > 0 && (
        <div className="similar-list">
          <strong>Similar existing innovations:</strong>
          <ul>
            {report.similar_innovations.map((s) => (
              <li key={s.post_id}>
                {s.title} ({(s.similarity * 100).toFixed(1)}% match)
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendation !== "reject" && (
        <p className="novelty-ok">
          Passes automated novelty gate. Submit for human review to publish on the feed.
        </p>
      )}
    </div>
  );
}
