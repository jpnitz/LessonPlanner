"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CurrentTopic } from "@/types/curriculum";

type CurrentTopicContextValue = {
  currentTopic: CurrentTopic | null;
  selectTopic: (topic: CurrentTopic) => void;
  clearTopic: () => void;
};

const CurrentTopicContext = createContext<CurrentTopicContextValue | null>(null);

export function CurrentTopicProvider({ children }: { children: ReactNode }) {
  const [currentTopic, setCurrentTopic] = useState<CurrentTopic | null>(null);

  const selectTopic = useCallback((topic: CurrentTopic) => {
    setCurrentTopic(topic);
  }, []);

  const clearTopic = useCallback(() => {
    setCurrentTopic(null);
  }, []);

  const value = useMemo(
    () => ({ currentTopic, selectTopic, clearTopic }),
    [currentTopic, selectTopic, clearTopic],
  );

  return (
    <CurrentTopicContext.Provider value={value}>
      {children}
    </CurrentTopicContext.Provider>
  );
}

export function useCurrentTopic() {
  const context = useContext(CurrentTopicContext);
  if (!context) {
    throw new Error("useCurrentTopic must be used within CurrentTopicProvider");
  }
  return context;
}
