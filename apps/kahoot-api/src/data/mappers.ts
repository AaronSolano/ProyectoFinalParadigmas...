import {
  Quiz,
  Question,
  Session,
  Participant,
  RankingEntry,
} from "../domain/entities";
import { Row } from "./sql-adapter";
export function quizFromRow(r: Row, questionCount: number): Quiz {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    description: r.description,
    category: r.category ?? null,
    isLibrary: r.is_library === true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    questionCount,
  };
}
export function questionFromRow(r: Row): Question {
  return {
    id: r.id,
    quizId: r.quiz_id,
    statement: r.statement,
    options: r.options,
    correctOption: r.correct_option,
    explanation: r.explanation ?? null,
    imageFilename: r.image_filename,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
export function sessionFromRow(r: Row, participantCount: number): Session {
  return {
    id: r.id,
    code: r.code,
    quizId: r.quiz_id,
    quizTitle: r.quiz_title,
    hostId: r.host_id,
    status: r.status,
    questionTimeSeconds: r.question_time_seconds,
    autoAdvanceSeconds: r.auto_advance_seconds,
    participantCount,
    createdAt: r.created_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}
export function participantFromRow(r: Row): Participant {
  return {
    active: r.active,
    id: r.id,
    sessionId: r.session_id,
    userId: r.user_id,
    displayName: r.display_name,
    joinedAt: r.joined_at,
    score: r.score,
  };
}
export function rankingFromRow(r: Row): RankingEntry {
  return {
    position: r.position,
    participantId: r.participant_id,
    displayName: r.display_name,
    score: r.score,
    correctAnswers: r.correct_answers,
  };
}
