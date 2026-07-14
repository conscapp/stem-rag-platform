"use client";

import { useEffect, useState } from "react";
import MarkdownMath from "@/components/MarkdownMath";
import { listPendingPosts, approvePost, rejectPost, type Post } from "@/lib/api";

export default function AdminReviewPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [pending, setPending] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const loadPending = async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const posts = await listPendingPosts(key);
      setPending(posts);
      setAuthenticated(true);
      sessionStorage.setItem("admin_key", key);
    } catch {
      setError("Invalid admin key or server error");
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_key");
    if (saved) {
      setAdminKey(saved);
      loadPending(saved);
    }
  }, []);

  const handleApprove = async (postId: string) => {
    try {
      await approvePost(postId, adminKey, reviewNotes[postId]);
      setPending((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleReject = async (postId: string) => {
    try {
      await rejectPost(postId, adminKey, reviewNotes[postId] || "Does not meet innovation standards.");
      setPending((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  };

  if (!authenticated) {
    return (
      <div className="page-container admin-page">
        <h1>Admin Review</h1>
        <p className="page-desc">Approve only genuinely new cross-STEM innovations.</p>
        {error && <div className="error-banner">{error}</div>}
        <div className="admin-login">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin API key"
          />
          <button
            className="btn btn-primary"
            onClick={() => loadPending(adminKey)}
            disabled={!adminKey || loading}
          >
            {loading ? "Loading..." : "Enter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container admin-page">
      <h1>Pending Innovations ({pending.length})</h1>
      <p className="page-desc">Review submissions. Only approve designs that combine STEM fields in a genuinely new way.</p>
      {error && <div className="error-banner">{error}</div>}

      {pending.length === 0 && <p className="empty-state">No pending submissions.</p>}

      <div className="review-list">
        {pending.map((post) => (
          <article key={post.id} className="review-card">
            <header>
              <h2>{post.title}</h2>
              <div className="review-meta">
                <span>by {post.author_name}</span>
                {post.novelty_score != null && (
                  <span className="novelty-badge">Novelty: {post.novelty_score.toFixed(0)}/100</span>
                )}
                {post.disciplines?.map((d) => (
                  <span key={d} className="tag tag-discipline">{d}</span>
                ))}
              </div>
              {post.innovation_summary && (
                <p className="innovation-summary"><strong>What&apos;s new:</strong> {post.innovation_summary}</p>
              )}
            </header>
            <div className="review-content">
              <MarkdownMath content={post.content_markdown} />
            </div>
            <textarea
              placeholder="Review notes (optional for approve, recommended for reject)"
              value={reviewNotes[post.id] || ""}
              onChange={(e) => setReviewNotes((prev) => ({ ...prev, [post.id]: e.target.value }))}
              rows={2}
            />
            <div className="review-actions">
              <button className="btn btn-primary" onClick={() => handleApprove(post.id)}>
                Approve & Publish
              </button>
              <button className="btn btn-secondary" onClick={() => handleReject(post.id)}>
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
