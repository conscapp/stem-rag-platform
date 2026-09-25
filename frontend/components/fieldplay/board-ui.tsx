"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CardData, Mode, RelationData, Tension } from "@/lib/fieldplay/types";

export interface BoardUi {
  mode: Mode;
  tension: Map<string, Tension>;
  scoringIds: Set<string>;
  patchNode: (id: string, patch: Partial<CardData>, opts?: { history?: boolean }) => void;
  patchEdge: (id: string, patch: Partial<RelationData>, opts?: { history?: boolean }) => void;
  removeEdge: (id: string) => void;
}

const BoardUiContext = createContext<BoardUi | null>(null);

export function BoardUiProvider({ value, children }: { value: BoardUi; children: ReactNode }) {
  return <BoardUiContext.Provider value={value}>{children}</BoardUiContext.Provider>;
}

export function useBoardUi(): BoardUi {
  const value = useContext(BoardUiContext);
  if (!value) throw new Error("Fieldplay board is not ready");
  return value;
}
