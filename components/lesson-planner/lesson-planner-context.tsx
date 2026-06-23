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
  saveError: string | null;
  updateSettings: (patch: Partial<LessonPlannerSettings>) => void;
  saveSettings: () => Promise<void>;
};

const defaultSettings = (
  userId: string,
  primaryStudentId?: string | null,
): LessonPlannerSettings => ({
  user_id: userId,
  hours_per_week: null,
  hours_per_day: null,
  days_of_week: [],
  selected_student_ids: primaryStudentId ? [primaryStudentId] : [],
});

const LessonPlannerContext = createContext<LessonPlannerContextValue | null>(
  null,
);

type LessonPlannerProviderProps = {
  children: ReactNode;
  userId: string;
  initialSettings?: LessonPlannerSettings | null;
  primaryStudentId?: string | null;
};

function withPrimaryDefault(
  settings: LessonPlannerSettings,
  primaryStudentId?: string | null,
): LessonPlannerSettings {
  if (
    settings.selected_student_ids.length === 0 &&
    primaryStudentId
  ) {
    return {
      ...settings,
      selected_student_ids: [primaryStudentId],
    };
  }
  return settings;
}

export function LessonPlannerProvider({
  children,
  userId,
  initialSettings,
  primaryStudentId,
}: LessonPlannerProviderProps) {
  const hydratedRef = useRef(false);
  const settingsRef = useRef<LessonPlannerSettings>(
    withPrimaryDefault(
      initialSettings ?? defaultSettings(userId, primaryStudentId),
      primaryStudentId,
    ),
  );

  const [settings, setSettings] = useState<LessonPlannerSettings>(
    settingsRef.current,
  );
  const [isLoading, setIsLoading] = useState(!initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (initialSettings) {
      const merged = withPrimaryDefault(initialSettings, primaryStudentId);
      settingsRef.current = merged;
      setSettings(merged);
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
        if (!cancelled) {
          const merged = withPrimaryDefault(data.settings, primaryStudentId);
          settingsRef.current = merged;
          setSettings(merged);
        }
      } catch {
        if (!cancelled) {
          const fallback = defaultSettings(userId, primaryStudentId);
          settingsRef.current = fallback;
          setSettings(fallback);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [initialSettings, primaryStudentId, userId]);

  const saveSettings = useCallback(async () => {
    const payload = settingsRef.current;
    setIsSaving(true);
    setSaveError(null);
    pendingSaveRef.current = false;

    try {
      const response = await fetch("/api/lesson-planner/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ??
            "Could not save lesson planner settings. Run migration 004 in Supabase if you have not yet.",
        );
      }

      const data = await response.json();
      const merged = withPrimaryDefault(data.settings, primaryStudentId);
      settingsRef.current = merged;
      setSettings(merged);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save settings.",
      );
    } finally {
      setIsSaving(false);
      if (pendingSaveRef.current) {
        void saveSettings();
      }
    }
  }, [primaryStudentId]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (isSaving) {
        pendingSaveRef.current = true;
      } else {
        void saveSettings();
      }
    }, 400);
  }, [isSaving, saveSettings]);

  const updateSettings = useCallback(
    (patch: Partial<LessonPlannerSettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch, user_id: userId };
        settingsRef.current = next;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave, userId],
  );

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      isSaving,
      saveError,
      updateSettings,
      saveSettings,
    }),
    [settings, isLoading, isSaving, saveError, updateSettings, saveSettings],
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
