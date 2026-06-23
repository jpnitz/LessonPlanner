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
import type { CurriculumDetail, CurriculumSummary } from "@/types/curriculum";

type CurriculumCatalogContextValue = {
  curricula: CurriculumSummary[];
  curriculumDetails: CurriculumDetail[];
  upsertSavedCurriculum: (detail: CurriculumDetail) => void;
};

const CurriculumCatalogContext =
  createContext<CurriculumCatalogContextValue | null>(null);

type CurriculumCatalogProviderProps = {
  initialCurricula: CurriculumSummary[];
  initialCurriculumDetails: CurriculumDetail[];
  children: ReactNode;
};

export function CurriculumCatalogProvider({
  initialCurricula,
  initialCurriculumDetails,
  children,
}: CurriculumCatalogProviderProps) {
  const [curricula, setCurricula] = useState(initialCurricula);
  const [curriculumDetails, setCurriculumDetails] = useState(
    initialCurriculumDetails,
  );

  useEffect(() => {
    setCurricula(initialCurricula);
    setCurriculumDetails(initialCurriculumDetails);
  }, [initialCurricula, initialCurriculumDetails]);

  const upsertSavedCurriculum = useCallback((detail: CurriculumDetail) => {
    const summary: CurriculumSummary = {
      id: detail.id,
      slug: detail.slug,
      title: detail.title,
      description: detail.description,
      sort_order: detail.sort_order,
    };

    setCurricula((current) => {
      const existingIndex = current.findIndex((item) => item.id === detail.id);
      if (existingIndex === -1) {
        return [...current, summary].sort(
          (a, b) =>
            a.sort_order - b.sort_order || a.title.localeCompare(b.title),
        );
      }

      return current.map((item) =>
        item.id === detail.id ? summary : item,
      );
    });

    setCurriculumDetails((current) => {
      const existingIndex = current.findIndex((item) => item.id === detail.id);
      if (existingIndex === -1) {
        return [...current, detail];
      }

      return current.map((item) => (item.id === detail.id ? detail : item));
    });
  }, []);

  const value = useMemo(
    () => ({
      curricula,
      curriculumDetails,
      upsertSavedCurriculum,
    }),
    [curricula, curriculumDetails, upsertSavedCurriculum],
  );

  return (
    <CurriculumCatalogContext.Provider value={value}>
      {children}
    </CurriculumCatalogContext.Provider>
  );
}

export function useCurriculumCatalog() {
  const context = useContext(CurriculumCatalogContext);
  if (!context) {
    throw new Error(
      "useCurriculumCatalog must be used within CurriculumCatalogProvider",
    );
  }
  return context;
}
