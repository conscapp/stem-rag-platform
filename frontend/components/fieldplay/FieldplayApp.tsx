"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { evaluateBoard } from "@/lib/fieldplay/outcome";
import { customCardTitle, supportsFromCitations, type OpenAlexWork } from "@/lib/fieldplay/openalex";
import { loadBoardFile, upsertBoard, writeBoardFile, type BoardRecord } from "@/lib/fieldplay/storage";
import type { CardKind, Mode, Scores } from "@/lib/fieldplay/types";
import { BoardUiProvider, type BoardUi } from "./board-ui";
import Hud from "./Hud";
import PaperNode, { blankCard } from "./PaperNode";
import RelationEdge from "./RelationEdge";
import RulesDrawer from "./RulesDrawer";
import {
  boardFromRecord,
  boardReducer,
  createEmptyBoard,
  type BoardState,
  type PaperNode as PaperNodeModel,
  type RelationEdge as RelationEdgeModel,
} from "./reducer";
import SearchRail from "./SearchRail";

const nodeTypes = { paper: PaperNode };
const edgeTypes = { relation: RelationEdge };

function readInitialBoard(): BoardState {
  const file = loadBoardFile();
  if (!file) return createEmptyBoard();
  const active = file.boards.find((board) => board.id === file.activeId) ?? file.boards[0];
  return boardFromRecord(active);
}

function toRecord(state: BoardState): BoardRecord {
  return {
    id: state.boardId,
    name: state.name.trim() || "Untitled board",
    updatedAt: new Date().toISOString(),
    question: state.question,
    mode: state.mode,
    dials: state.dials,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data: node.data,
    })),
    edges: state.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: edge.data ?? { kind: "supports", weight: 1, dropped: false, label: "" },
    })),
  };
}

function FieldplayInner() {
  const [state, dispatch] = useReducer(boardReducer, undefined, readInitialBoard);
  const [library, setLibrary] = useState<BoardRecord[]>(() => loadBoardFile()?.boards ?? []);
  const [notice, setNotice] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const rf = useReactFlow();
  const reduceMotion = useRef(false);
  const dragging = useRef(false);
  const edgesRef = useRef(state.edges);
  edgesRef.current = state.edges;

  const contentKey = [
    state.mode,
    state.dials.confidence,
    state.dials.consensus,
    state.dials.novelty,
    state.dials.impact,
    state.nodes
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
    state.edges
      .map((edge) =>
        [edge.id, edge.source, edge.target, edge.data?.kind, edge.data?.weight, edge.data?.dropped ? 1 : 0].join("~"),
      )
      .join(";"),
  ].join("§");

  const outcome = useMemo(
    () =>
      evaluateBoard({
        nodes: state.nodes.map((node) => ({
          id: node.id,
          title: node.data.title,
          year: node.data.year,
          citedByCount: node.data.citedByCount,
          influence: node.data.influence,
          muted: node.data.muted,
          solo: node.data.solo,
          topics: node.data.topics,
        })),
        edges: state.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind: edge.data?.kind ?? "supports",
          weight: edge.data?.weight ?? 1,
          dropped: edge.data?.dropped ?? false,
        })),
        mode: state.mode,
        dials: state.dials,
      }),
    // contentKey already covers the fields the engine reads. Position changes must not recompute it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentKey],
  );

  const persist = useCallback((current: BoardState, activeId = current.boardId) => {
    const file = upsertBoard(loadBoardFile(), toRecord(current));
    file.activeId = activeId;
    const ok = writeBoardFile(file);
    setLibrary(file.boards);
    return ok;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!persist(state)) setNotice("Could not save this board in the browser.");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [persist, state]);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const footer = document.querySelector("footer.site-footer");
    if (footer instanceof HTMLElement) footer.hidden = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (footer instanceof HTMLElement) footer.hidden = false;
      document.body.style.overflow = previous;
    };
  }, []);

  const nodeCount = useRef(0);
  nodeCount.current = state.nodes.length;
  useEffect(() => {
    if (nodeCount.current === 0) return;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        rf.fitView({ padding: 0.22, duration: reduceMotion.current ? 0 : 180 });
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      if (inner) window.cancelAnimationFrame(inner);
    };
  }, [rf, state.boardId]);

  const actions = useRef({ save: () => {}, undo: () => {}, redo: () => {}, remove: () => {} });
  actions.current = {
    save: () => setNotice(persist(state) ? "Saved" : "Could not save this board in the browser."),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    remove: () => dispatch({ type: "delete-selected" }),
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = !!target?.closest("input, textarea, select, [contenteditable='true']");
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        actions.current.save();
        return;
      }
      if (typing) return;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.current.redo();
        else actions.current.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        actions.current.redo();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        actions.current.remove();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nextPosition = useCallback(
    (count: number) => {
      const pane = document.querySelector(".fp-canvas");
      const rect = pane?.getBoundingClientRect();
      const origin = rf.screenToFlowPosition({
        x: (rect?.left ?? 0) + 36,
        y: (rect?.top ?? 0) + 28,
      });
      const col = count % 2;
      const row = Math.floor(count / 2);
      return {
        x: origin.x + col * 300,
        y: origin.y + row * 360,
      };
    },
    [rf],
  );

  const addWork = useCallback(
    (work: OpenAlexWork) => {
      if (state.nodes.some((node) => node.id === work.id || node.data.openAlexId === work.id)) return;
      const node: PaperNodeModel = {
        id: work.id,
        type: "paper",
        position: nextPosition(state.nodes.length),
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
        state.nodes.map((item) => ({
          id: item.id,
          openAlexId: item.data.openAlexId,
          referencedWorks: item.data.referencedWorks,
        })),
        state.edges.map((edge) => ({ source: edge.source, target: edge.target })),
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
      window.setTimeout(() => {
        rf.fitView({ padding: 0.2, duration: reduceMotion.current ? 0 : 160, maxZoom: 1 });
      }, 40);
    },
    [nextPosition, rf, state.edges, state.nodes],
  );

  const addCustom = useCallback(
    (kind: Exclude<CardKind, "paper">) => {
      dispatch({
        type: "add-cards",
        nodes: [
          {
            id: `c-${crypto.randomUUID()}`,
            type: "paper",
            position: nextPosition(state.nodes.length),
            selected: true,
            data: blankCard(kind, customCardTitle(kind)),
          },
        ],
        edges: [],
      });
      setNotice(`Added ${kind}`);
      window.setTimeout(() => {
        rf.fitView({ padding: 0.2, duration: reduceMotion.current ? 0 : 160, maxZoom: 1 });
      }, 40);
    },
    [nextPosition, rf, state.nodes.length],
  );

  const onConnect = useCallback((connection: Connection) => {
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
  }, []);

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
  }, []);
  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  const ui = useMemo<BoardUi>(
    () => ({
      mode: state.mode,
      tension: outcome.tension,
      scoringIds: outcome.scoringIds,
      patchNode: (id, patch, opts) => dispatch({ type: "patch-node", id, patch, history: opts?.history ?? true }),
      patchEdge: (id, patch, opts) => dispatch({ type: "patch-edge", id, patch, history: opts?.history ?? true }),
      removeEdge: (id) => dispatch({ type: "remove-edge", id }),
    }),
    [outcome, state.mode],
  );

  const nodeColor = useCallback(
    (node: Node) => {
      if (state.mode !== "direct") return "#f3ead7";
      const stance = outcome.tension.get(node.id) ?? "neutral";
      if (stance === "agree") return "#1f8a70";
      if (stance === "fight") return "#e0a100";
      return "#5c6562";
    },
    [outcome, state.mode],
  );

  const presentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of state.nodes) {
      if (node.data.openAlexId) ids.add(node.data.openAlexId);
    }
    return ids;
  }, [state.nodes]);

  const boards = library.some((board) => board.id === state.boardId) ? library : [toRecord(state), ...library];

  return (
    <BoardUiProvider value={ui}>
      <div className="fp-shell">
        <SearchRail presentIds={presentIds} onAddWork={addWork} onAddCustom={addCustom} />
        <div className="fp-canvas">
          <ReactFlow
            nodes={state.nodes}
            edges={state.edges}
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
            selectionKeyCode="Shift"
            multiSelectionKeyCode={["Meta", "Control"]}
            zoomOnDoubleClick={false}
            panOnScroll
            minZoom={0.35}
            maxZoom={1.6}
            colorMode="dark"
            onNodeDragStart={beginDrag}
            onNodeDragStop={endDrag}
            onSelectionDragStart={beginDrag}
            onSelectionDragStop={endDrag}
            proOptions={{ hideAttribution: false }}
          >
            <Background id="fieldplay-grid" variant={BackgroundVariant.Lines} gap={28} color="rgba(243,234,215,0.055)" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable bgColor="#141816" maskColor="rgba(14,17,16,0.72)" nodeColor={nodeColor} />
            {state.nodes.length === 0 ? (
              <div className="fp-empty">
                <p>Search a paper, drop it on the board, connect it, and play the outcome.</p>
              </div>
            ) : null}
          </ReactFlow>
        </div>
        <Hud
          question={state.question}
          mode={state.mode}
          shown={outcome.shown}
          simulated={outcome.simulated}
          baseline={outcome.baseline}
          sentence={outcome.sentence}
          whatIf={outcome.whatIf}
          name={state.name}
          boardId={state.boardId}
          boards={boards}
          notice={notice}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          onQuestion={(question, history) => dispatch({ type: "set-question", question, history })}
          onName={(name, history) => dispatch({ type: "set-name", name, history })}
          onMode={(mode) => dispatch({ type: "set-mode", mode, seed: outcome.simulated })}
          onDial={(key: keyof Scores, value, history) => dispatch({ type: "set-dial", key, value, history })}
          onSave={() => actions.current.save()}
          onLoad={(id) => {
            const file = upsertBoard(loadBoardFile(), toRecord(state));
            const record = file.boards.find((board) => board.id === id);
            if (!record) return;
            file.activeId = id;
            writeBoardFile(file);
            setLibrary(file.boards);
            dispatch({ type: "load", state: boardFromRecord(record) });
            setNotice(`Loaded ${record.name}`);
          }}
          onNew={() => {
            const fresh = createEmptyBoard();
            const file = upsertBoard(upsertBoard(loadBoardFile(), toRecord(state)), toRecord(fresh));
            writeBoardFile(file);
            setLibrary(file.boards);
            dispatch({ type: "load", state: fresh });
            setNotice("New board");
          }}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          onRules={() => setRulesOpen(true)}
        />
      </div>
      <RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </BoardUiProvider>
  );
}

export default function FieldplayApp() {
  return (
    <div className="fieldplay-root">
      <ReactFlowProvider>
        <FieldplayInner />
      </ReactFlowProvider>
    </div>
  );
}
