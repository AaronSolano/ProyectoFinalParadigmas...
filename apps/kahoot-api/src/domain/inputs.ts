export interface QuizInput {
  title: string;
  description?: string;
}
export interface QuestionInput {
  statement: string;
  options: string[];
  correctOption: number;
  explanation?: string | null;
  position?: number;
}
export interface SessionInput {
  quizId: string;
  questionTimeSeconds?: number;
  autoAdvanceSeconds?: number;
}
export interface JoinInput {
  displayName?: string;
}
