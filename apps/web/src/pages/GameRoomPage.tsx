import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useGameSocket } from '../realtime/useGameSocket';
import { CountdownTimer } from '../components/CountdownTimer';
import { TrueFalseButtons } from '../components/TrueFalseButtons';
import { ErrorBanner } from '../components/ErrorBanner';

interface GameRoomPageProps {
  roleHint: 'host' | 'participant';
}

export function GameRoomPage({ roleHint }: GameRoomPageProps) {
  const { code = '' } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const normalizedCode = code.trim().toUpperCase();
  const {
    liveState,
    connectionState,
    startSession,
    closeQuestion,
    nextQuestion,
    submitAnswer,
    leaveSession,
    simulateReconnect,
    clearError,
  } = useGameSocket(normalizedCode, token, roleHint === 'host');

  const isHost = liveState.isHost || roleHint === 'host';
  const myQuestionResult =
    liveState.participantId && liveState.lastClosed
      ? liveState.lastClosed.results.find((r) => r.participantId === liveState.participantId)
      : undefined;

  const answeredCount = liveState.lastClosed
    ? liveState.lastClosed.results.filter((r) => r.answered).length
    : 0;

  const handleLeave = () => {
    leaveSession();
    navigate('/join');
  };

  return (
    <div className="game-container" data-testid="game-room-page">
      {connectionState === 'reconnecting' && (
        <div className="reconnect-banner" role="status" data-testid="reconnect-banner">
          {t('game.reconnectingBanner')}
        </div>
      )}

      <ErrorBanner error={liveState.lastError} onDismiss={clearError} />

      <header className="game-header card">
        <div className="game-header__code-box">
          <span className="game-header__label">{t('game.roomCode')}</span>
          <strong className="game-header__code" data-testid="room-code-display">
            {normalizedCode}
          </strong>
        </div>

        <div className="game-header__meta">
          {!isHost && (
            <span className="score-pill" data-testid="participant-score">
              {t('game.myScore', { score: liveState.myScore })}
            </span>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid="btn-simulate-reconnect"
            onClick={simulateReconnect}
          >
            {t('game.simulateDisconnectBtn')}
          </button>
          {!isHost && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid="btn-leave-session"
              onClick={handleLeave}
            >
              {t('game.leaveSessionBtn')}
            </button>
          )}
        </div>
      </header>

      {/* WAITING LOBBY */}
      {liveState.status === 'waiting' && (
        <section className="card lobby-section" data-testid="lobby-view">
          <p className="lobby-status">
            {isHost ? t('game.lobbyWaitingHost') : t('game.lobbyWaitingParticipant')}
          </p>

          <h2 className="card__subtitle">
            {t('game.participantsTitle', { count: liveState.participants.length })}
          </h2>

          {liveState.participants.length === 0 ? (
            <p className="empty-state">{t('game.noParticipants')}</p>
          ) : (
            <ul className="participant-chips" data-testid="lobby-participants-list">
              {liveState.participants.map((p) => (
                <li key={p.id} className="participant-chip">
                  {p.displayName}
                </li>
              ))}
            </ul>
          )}

          {isHost && (
            <div className="host-actions">
              <button
                type="button"
                data-testid="btn-start-session"
                className="btn btn--primary btn--lg"
                onClick={startSession}
              >
                {t('game.startSessionBtn')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* QUESTION OPEN */}
      {liveState.status === 'question_open' && liveState.currentQuestion && (
        <section className="card question-live-card" data-testid="question-open-view">
          <div className="question-live__top">
            <span className="badge" data-testid="question-counter">
              {t('game.questionCounter', {
                current: liveState.currentQuestion.questionIndex + 1,
                total: liveState.currentQuestion.total,
              })}
            </span>

            <CountdownTimer
              closesAt={liveState.closesAt}
              clockOffsetMs={liveState.clockOffsetMs}
            />
          </div>

          <h2 className="question-live__statement" data-testid="question-statement">
            {liveState.currentQuestion.statement}
          </h2>

          {liveState.currentQuestion.imageUrl && (
            <div className="question-live__image-box">
              <img
                src={liveState.currentQuestion.imageUrl}
                alt={liveState.currentQuestion.statement}
                className="question-live__image"
                data-testid="question-live-image"
              />
            </div>
          )}

          {isHost ? (
            <div className="host-actions">
              <button
                type="button"
                data-testid="btn-close-question"
                className="btn btn--secondary btn--lg"
                onClick={closeQuestion}
              >
                {t('game.closeQuestionBtn')}
              </button>
            </div>
          ) : (
            <TrueFalseButtons
              questionIndex={liveState.currentQuestion.questionIndex}
              hasAnswered={liveState.hasAnswered}
              answerAccepted={liveState.answerAccepted}
              rejectedReason={liveState.rejectedReason}
              onSubmitAnswer={(answer) =>
                submitAnswer(liveState.currentQuestion!.questionIndex, answer)
              }
            />
          )}
        </section>
      )}

      {/* QUESTION CLOSED */}
      {liveState.status === 'question_closed' && liveState.lastClosed && (
        <section className="card results-card" data-testid="question-closed-view">
          <h2 className="card__title">{t('game.questionClosedTitle')}</h2>

          <div className="correct-answer-banner" data-testid="correct-answer-reveal">
            {t('game.correctAnswerWas', {
              answer: liveState.lastClosed.correctAnswer
                ? t('game.trueBtn')
                : t('game.falseBtn'),
            })}
          </div>

          {!isHost && myQuestionResult && (
            <div
              className={`personal-result ${
                myQuestionResult.correct ? 'personal-result--right' : 'personal-result--wrong'
              }`}
              data-testid="personal-question-result"
            >
              {!myQuestionResult.answered
                ? t('game.didNotAnswer')
                : myQuestionResult.correct
                  ? t('game.youAnsweredRight', { points: myQuestionResult.pointsAwarded })
                  : t('game.youAnsweredWrong')}
            </div>
          )}

          {isHost && (
            <p className="answered-summary" data-testid="host-answered-summary">
              {t('game.answeredCount', {
                answered: answeredCount,
                total: liveState.lastClosed.results.length,
              })}
            </p>
          )}

          <h3 className="card__subtitle">{t('game.rankingTitle')}</h3>
          <ol className="ranking-list" data-testid="question-ranking-list">
            {liveState.lastClosed.ranking.map((entry) => (
              <li key={entry.participantId} className="ranking-row">
                <span className="ranking-row__pos">#{entry.position}</span>
                <span className="ranking-row__name">{entry.displayName}</span>
                <strong className="ranking-row__score">
                  {t('game.scoreLabel', { score: entry.score })}
                </strong>
              </li>
            ))}
          </ol>

          {isHost && (
            <div className="host-actions">
              <button
                type="button"
                data-testid="btn-next-question"
                className="btn btn--primary btn--lg"
                onClick={nextQuestion}
              >
                {t('game.nextQuestionBtn')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SESSION FINISHED */}
      {liveState.status === 'finished' && (
        <section className="card finished-card" data-testid="session-finished-view">
          <h2 className="card__title">{t('game.finalRankingTitle')}</h2>

          <ol className="ranking-list ranking-list--final" data-testid="final-ranking-list">
            {liveState.ranking.map((entry) => (
              <li key={entry.participantId} className="ranking-row">
                <span className="ranking-row__pos">#{entry.position}</span>
                <span className="ranking-row__name">{entry.displayName}</span>
                <strong className="ranking-row__score">
                  {t('game.scoreLabel', { score: entry.score })}
                </strong>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
