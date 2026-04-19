export type Question = {
  num: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string;
  };
  answer: string;
  explanation: string;
  topics: string[];
};

export type OptionKey = "A" | "B" | "C" | "D" | "E";

export type ExplainStatus = "정답" | "오답";

export type WrongEntry = {
  notionPageId: string;
  questionNum: number;
  question: string;
  keyConcept: string;
  explanation: string;
  myAnswer: string;
  correctAnswer: string;
  domain: string;
  reviewed: boolean;
  reviewCount: number;
  dateAdded: string;
};

export type RoadmapTopic = {
  name: string;
  domainIndex: number;
  reason: string;
  next: string[];
};

export type RoadmapPhase = {
  phase: number;
  title: string;
  subtitle: string;
  color: string;
  topics: RoadmapTopic[];
};

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "code"; text: string; language?: string };

export type NoteSubSection = {
  title: string;
  blocks: ContentBlock[];
};

export type NoteSection = {
  title: string;
  blocks: ContentBlock[];
  subsections: NoteSubSection[];
};

export type NoteContent = NoteSection[];

export type NoteResponse = {
  topic: string;
  domain: string;
  status: string;
  summary: string;
  content: NoteContent;
  notionUrl: string;
};
