"use client";

import { memo, useEffect, useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { EDGE_KINDS, type EdgeKind } from "@/lib/fieldplay/types";
import { useBoardUi } from "./board-ui";
import type { RelationEdge as RelationEdgeType } from "./reducer";

const STROKE: Record<EdgeKind, string> = {
  supports: "#1f8a70",
  contradicts: "#e0a100",
  extends: "#7dbea8",
  causes: "#f3ead7",
};

function RelationEdgeView(props: EdgeProps<RelationEdgeType>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props;
  const { patchEdge, removeEdge } = useBoardUi();
  const kind = data?.kind ?? "supports";
  const weight = data?.weight ?? 1;
  const dropped = data?.dropped ?? false;
  const label = data?.label ?? "";
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const weightGesture = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [editing, label]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const shown = label.trim() || kind;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={24}
        style={{
          stroke: STROKE[kind],
          strokeWidth: 1.15 + weight * 1.7,
          strokeDasharray: dropped ? "6 5" : undefined,
          opacity: dropped ? 0.4 : 0.95,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`fp-edge-label nodrag nopan nokey${selected ? " is-open" : ""}`}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              className="nodrag nopan nokey"
              aria-label="Edge label"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                setEditing(false);
                if (draft !== label) patchEdge(id, { label: draft }, { history: true });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setDraft(label);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="fp-edge-name"
              aria-label={`${shown} edge, weight ${weight.toFixed(1)}. Double-click to relabel.`}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setDraft(label);
                setEditing(true);
              }}
            >
              {shown}
              <span> {weight.toFixed(1)}</span>
            </button>
          )}
          {selected ? (
            <div className="fp-edge-menu" role="group" aria-label="Edge type">
              {EDGE_KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === kind}
                  onClick={() => patchEdge(id, { kind: option }, { history: true })}
                >
                  {option}
                </button>
              ))}
              <label htmlFor={`${id}-weight`}>
                Weight
                <input
                  id={`${id}-weight`}
                  type="range"
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={weight}
                  aria-valuemin={0.1}
                  aria-valuemax={2}
                  aria-valuenow={weight}
                  aria-label="Edge weight"
                  onPointerDown={() => {
                    weightGesture.current = false;
                  }}
                  onChange={(event) => {
                    patchEdge(id, { weight: Number(event.target.value) }, { history: !weightGesture.current });
                    weightGesture.current = true;
                  }}
                />
              </label>
              <button
                type="button"
                aria-pressed={dropped}
                onClick={() => patchEdge(id, { dropped: !dropped }, { history: true })}
              >
                {dropped ? "Restore edge" : "Drop edge"}
              </button>
              <button type="button" onClick={() => removeEdge(id)}>
                Disconnect
              </button>
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const RelationEdge = memo(RelationEdgeView);
export default RelationEdge;
