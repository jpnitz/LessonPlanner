"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LessonPlannerSettings } from "@/types/curriculum";

type LessonPlannerContextValue = {
  settings: LessonPlannerSettings;
  isLoading: boolean;
  isSaving: boolean;
  updateSettings: (patch: Partial<LessonPlannerSettings>) => void;
  saveSettings: () => Promise<void>;
};

const defaultSettings = (userId: string): LessonPlannerSettings => ({
  user_id: userId,
  hours_per_week: null,
  hours_per_day: null,
  days_of_week: [],
  selected_student_ids: [],
});

const LessonPlannerContext = createContext<LessonPlannerContextValue | null>(
  null,
);

type LessonPlannerProviderProps = {
  children: ReactNode;
  userId: string;
  initialSettings?: LessonPlannerSettings | null;
};

export function LessonPlannerProvider({
  children,
  userId,
  initialSettings,
}: LessonPlannerProviderProps) {
  const [settings, setSettings] = useState<LessonPlannerSettings>(
    initialSettings ?? defaultSettings(userId),
  );
  const [isLoading, setIsLoading] = useState(!initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function loadSettings() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/lesson-planner/settings");
        if (!response.ok) throw new Error("Failed to load settings.");
        const data = await response.json();
        if (!cancelled) setSettings(data.settings);
      } catch {
        if (!cancelled) setSettings(defaultSettings(userId));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [initialSettings, userId]);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    pendingSaveRef.current = false;
    try {
      const response = await fetch("/api/lesson-planner/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to save settings.");
      const data = await response.json();
      setSettings(data.settings);
    } finally {
      setIsSaving(false);
      if (pendingSaveRef.current) {
        void saveSettings();
      }
    }
  }, [settings]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (isSaving) {
        pendingSaveRef.current = true;
      } else {
        void saveSettings();
      }
    }, 500);
  }, [isSaving, saveSettings]);

  const updateSettings = useCallback(
    (patch: Partial<LessonPlannerSettings>) => {
      setSettings((current) => ({ ...current, ...patch, user_id: userId }));
      scheduleSave();
    },
    [scheduleSave, userId],
  );

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      isSaving,
      updateSettings,
      saveSettings,
    }),
    [settings, isLoading, isSaving, updateSettings, saveSettings],
  );

  return (
    <LessonPlannerContext.Provider value={value}>
      {children}
    </LessonPlannerContext.Provider>
  );
}

export function useLessonPlanner() {
  const context = useContext(LessonPlannerContext);
  if (!context) {
    throw new Error("useLessonPlanner must be used within LessonPlannerProvider");
  }
  return context;
}
