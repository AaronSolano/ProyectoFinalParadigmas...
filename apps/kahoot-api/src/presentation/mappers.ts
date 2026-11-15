import { Quiz, Question, Session, Participant } from '../domain/entities';
export function quizView(q: Quiz) { return {...q}; }
export function questionView(q: Question,publicUrl: string) { const {imageFilename,...question}=q; return {...question,imageUrl:imageFilename ? `${publicUrl}/api/v1/images/${imageFilename}` : null}; }
export function sessionView(s: Session) { const {quizTitle: _quizTitle,...session}=s; return session; }
export function participantView(p: Participant) { return {...p}; }
