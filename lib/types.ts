export type LessonAnalysis = {
  title: string;
  objectives: string[];
  keyPoints: string[];
  suggestions: string[];
};

export type SurveyQuestion = {
  id: string;
  text: string;
  type: "single" | "multi" | "scale";
  options?: string[];
};

export type FeedbackPacket = {
  lessonId: string;
  answers: Record<string, string | string[] | number>;
  at: number;
};

export type AggregateSummary = {
  understood: number;
  notClear: number;
  tooFast: number;
  needExamples: number;
  total: number;
};
