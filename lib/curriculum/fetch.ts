import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CurriculumDetail,
  CurriculumDomain,
  CurriculumSummary,
  LearningStandard,
  StandardKsa,
  StudentCurriculumAssignment,
} from "@/types/curriculum";

type CurriculumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
};

type StandardRow = {
  id: string;
  curriculum_id: string;
  domain_title: string | null;
  title: string;
  sort_order: number;
};

type KsaRow = {
  id: string;
  standard_id: string;
  ksa_type: StandardKsa["ksa_type"];
  title: string;
  description: string | null;
  sort_order: number;
};

export async function fetchCurricula(
  supabase: SupabaseClient,
  options?: { curriculumIds?: string[] },
): Promise<CurriculumSummary[]> {
  let query = supabase
    .from("curricula")
    .select("id, slug, title, description, sort_order")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (options?.curriculumIds?.length) {
    query = query.in("id", options.curriculumIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CurriculumSummary[];
}

export async function fetchStudentCurriculumIds(
  supabase: SupabaseClient,
  studentIds: string[],
): Promise<string[]> {
  if (studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_curricula")
    .select("curriculum_id")
    .in("student_id", studentIds);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.curriculum_id as string))];
}

export async function fetchStudentCurriculumAssignments(
  supabase: SupabaseClient,
  studentIds: string[],
): Promise<StudentCurriculumAssignment[]> {
  if (studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_curricula")
    .select("student_id, curriculum_id")
    .in("student_id", studentIds);

  if (error) throw error;
  return (data ?? []) as StudentCurriculumAssignment[];
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

  const { data: standards, error: standardsError } = await supabase
    .from("learning_standards")
    .select("id, curriculum_id, domain_title, title, sort_order")
    .eq("curriculum_id", curriculumId)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (standardsError) throw standardsError;

  const standardRows = (standards ?? []) as StandardRow[];
  const standardIds = standardRows.map((standard) => standard.id);

  let ksaRows: KsaRow[] = [];
  if (standardIds.length > 0) {
    const { data: ksas, error: ksasError } = await supabase
      .from("standard_ksas")
      .select("id, standard_id, ksa_type, title, description, sort_order")
      .in("standard_id", standardIds)
      .order("sort_order", { ascending: true });

    if (ksasError) throw ksasError;
    ksaRows = (ksas ?? []) as KsaRow[];
  }

  const ksasByStandard = new Map<string, StandardKsa[]>();
  for (const ksa of ksaRows) {
    const list = ksasByStandard.get(ksa.standard_id) ?? [];
    list.push(ksa);
    ksasByStandard.set(ksa.standard_id, list);
  }

  const standardsWithKsa: LearningStandard[] = standardRows.map((standard) => ({
    ...standard,
    ksas: ksasByStandard.get(standard.id) ?? [],
  }));

  const domainMap = new Map<string, CurriculumDomain>();
  for (const standard of standardsWithKsa) {
    const domainTitle = standard.domain_title ?? "General";
    const existing = domainMap.get(domainTitle);
    if (existing) {
      existing.learning_standards.push(standard);
    } else {
      domainMap.set(domainTitle, {
        title: domainTitle,
        sort_order: standard.sort_order,
        learning_standards: [standard],
      });
    }
  }

  const domains = [...domainMap.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title),
  );

  return {
    ...(curriculum as CurriculumRow),
    domains,
  };
}
