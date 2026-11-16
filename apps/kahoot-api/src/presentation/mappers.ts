import { Quiz, Question, Session, Participant } from "../domain/entities";
export function quizView(q: Quiz) {
  return {
    id: q.id,
    ownerId: q.ownerId,
    title: q.title,
    description: q.description,
    category: q.category,
    isLibrary: q.isLibrary,
    questionCount: q.questionCount,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
export function questionView(q: Question, publicUrl: string) {
  return {
    id: q.id,
    quizId: q.quizId,
    statement: q.statement,
    options: q.options,
    correctOption: q.correctOption,
    explanation: q.explanation,
    imageUrl: q.imageFilename
      ? `${publicUrl}/api/v1/images/${q.imageFilename}`
      : null,
    position: q.position,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
export function sessionView(s: Session) {
  return {
    id: s.id,
    code: s.code,
    quizId: s.quizId,
    hostId: s.hostId,
    status: s.status,
    questionTimeSeconds: s.questionTimeSeconds,
    autoAdvanceSeconds: s.autoAdvanceSeconds,
    participantCount: s.participantCount,
    createdAt: s.createdAt,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
  };
}
export function participantView(p: Participant) {
  return {
    id: p.id,
    sessionId: p.sessionId,
    userId: p.userId,
    displayName: p.displayName,
    joinedAt: p.joinedAt,
    score: p.score,
  };
}
