const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SourceChunk {
  index: number;
  text: string;
  source_file: string;
  subject?: string;
  chunk_index?: number;
  score?: number;
  concepts?: string[];
  related_subjects?: string[];
  domains?: string[];
}

export interface AgentStep {
  agent: string;
  role: string;
  summary: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceChunk[];
  model: string;
  agents?: AgentStep[];
  interpreter_restatement?: string | null;
}

export interface NoveltyReport {
  novelty_score: number;
  is_duplicate: boolean;
  is_cross_disciplinary: boolean;
  disciplines: string[];
  similar_innovations: { post_id: string; title: string; similarity: number }[];
  rejection_reason: string | null;
  recommendation: string;
}

export interface Post {
  id: string;
  author_name: string;
  title: string;
  content_markdown: string;
  sources: Record<string, unknown>[];
  domain?: string;
  status?: string;
  novelty_score?: number;
  disciplines?: string[];
  innovation_summary?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
}

export async function queryRag(
  query: string,
  domain: string,
  subject?: string,
  proofMode?: boolean
): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      domain,
      subject: subject || null,
      proof_mode: proofMode || false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
}

export async function checkNovelty(data: {
  title: string;
  content_markdown: string;
  domain: string;
  sources: Record<string, unknown>[];
}): Promise<NoveltyReport> {
  const res = await fetch(`${API_URL}/api/posts/check-novelty`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Novelty check failed");
  return res.json();
}

export async function listPosts(limit = 20, offset = 0): Promise<Post[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/posts?limit=${limit}&offset=${offset}`);
  } catch {
    throw new Error(
      "Could not reach the API. Check your connection, or confirm NEXT_PUBLIC_API_URL points to Railway."
    );
  }
  if (res.status === 503) {
    throw new Error("Portfolio is temporarily unavailable. Please try again shortly.");
  }
  if (!res.ok) {
    throw new Error("Failed to load portfolio posts.");
  }
  return res.json();
}

export async function submitInnovation(data: {
  title: string;
  content_markdown: string;
  author_name: string;
  domain: string;
  sources: Record<string, unknown>[];
  innovation_summary?: string;
  terms_accepted: boolean;
  terms_version: string;
  publish_consent: boolean;
}): Promise<Post> {
  const res = await fetch(`${API_URL}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    if (detail && typeof detail === "object" && detail.rejection_reason) {
      throw new Error(detail.rejection_reason);
    }
    throw new Error(typeof detail === "string" ? detail : "Submission rejected");
  }
  return res.json();
}

export async function listPendingPosts(adminKey: string): Promise<Post[]> {
  const res = await fetch(`${API_URL}/api/admin/pending`, {
    headers: { "X-Admin-Key": adminKey },
  });
  if (!res.ok) throw new Error("Failed to load pending innovations");
  return res.json();
}

export async function approvePost(postId: string, adminKey: string, notes?: string): Promise<Post> {
  const res = await fetch(`${API_URL}/api/admin/posts/${postId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
    body: JSON.stringify({ review_notes: notes || null }),
  });
  if (!res.ok) throw new Error("Failed to approve");
  return res.json();
}

export async function rejectPost(postId: string, adminKey: string, notes?: string): Promise<Post> {
  const res = await fetch(`${API_URL}/api/admin/posts/${postId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
    body: JSON.stringify({ review_notes: notes || null }),
  });
  if (!res.ok) throw new Error("Failed to reject");
  return res.json();
}
