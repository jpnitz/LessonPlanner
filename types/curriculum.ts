export type LearningStandard = {
  id: string;
  section_id: string;
  title: string;
  sort_order: number;
};

export type CurriculumSection = {
  id: string;
  curriculum_id: string;
  title: string;
  sort_order: number;
  learning_standards: LearningStandard[];
};

export type Curriculum = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export type CurriculumSummary = Curriculum;

export type CurriculumDetail = Curriculum & {
  sections: CurriculumSection[];
};

export type CurrentTopic = {
  standardId: string;
  standardTitle: string;
  sectionTitle: string;
  curriculumTitle: string;
  curriculumId: string;
};
