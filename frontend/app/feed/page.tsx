"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import { listPosts, type Post } from "@/lib/api";

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container feed-page">
      <div className="page-header">
        <p className="platform-eyebrow">Community Portfolio</p>
        <h1 className="platform-title">Published explorations</h1>
        <p className="page-desc">
          Public proof from the conscRAG community — aerospace, nanotechnology, and nuclear fusion.
          STEM explorers: publish for review and build a visible portfolio. Future co-builders: watch
          traction grow toward the $1M milestone.
        </p>
      </div>

      {loading && <p className="loading">Loading portfolio…</p>}

      {!loading && error && (
        <div className="empty-state platform-panel">
          <p>
            Portfolio is warming up — no published innovations are available yet. You can still
            generate an idea now; approved posts will appear here.
          </p>
          <p className="page-desc" style={{ marginTop: "0.75rem" }}>
            {error}
          </p>
          <div className="cta-row" style={{ justifyContent: "center", marginTop: "1.25rem" }}>
            <Link href="/create" className="btn btn-primary">
              Generate your idea
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="empty-state platform-panel">
          <p>
            No published innovations yet. Be the first — generate an idea and publish for review.
          </p>
          <div className="cta-row" style={{ justifyContent: "center", marginTop: "1.25rem" }}>
            <Link href="/create" className="btn btn-primary">
              Generate your idea
            </Link>
          </div>
        </div>
      )}

      <div className="feed-list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
