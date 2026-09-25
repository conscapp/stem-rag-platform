import { normalizeWork } from "@/lib/fieldplay/openalex";

export const dynamic = "force-dynamic";

const SELECT = [
  "id",
  "display_name",
  "authorships",
  "publication_year",
  "cited_by_count",
  "abstract_inverted_index",
  "topics",
  "concepts",
  "referenced_works",
  "doi",
  "primary_location",
].join(",");

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ results: [] });
  if (query.length > 240) {
    return Response.json({ error: "Search is limited to 240 characters.", results: [] }, { status: 400 });
  }

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", "12");
  url.searchParams.set("select", SELECT);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Fieldplay (research sandbox)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 429) {
      return Response.json(
        { error: "OpenAlex rate limit reached. Wait a moment and search again.", results: [] },
        { status: 429 },
      );
    }
    if (!response.ok) {
      return Response.json({ error: "OpenAlex didn't answer. Try again.", results: [] }, { status: 502 });
    }
    const body = (await response.json()) as { results?: unknown };
    const results = Array.isArray(body.results)
      ? body.results.map((item) => normalizeWork(item)).filter((item) => item !== null)
      : [];
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Could not reach OpenAlex.", results: [] }, { status: 502 });
  }
}
