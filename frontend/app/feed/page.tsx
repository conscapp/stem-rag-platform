"use client";

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
        <h1 className="platform-title">Shared Explorations</h1>
        <p className="page-desc">
          Breakthrough explorations in aerospace, nanotechnology, and nuclear fusion — shared by
          the conscRAG community and The consc company.
        </p>
      </div>

      {loading && <p className="loading">Loading portfolio…</p>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && posts.length === 0 && (
        <div className="empty-state platform-panel">
          <p>No published innovations yet. Be the first to submit through our Innovation Lab.</p>
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
