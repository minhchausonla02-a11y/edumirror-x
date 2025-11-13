// /lib/store.tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { LessonAnalysis, SurveyQuestion } from "./types";

type AppState = {
  lessonText: string;
  analysis: LessonAnalysis | null;
  survey: SurveyQuestion[];
};

const defaultState: AppState = { lessonText: "", analysis: null, survey: [] };
const KEY = "edumirror-state-v1";

const AppCtx = createContext<{
  state: AppState;
  setState: (s: Partial<AppState>) => void;
}>({
  state: defaultState,
  setState: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setLocal] = useState<AppState>(defaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLocal(JSON.parse(raw));
    } catch {}
  }, []);

  const setState = (s: Partial<AppState>) => {
    setLocal((prev) => {
      const next = { ...prev, ...s };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return <AppCtx.Provider value={{ state, setState }}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);
