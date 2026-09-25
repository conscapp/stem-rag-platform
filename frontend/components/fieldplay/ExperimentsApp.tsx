"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  experimentReducer,
  readExperiments,
  writeExperiments,
  type ExperimentState,
} from "@/lib/fieldplay/experiments";
import type { BoardAction } from "./reducer";
import ExperimentSlot from "./ExperimentSlot";

function readInitial(): ExperimentState {
  if (typeof window === "undefined") return readExperiments(null);
  return readExperiments(window.sessionStorage);
}

export default function ExperimentsApp() {
  const [state, dispatch] = useReducer(experimentReducer, undefined, readInitial);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ok = writeExperiments(window.sessionStorage, state);
      if (!ok) setNotice("This tab could not keep the experiments.");
    }, 80);
    return () => window.clearTimeout(timer);
  }, [state]);

  const onAction = useCallback((id: string, action: BoardAction) => {
    dispatch({ type: "slot", id, action });
  }, []);

  const onReset = useCallback((id: string) => {
    dispatch({ type: "reset", id });
    setNotice("Reset that slot to the fixture.");
  }, []);

  const onDuplicate = useCallback((id: string) => {
    dispatch({ type: "duplicate", id });
    setNotice("Duplicated into a new slot.");
  }, []);

  return (
    <div className="fp-lane">
      <header className="fp-lane-head">
        <div>
          <p className="fp-mark">Fieldplay experiments</p>
          <h1>Three boards, no waiting</h1>
          <p className="fp-lede">
            Each slot starts from a local fixture. Edits stay in this tab and never join the boards on /play.
          </p>
        </div>
        <button
          type="button"
          className="fp-lane-new"
          onClick={() => {
            dispatch({ type: "add" });
            setNotice("New experiment is ready.");
          }}
        >
          New experiment
        </button>
      </header>
      {notice ? (
        <p className="fp-notice" role="status">
          {notice}
        </p>
      ) : null}
      <div className="fp-lane-grid">
        {state.slots.map((slot) => (
          <ExperimentSlot
            key={slot.boardId}
            slot={slot}
            onAction={onAction}
            onReset={onReset}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>
    </div>
  );
}
