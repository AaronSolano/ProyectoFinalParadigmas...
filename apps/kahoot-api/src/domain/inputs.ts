export interface QuizInput {
  title: string;
  description?: string;
}
export interface QuestionInput {
  statement: string;
  correctAnswer: boolean;
  position?: number;
}
export interface SessionInput {
  quizId: string;
  questionTimeSeconds?: number;
}
export interface JoinInput {
  displayName?: string;
}
