"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { evaluateBoard } from "@/lib/fieldplay/outcome";
import { supportsFromCitations, type OpenAlexWork } from "@/lib/fieldplay/openalex";
import type { Scores } from "@/lib/fieldplay/types";
import { BoardUiProvider, type BoardUi } from "./board-ui";
import PaperNode from "./PaperNode";
import RelationEdge from "./RelationEdge";
import type { BoardAction, BoardState, PaperNode as PaperNodeModel, RelationEdge as RelationEdgeModel } from "./reducer";

const nodeTypes = { paper: PaperNode };
const edgeTypes = { relation: RelationEdge };

const DIALS: { key: keyof Scores; label: string }[] = [
  { key: "confidence", label: "Confidence" },
  { key: "consensus", label: "Consensus" },
  { key: "novelty", label: "Novelty" },
  { key: "impact", label: "Impact" },
];

interface ExperimentSlotProps {
  slot: BoardState;
  onAction: (id: string, action: BoardAction) => void;
  onReset: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function nextPosition(count: number) {
  const col = count % 2;
  const row = Math.floor(count / 2);
  return { x: 40 + col * 300, y: 40 + row * 360 };
}

function SlotSearch({ onAdd }: { onAdd: (work: OpenAlexWork) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenAlexWork[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ q: trimmed });
        const response = await fetch(`/api/openalex?${params.toString()}`, { signal: controller.signal });
        const body = (await response.json()) as { results?: OpenAlexWork[] };
        if (!response.ok) {
          setResults([]);
          setStatus("error");
          return;
        }
        const next = Array.isArray(body.results) ? body.results : [];
        setResults(next);
        setStatus(next.length === 0 ? "empty" : "ready");
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setResults([]);
        setStatus("error");
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <details className="fp-slot-search">
      <summary>Search OpenAlex</summary>
      <label className="fp-search-label">
        Optional search
        <input
          className="fp-search"
          value={query}
          placeholder="Does not block the fixture"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {status === "loading" ? <p className="fp-hint">Searching…</p> : null}
      {status === "empty" ? <p className="fp-hint">No matches.</p> : null}
      {status === "error" ? <p className="fp-hint">Search failed. The fixture stays put.</p> : null}
      {results.length > 0 ? (
        <ul className="fp-results">
          {results.map((work) => (
            <li key={work.id}>
              <p className="fp-result-title">{work.title}</p>
              <button type="button" onClick={() => onAdd(work)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

function SlotInner({ slot, onAction, onReset, onDuplicate }: ExperimentSlotProps) {
  const rf = useReactFlow();
  const rootRef = useRef<HTMLElement>(null);
  const edgesRef = useRef(slot.edges);
  const dragging = useRef(false);
  const questionGesture = useRef(false);
  const dialGesture = useRef(false);
  edgesRef.current = slot.edges;
  const dispatch = useCallback((action: BoardAction) => onAction(slot.boardId, action), [onAction, slot.boardId]);

  const contentKey = [
    slot.mode,
    slot.dials.confidence,
    slot.dials.consensus,
    slot.dials.novelty,
    slot.dials.impact,
    slot.nodes
      .map((node) =>
        [
          node.id,
          node.data.title,
          node.data.year ?? "",
          node.data.citedByCount,
          node.data.influence,
          node.data.muted ? 1 : 0,
          node.data.solo ? 1 : 0,
          node.data.topics.join("|"),
        ].join("~"),
      )
      .join(";"),
    slot.edges
      .map((edge) =>
        [edge.id, edge.source, edge.target, edge.data?.kind, edge.data?.weight, edge.data?.dropped ? 1 : 0].join("~"),
      )
      .join(";"),
  ].join("§");

  const outcome = useMemo(
    () =>
      evaluateBoard({
        nodes: slot.nodes.map((node) => ({
          id: node.id,
          title: node.data.title,
          year: node.data.year,
          citedByCount: node.data.citedByCount,
          influence: node.data.influence,
          muted: node.data.muted,
          solo: node.data.solo,
          topics: node.data.topics,
        })),
        edges: slot.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind: edge.data?.kind ?? "supports",
          weight: edge.data?.weight ?? 1,
          dropped: edge.data?.dropped ?? false,
        })),
        mode: slot.mode,
        dials: slot.dials,
      }),
    // contentKey covers every field the engine reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentKey],
  );

  const shape = slot.nodes.map((node) => node.id).join("|");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      rf.fitView({ padding: 0.2, duration: 0, maxZoom: 1 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [rf, shape, slot.boardId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = rootRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node) || !root.contains(target)) return;
      const typing =
        target instanceof HTMLElement && !!target.closest("input, textarea, select, [contenteditable='true']");
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        return;
      }
      if (typing) return;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "delete-selected" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      dispatch({
        type: "connect",
        edge: {
          id: `e-${crypto.randomUUID()}`,
          type: "relation",
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          data: { kind: "supports", weight: 1, dropped: false, label: "" },
        },
      });
    },
    [dispatch],
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    return !edgesRef.current.some(
      (edge) =>
        (edge.source === connection.source && edge.target === connection.target) ||
        (edge.source === connection.target && edge.target === connection.source),
    );
  }, []);

  const beginDrag = useCallback(() => {
    if (dragging.current) return;
    dragging.current = true;
    dispatch({ type: "checkpoint" });
  }, [dispatch]);

  const addWork = useCallback(
    (work: OpenAlexWork) => {
      if (slot.nodes.some((node) => node.id === work.id || node.data.openAlexId === work.id)) return;
      const node: PaperNodeModel = {
        id: work.id,
        type: "paper",
        position: nextPosition(slot.nodes.length),
        selected: true,
        data: {
          kind: "paper",
          title: work.title,
          year: work.year,
          citedByCount: work.citedByCount,
          influence: 50,
          muted: false,
          solo: false,
          topics: work.topics,
          abstract: work.abstract,
          firstAuthor: work.firstAuthor,
          openAlexId: work.id,
          referencedWorks: work.referencedWorks,
          doi: work.doi,
          url: work.url,
          venue: work.venue,
        },
      };
      const links = supportsFromCitations(
        { id: node.id, openAlexId: work.id, referencedWorks: work.referencedWorks },
        slot.nodes.map((item) => ({
          id: item.id,
          openAlexId: item.data.openAlexId,
          referencedWorks: item.data.referencedWorks,
        })),
        slot.edges.map((edge) => ({ source: edge.source, target: edge.target })),
      );
      const edges: RelationEdgeModel[] = links.map((link) => ({
        id: `e-${crypto.randomUUID()}`,
        type: "relation",
        source: link.source,
        target: link.target,
        sourceHandle: "r",
        targetHandle: "l",
        data: { kind: "supports", weight: 1, dropped: false, label: "" },
      }));
      dispatch({ type: "add-cards", nodes: [node], edges });
    },
    [dispatch, slot.edges, slot.nodes],
  );

  const ui = useMemo<BoardUi>(
    () => ({
      mode: slot.mode,
      tension: outcome.tension,
      scoringIds: outcome.scoringIds,
      patchNode: (id, patch, opts) => dispatch({ type: "patch-node", id, patch, history: opts?.history ?? true }),
      patchEdge: (id, patch, opts) => dispatch({ type: "patch-edge", id, patch, history: opts?.history ?? true }),
      removeEdge: (id) => dispatch({ type: "remove-edge", id }),
    }),
    [dispatch, outcome, slot.mode],
  );

  return (
    <section ref={rootRef} className="fp-slot" aria-label={slot.name} data-experiment={slot.name}>
      <header className="fp-slot-bar">
        <h2>{slot.name}</h2>
        <div className="fp-slot-actions">
          <button type="button" onClick={() => onReset(slot.boardId)}>
            Reset
          </button>
          <button type="button" onClick={() => onDuplicate(slot.boardId)}>
            Duplicate
          </button>
          <button type="button" onClick={() => dispatch({ type: "undo" })} disabled={slot.past.length === 0}>
            Undo
          </button>
          <button type="button" onClick={() => dispatch({ type: "redo" })} disabled={slot.future.length === 0}>
            Redo
          </button>
        </div>
      </header>
      <BoardUiProvider value={ui}>
        <div className="fp-slot-canvas fp-canvas">
          <ReactFlow
            nodes={slot.nodes}
            edges={slot.edges}
            onNodesChange={(changes) => dispatch({ type: "nodes", changes })}
            onEdgesChange={(changes) => dispatch({ type: "edges", changes })}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            connectionLineStyle={{ stroke: "#1f8a70", strokeWidth: 2 }}
            connectionRadius={48}
            deleteKeyCode={null}
            zoomOnDoubleClick={false}
            panOnScroll
            minZoom={0.35}
            maxZoom={1.6}
            colorMode="dark"
            onNodeDragStart={beginDrag}
            onNodeDragStop={() => {
              dragging.current = false;
            }}
            proOptions={{ hideAttribution: true }}
            fitView
          >
            <Background
              id={`exp-grid-${slot.boardId}`}
              variant={BackgroundVariant.Lines}
              gap={28}
              color="rgba(243,234,215,0.055)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </BoardUiProvider>
      <div className="fp-slot-controls">
        <label className="fp-question" htmlFor={`exp-q-${slot.boardId}`}>
          Research question
          <textarea
            id={`exp-q-${slot.boardId}`}
            rows={2}
            maxLength={400}
            value={slot.question}
            onFocus={() => {
              questionGesture.current = false;
            }}
            onChange={(event) => {
              dispatch({ type: "set-question", question: event.target.value, history: !questionGesture.current });
              questionGesture.current = true;
            }}
          />
        </label>
        <div className="fp-mode" role="group" aria-label={`${slot.name} outcome control`}>
          <button
            type="button"
            aria-pressed={slot.mode === "simulate"}
            onClick={() => dispatch({ type: "set-mode", mode: "simulate", seed: outcome.simulated })}
          >
            Simulate
          </button>
          <button
            type="button"
            aria-pressed={slot.mode === "direct"}
            onClick={() => dispatch({ type: "set-mode", mode: "direct", seed: outcome.simulated })}
          >
            Direct
          </button>
        </div>
        <div className="fp-dials">
          {DIALS.map((dial) => {
            const value = Math.round(outcome.shown[dial.key]);
            const editable = slot.mode === "direct";
            const inputId = `exp-dial-${slot.boardId}-${dial.key}`;
            return (
              <div key={dial.key} className="fp-dial">
                <div className="fp-dial-top">
                  <label htmlFor={inputId}>{dial.label}</label>
                  <output htmlFor={inputId}>{value}</output>
                </div>
                <div className="fp-dial-controls">
                  <button
                    type="button"
                    aria-label={`Decrease ${dial.label}`}
                    disabled={!editable}
                    onClick={() => dispatch({ type: "set-dial", key: dial.key, value: value - 5, history: true })}
                  >
                    −
                  </button>
                  <input
                    id={inputId}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    disabled={!editable}
                    onPointerDown={() => {
                      dialGesture.current = false;
                    }}
                    onChange={(event) => {
                      if (!editable) return;
                      dispatch({
                        type: "set-dial",
                        key: dial.key,
                        value: Number(event.target.value),
                        history: !dialGesture.current,
                      });
                      dialGesture.current = true;
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${dial.label}`}
                    disabled={!editable}
                    onClick={() => dispatch({ type: "set-dial", key: dial.key, value: value + 5, history: true })}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="fp-sentence">{outcome.sentence}</p>
        <SlotSearch onAdd={addWork} />
      </div>
    </section>
  );
}

function ExperimentSlot(props: ExperimentSlotProps) {
  return (
    <ReactFlowProvider>
      <SlotInner {...props} />
    </ReactFlowProvider>
  );
}

export default memo(ExperimentSlot);
