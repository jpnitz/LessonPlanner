import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CurriculumDetail,
  CurriculumSection,
  CurriculumSummary,
  LearningStandard,
} from "@/types/curriculum";

type CurriculumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
};

type SectionRow = {
  id: string;
  curriculum_id: string;
  title: string;
  sort_order: number;
};

type StandardRow = {
  id: string;
  section_id: string;
  title: string;
  sort_order: number;
};

export async function fetchCurricula(
  supabase: SupabaseClient,
): Promise<CurriculumSummary[]> {
  const { data, error } = await supabase
    .from("curricula")
    .select("id, slug, title, description, sort_order")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CurriculumSummary[];
}

export async function fetchCurriculumDetail(
  supabase: SupabaseClient,
  curriculumId: string,
): Promise<CurriculumDetail | null> {
  const { data: curriculum, error: curriculumError } = await supabase
    .from("curricula")
    .select("id, slug, title, description, sort_order")
    .eq("id", curriculumId)
    .maybeSingle();

  if (curriculumError) throw curriculumError;
  if (!curriculum) return null;

  const { data: sections, error: sectionsError } = await supabase
    .from("curriculum_sections")
    .select("id, curriculum_id, title, sort_order")
    .eq("curriculum_id", curriculumId)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (sectionsError) throw sectionsError;

  const sectionRows = (sections ?? []) as SectionRow[];
  const sectionIds = sectionRows.map((section) => section.id);

  let standardRows: StandardRow[] = [];
  if (sectionIds.length > 0) {
    const { data: standards, error: standardsError } = await supabase
      .from("learning_standards")
      .select("id, section_id, title, sort_order")
      .in("section_id", sectionIds)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (standardsError) throw standardsError;
    standardRows = (standards ?? []) as StandardRow[];
  }

  const standardsBySection = new Map<string, LearningStandard[]>();
  for (const standard of standardRows) {
    const list = standardsBySection.get(standard.section_id) ?? [];
    list.push(standard);
    standardsBySection.set(standard.section_id, list);
  }

  const detailSections: CurriculumSection[] = sectionRows.map((section) => ({
    ...section,
    learning_standards: standardsBySection.get(section.id) ?? [],
  }));

  return {
    ...(curriculum as CurriculumRow),
    sections: detailSections,
  };
}
