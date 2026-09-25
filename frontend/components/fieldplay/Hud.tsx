"use client";

import { useRef } from "react";
import type { Mode, Scores } from "@/lib/fieldplay/types";
import type { BoardRecord } from "@/lib/fieldplay/storage";

const DIALS: { key: keyof Scores; label: string }[] = [
  { key: "confidence", label: "Confidence" },
  { key: "consensus", label: "Consensus" },
  { key: "novelty", label: "Novelty" },
  { key: "impact", label: "Impact" },
];

interface HudProps {
  question: string;
  mode: Mode;
  shown: Scores;
  simulated: Scores;
  baseline: Scores;
  sentence: string;
  whatIf: boolean;
  name: string;
  boardId: string;
  boards: BoardRecord[];
  notice: string;
  canUndo: boolean;
  canRedo: boolean;
  onQuestion: (value: string, history: boolean) => void;
  onName: (value: string, history: boolean) => void;
  onMode: (mode: Mode) => void;
  onDial: (key: keyof Scores, value: number, history: boolean) => void;
  onSave: () => void;
  onLoad: (id: string) => void;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRules: () => void;
}

function signed(next: number, prev: number): string | null {
  const delta = Math.round(next) - Math.round(prev);
  if (delta === 0) return null;
  return `${delta > 0 ? "+" : ""}${delta}`;
}

export default function Hud(props: HudProps) {
  const questionGesture = useRef(false);
  const nameGesture = useRef(false);
  const dialGesture = useRef(false);
  const hint = whatIfHint(props);

  return (
    <aside className="fp-hud" aria-label="Outcome controls">
      <label className="fp-question" htmlFor="fp-question">
        Research question
        <textarea
          id="fp-question"
          rows={3}
          maxLength={400}
          value={props.question}
          placeholder="What are you trying to make true?"
          onFocus={() => {
            questionGesture.current = false;
          }}
          onChange={(event) => {
            props.onQuestion(event.target.value, !questionGesture.current);
            questionGesture.current = true;
          }}
        />
      </label>

      <div className="fp-mode" role="group" aria-label="Outcome control">
        <button type="button" aria-pressed={props.mode === "simulate"} onClick={() => props.onMode("simulate")}>
          Simulate
        </button>
        <button type="button" aria-pressed={props.mode === "direct"} onClick={() => props.onMode("direct")}>
          Direct
        </button>
      </div>
      <p className="fp-mode-note">
        {props.mode === "simulate"
          ? "The board is dealing the four scores."
          : "You are forcing the outcome. The cards show who agrees."}
      </p>

      <div className="fp-dials">
        {DIALS.map((dial) => {
          const value = Math.round(props.shown[dial.key]);
          const editable = props.mode === "direct";
          return (
            <div key={dial.key} className="fp-dial">
              <div className="fp-dial-top">
                <label htmlFor={`fp-dial-${dial.key}`}>{dial.label}</label>
                <output htmlFor={`fp-dial-${dial.key}`}>{value}</output>
              </div>
              <input
                id={`fp-dial-${dial.key}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                disabled={!editable}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={value}
                aria-valuetext={editable ? String(value) : `${value}, simulated from the board`}
                onPointerDown={() => {
                  dialGesture.current = false;
                }}
                onChange={(event) => {
                  if (!editable) return;
                  props.onDial(dial.key, Number(event.target.value), !dialGesture.current);
                  dialGesture.current = true;
                }}
              />
              {props.mode === "direct" ? (
                <span className="fp-dial-mark">Board would say {Math.round(props.simulated[dial.key])}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="fp-sentence" role="status" aria-live="polite">
        {props.sentence}
      </p>
      <p className="fp-whatif">{hint}</p>

      <div className="fp-save">
        <label htmlFor="fp-board-name">
          Board name
          <input
            id="fp-board-name"
            type="text"
            maxLength={80}
            value={props.name}
            onFocus={() => {
              nameGesture.current = false;
            }}
            onChange={(event) => {
              props.onName(event.target.value, !nameGesture.current);
              nameGesture.current = true;
            }}
          />
        </label>
        <div className="fp-save-row">
          <button type="button" onClick={props.onSave}>
            Save
          </button>
          <button type="button" onClick={props.onNew}>
            New board
          </button>
          <button type="button" onClick={props.onUndo} disabled={!props.canUndo}>
            Undo
          </button>
          <button type="button" onClick={props.onRedo} disabled={!props.canRedo}>
            Redo
          </button>
        </div>
        <label htmlFor="fp-load">
          Load board
          <select
            id="fp-load"
            value={props.boardId}
            onChange={(event) => {
              if (event.target.value !== props.boardId) props.onLoad(event.target.value);
            }}
          >
            {props.boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        <p className="fp-notice" role="status">
          {props.notice}
        </p>
      </div>

      <button type="button" className="fp-rules-open" onClick={props.onRules}>
        Rules
      </button>
      <p className="fp-keys">Del removes the selection. ⌘/Ctrl Z undo. ⌘/Ctrl Shift Z redo. ⌘/Ctrl S saves.</p>
    </aside>
  );
}

function whatIfHint(props: HudProps): string {
  if (props.mode === "direct") {
    if (!props.whatIf) return "Drag a dial. Teal cards agree with it, amber cards fight it.";
    const bits = (["confidence", "consensus", "novelty", "impact"] as const)
      .map((key) => {
        const delta = signed(props.simulated[key], props.baseline[key]);
        return delta ? `${key} ${delta}` : null;
      })
      .filter(Boolean);
    const shift = bits.length ? ` The board alone would move ${bits.join(", ")}.` : " The board's own scores did not move.";
    return `Dials stay put.${shift}`;
  }
  if (!props.whatIf) return "Mute or solo a paper, or drop an edge, to run a what-if.";
  const bits = (["confidence", "consensus", "novelty", "impact"] as const)
    .map((key) => {
      const delta = signed(props.shown[key], props.baseline[key]);
      return delta ? `${key} ${delta}` : null;
    })
    .filter(Boolean);
  if (bits.length === 0) return "What-if is on, and the scores did not move.";
  return `What-if: ${bits.join(", ")} versus the full board.`;
}
