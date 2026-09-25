"use client";

import { useEffect, useState } from "react";
import type { OpenAlexWork } from "@/lib/fieldplay/openalex";
import type { CardKind } from "@/lib/fieldplay/types";

interface SearchRailProps {
  presentIds: Set<string>;
  onAddWork: (work: OpenAlexWork) => void;
  onAddCustom: (kind: Exclude<CardKind, "paper">) => void;
}

export default function SearchRail({ presentIds, onAddWork, onAddCustom }: SearchRailProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenAlexWork[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus("idle");
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      setError("");
      try {
        const params = new URLSearchParams({ q: trimmed });
        const response = await fetch(`/api/openalex?${params.toString()}`, { signal: controller.signal });
        const body = (await response.json()) as { results?: OpenAlexWork[]; error?: string };
        if (!response.ok) {
          setResults([]);
          setStatus("error");
          setError(body.error || "OpenAlex didn't answer. Try again.");
          return;
        }
        const next = Array.isArray(body.results) ? body.results : [];
        setResults(next);
        setStatus(next.length === 0 ? "empty" : "ready");
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setResults([]);
        setStatus("error");
        setError("Could not reach OpenAlex.");
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <aside className="fp-rail" aria-label="Search OpenAlex">
      <div className="fp-search-block">
        <p className="fp-mark">Fieldplay</p>
        <h1>The table</h1>
        <p className="fp-lede">Search the literature, then play the outcome.</p>
        <label className="fp-search-label" htmlFor="fp-search">
          Search OpenAlex
        </label>
        <input
          id="fp-search"
          className="fp-search"
          type="search"
          value={query}
          placeholder="stellarator, nanotube, claim…"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="fp-results" aria-live="polite">
        {status === "loading" ? <p className="fp-status">Searching OpenAlex…</p> : null}
        {status === "empty" ? <p className="fp-status">No papers matched that search.</p> : null}
        {status === "error" ? <p className="fp-status is-error">{error}</p> : null}
        {status === "idle" ? <p className="fp-status">Titles, authors, or a claim. Twelve works at a time.</p> : null}
        <ul>
          {results.map((work) => {
            const onBoard = presentIds.has(work.id);
            return (
              <li key={work.id}>
                <p className="fp-result-title">{work.title}</p>
                <p className="fp-result-meta">
                  {work.year ?? "n.d."} · {work.citedByCount.toLocaleString()} cited · {work.firstAuthor}
                </p>
                <button
                  type="button"
                  disabled={onBoard}
                  aria-label={onBoard ? `${work.title} is on the board` : `Add ${work.title} to the board`}
                  onClick={() => onAddWork(work)}
                >
                  {onBoard ? "On board" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="fp-custom">
        <button type="button" onClick={() => onAddCustom("hypothesis")}>
          Add hypothesis
        </button>
        <button type="button" onClick={() => onAddCustom("claim")}>
          Add claim
        </button>
        <button type="button" onClick={() => onAddCustom("note")}>
          Add note
        </button>
      </div>
      <p className="fp-credit">
        Works from{" "}
        <a href="https://openalex.org" target="_blank" rel="noreferrer">
          OpenAlex
        </a>
        , CC0.
      </p>
    </aside>
  );
}
