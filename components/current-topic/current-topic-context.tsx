"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CurrentTopic } from "@/types/curriculum";

type CurrentTopicContextValue = {
  currentTopic: CurrentTopic | null;
  activeStudentId: string | null;
  setActiveStudentId: (studentId: string | null) => void;
  selectTopic: (topic: CurrentTopic) => Promise<void>;
  clearTopic: () => Promise<void>;
};

const CurrentTopicContext = createContext<CurrentTopicContextValue | null>(null);

type CurrentTopicProviderProps = {
  children: ReactNode;
  initialTopic?: CurrentTopic | null;
  initialActiveStudentId?: string | null;
};

export function CurrentTopicProvider({
  children,
  initialTopic = null,
  initialActiveStudentId = null,
}: CurrentTopicProviderProps) {
  const [currentTopic, setCurrentTopic] = useState<CurrentTopic | null>(
    initialTopic,
  );
  const [activeStudentId, setActiveStudentId] = useState<string | null>(
    initialActiveStudentId,
  );

  useEffect(() => {
    setCurrentTopic(initialTopic ?? null);
  }, [initialTopic]);

  useEffect(() => {
    setActiveStudentId(initialActiveStudentId ?? null);
  }, [initialActiveStudentId]);

  const selectTopic = useCallback(async (topic: CurrentTopic) => {
    setCurrentTopic(topic);
    setActiveStudentId(topic.studentId);

    await fetch("/api/current-topic", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: topic.studentId,
        standard_id: topic.standardId,
      }),
    });
  }, []);

  const clearTopic = useCallback(async () => {
    const studentId = currentTopic?.studentId ?? activeStudentId;
    setCurrentTopic(null);
    if (!studentId) return;

    await fetch("/api/current-topic", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    });
  }, [activeStudentId, currentTopic?.studentId]);

  const value = useMemo(
    () => ({
      currentTopic,
      activeStudentId,
      setActiveStudentId,
      selectTopic,
      clearTopic,
    }),
    [currentTopic, activeStudentId, selectTopic, clearTopic],
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
