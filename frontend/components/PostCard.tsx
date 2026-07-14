"use client";

import Link from "next/link";
import MarkdownMath from "./MarkdownMath";
import { formatDomain } from "@/lib/domains";
import type { Post } from "@/lib/api";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="post-card paper-abstract">
      <header className="post-card-header">
        <h2>{post.title}</h2>
        <div className="post-meta">
          <span>by {post.author_name}</span>
          <span>{date}</span>
          {post.novelty_score != null && (
            <span className="novelty-badge">Novelty {post.novelty_score.toFixed(0)}</span>
          )}
        </div>
        {post.domain && (
          <span className="tag tag-domain">
            {formatDomain(post.domain)}
          </span>
        )}
        {post.disciplines && post.disciplines.length > 0 && (
          <div className="discipline-tags">
            {post.disciplines.map((d) => (
              <span key={d} className="tag tag-discipline">{d}</span>
            ))}
          </div>
        )}
        {post.innovation_summary && (
          <p className="innovation-summary">{post.innovation_summary}</p>
        )}
      </header>
      <div className="post-content">
        <MarkdownMath content={post.content_markdown} />
      </div>
      {post.sources && post.sources.length > 0 && (
        <footer className="post-sources">
          <strong>Sources:</strong>{" "}
          {post.sources.map((s, i) => {
            const idx = typeof s.index === "number" ? s.index : i + 1;
            const file = typeof s.source_file === "string" ? s.source_file : "unknown";
            return (
              <span key={i} className="source-tag">
                [{idx}] {file}
              </span>
            );
          })}
        </footer>
      )}
    </article>
  );
}
