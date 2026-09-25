"use client";

import { useEffect, useRef } from "react";

const LINES = [
  "These scores are a board game. They are not a model of science and they are not learned.",
  "Paper power = influence × log10(1 + cited_by_count) × recency.",
  "Influence is the slider on the card, from 0 to 100, default 50.",
  "recency = clamp(0.35 + (year − 1990) / 80, 0.35, 1.4).",
  "Missing year → recency 0.8. Missing citations → cited_by_count 0, and power is 0.",
  "Edge mass = (power A + power B) / 2 × weight. Weight runs from 0.1 to 2, default 1.",
  "supports adds that mass to supportMass. contradicts adds it to controversyMass.",
  "extends adds it to extendsMass (novelty only). causes adds it on top of impactMass.",
  "An isolated paper — no live edge — still adds half its power to supportMass.",
  "Confidence = clamp(100 × supportMass / (supportMass + controversyMass + 1), 0, 100).",
  "Consensus = clamp(100 × (1 − controversyMass / (supportMass + controversyMass + 1)), 0, 100).",
  "Novelty = clamp(40 + 8 × distinct topics + 15 × extendsMass / (extendsMass + 5) − 10 × (edgeCount / max(nodeCount, 1)), 0, 100).",
  "Topics are OpenAlex topics and concepts, or the tags you type on a custom card.",
  "Impact = clamp(100 × impactMass / (impactMass + meanPaperPower × nodeCount + 1), 0, 100).",
  "impactMass = sum of paper power + causes-edge masses.",
  "Direct mode keeps the four dials where you set them. The board does not move them.",
  "A card agrees (teal) when its supports line up with high confidence and its contradicts line up with low consensus. It fights (amber) when those edges pull the other way. Otherwise it stays slate.",
  "Mute, solo, and Drop edge are what-ifs. Restore them and the sums come back.",
  "The sentence is a template from the highest dial and the highest-power title. No language model.",
  "Delete or Backspace removes the selection. Ctrl or Cmd Z undoes. Ctrl or Cmd Shift Z redoes. Ctrl or Cmd S saves.",
  "Shift-drag box-selects. Drag one selected card to move the group. Drag a teal handle onto another card to connect; the new edge starts as supports.",
];

export default function RulesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fp-rules" role="dialog" aria-modal="true" aria-labelledby="fp-rules-title">
      <div className="fp-rules-head">
        <h2 id="fp-rules-title">Rules</h2>
        <button ref={closeRef} type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <ol>
        {LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
