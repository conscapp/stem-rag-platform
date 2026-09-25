"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { paperPower } from "@/lib/fieldplay/outcome";
import type { CardData } from "@/lib/fieldplay/types";
import { useBoardUi } from "./board-ui";
import type { PaperNode as PaperNodeType } from "./reducer";

function yearLabel(year: number | null): string {
  return year == null ? "Year unknown" : String(year);
}

function PaperNodeView({ id, data, selected }: NodeProps<PaperNodeType>) {
  const { mode, tension, scoringIds, patchNode } = useBoardUi();
  const scoring = scoringIds.has(id);
  const stance = scoring ? (tension.get(id) ?? "neutral") : "neutral";
  const custom = data.kind !== "paper";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.title);
  const [tags, setTags] = useState(data.topics.join(", "));
  const influenceGesture = useRef(false);
  const metaGesture = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTags(data.topics.join(", "));
  }, [data.topics]);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  const power = paperPower(data);
  const kicker =
    data.kind === "paper"
      ? data.firstAuthor || "OpenAlex work"
      : data.kind === "hypothesis"
        ? "Hypothesis"
        : data.kind === "claim"
          ? "Claim"
          : "Note";

  const commitTitle = () => {
    const title = draft.trim() || data.title;
    setDraft(title);
    setEditing(false);
    if (title !== data.title) patchNode(id, { title }, { history: true });
  };

  return (
    <article
      className={[
        "fp-card",
        selected ? "is-selected" : "",
        data.muted ? "is-muted" : "",
        !scoring && !data.muted ? "is-benched" : "",
        mode === "direct" && scoring ? `is-${stance}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={data.title}
    >
      <Handle id="l" type="source" position={Position.Left} className="fp-handle" aria-label="Connect from the left" />
      <Handle id="r" type="source" position={Position.Right} className="fp-handle" aria-label="Connect from the right" />

      <p className="fp-kicker">{kicker}</p>
      {editing ? (
        <input
          ref={titleRef}
          className="fp-title-input nodrag nopan nokey"
          value={draft}
          aria-label="Card title"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(data.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <h2
          className="fp-card-title"
          onDoubleClick={(event) => {
            event.stopPropagation();
            setDraft(data.title);
            setEditing(true);
          }}
        >
          {data.title}
        </h2>
      )}
      <p className="fp-meta">
        {custom ? (
          <>
            <label className="fp-inline" htmlFor={`${id}-year`}>
              Year
              <input
                id={`${id}-year`}
                className="nodrag nopan nowheel nokey"
                type="number"
                inputMode="numeric"
                value={data.year ?? ""}
                onFocus={() => {
                  metaGesture.current = false;
                }}
                onChange={(event) => {
                  const raw = event.target.value;
                  const year = raw === "" ? null : Number(raw);
                  patchNode(
                    id,
                    { year: year != null && Number.isFinite(year) ? Math.round(year) : null },
                    { history: !metaGesture.current },
                  );
                  metaGesture.current = true;
                }}
              />
            </label>
            <label className="fp-inline" htmlFor={`${id}-cited`}>
              Citations
              <input
                id={`${id}-cited`}
                className="nodrag nopan nowheel nokey"
                type="number"
                min={0}
                inputMode="numeric"
                value={data.citedByCount}
                onFocus={() => {
                  metaGesture.current = false;
                }}
                onChange={(event) => {
                  const cited = Number(event.target.value);
                  patchNode(
                    id,
                    { citedByCount: Number.isFinite(cited) ? Math.max(0, cited) : 0 },
                    { history: !metaGesture.current },
                  );
                  metaGesture.current = true;
                }}
              />
            </label>
          </>
        ) : (
          <>
            {yearLabel(data.year)} · {data.citedByCount.toLocaleString()} cited
            {data.venue ? ` · ${data.venue}` : ""}
          </>
        )}
      </p>
      <div className="fp-rule" />

      {data.muted ? <p className="fp-stamp">Muted</p> : null}
      {!data.muted && !scoring ? <p className="fp-stamp">Benched</p> : null}
      {scoring && mode === "direct" ? (
        <p className={`fp-stamp is-${stance}`}>{stance === "agree" ? "Agrees" : stance === "fight" ? "Fights" : "Neutral"}</p>
      ) : null}

      <label className="fp-influence" htmlFor={`${id}-influence`}>
        <span>Influence</span>
        <output htmlFor={`${id}-influence`}>{data.influence}</output>
      </label>
      <input
        id={`${id}-influence`}
        className="nodrag nopan nowheel nokey"
        type="range"
        min={0}
        max={100}
        step={1}
        value={data.influence}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={data.influence}
        onPointerDown={() => {
          influenceGesture.current = false;
        }}
        onChange={(event) => {
          patchNode(id, { influence: Number(event.target.value) }, { history: !influenceGesture.current });
          influenceGesture.current = true;
        }}
      />
      <p className="fp-power">
        Power {power.toFixed(1)}
        {scoring ? "" : " · out of the sum"}
      </p>
      {power === 0 ? <p className="fp-hint">No citation weight yet, so this card cannot move the scores.</p> : null}

      {custom ? (
        <label className="fp-tags" htmlFor={`${id}-tags`}>
          Tags
          <input
            id={`${id}-tags`}
            className="nodrag nopan nokey"
            type="text"
            value={tags}
            placeholder="topics, comma separated"
            onChange={(event) => setTags(event.target.value)}
            onBlur={() => {
              const topics = tags
                .split(",")
                .map((topic) => topic.trim())
                .filter(Boolean)
                .slice(0, 24);
              if (topics.join("\u0001") !== data.topics.join("\u0001")) {
                patchNode(id, { topics }, { history: true });
              }
            }}
          />
        </label>
      ) : null}

      <div className="fp-card-actions">
        <button
          type="button"
          className="nodrag nopan nokey"
          aria-pressed={data.muted}
          onClick={() => patchNode(id, { muted: !data.muted, solo: data.muted ? data.solo : false }, { history: true })}
        >
          {data.muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          className="nodrag nopan nokey"
          aria-pressed={data.solo}
          onClick={() => patchNode(id, { solo: !data.solo, muted: data.solo ? data.muted : false }, { history: true })}
        >
          {data.solo ? "Unsolo" : "Solo"}
        </button>
      </div>

      {data.kind === "paper" ? (
        <details className="fp-abstract nodrag nopan">
          <summary>Abstract</summary>
          <p>{data.abstract.trim() ? data.abstract : "No abstract"}</p>
        </details>
      ) : null}
      {data.url ? (
        <a className="fp-source nodrag nopan" href={data.url} target="_blank" rel="noreferrer">
          Source
        </a>
      ) : null}
    </article>
  );
}

const PaperNode = memo(PaperNodeView);
export default PaperNode;

export function blankCard(kind: CardData["kind"], title: string): CardData {
  return {
    kind,
    title,
    year: null,
    citedByCount: 0,
    influence: 50,
    muted: false,
    solo: false,
    topics: [],
    abstract: "",
    firstAuthor: "",
    openAlexId: null,
    referencedWorks: [],
    doi: null,
    url: null,
    venue: null,
  };
}
