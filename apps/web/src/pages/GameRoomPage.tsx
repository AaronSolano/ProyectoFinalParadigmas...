import { RoomQr } from '../components/RoomQr';
import { useSoundMuted } from '../audio/useSoundMuted';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { getAppEnv } from '../config/env';
import { useGameSocket } from '../realtime/useGameSocket';
import {
  playLobbySound,
  playPodiumFanfare,
  playQuestionOpenSound,
  playResultSound,
  playSubmitAnswerSound,
  playTimeUpSound,
  toggleSoundMuted,
  unlockAudioContext,
} from '../audio/soundEngine';
import { CountdownTimer } from '../components/CountdownTimer';
import { OptionButtons } from '../components/OptionButtons';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  RubyFeedback,
  RubyQuestionCompanion,
} from '../components/RubyFeedback';
import {
  closedQuestionMood,
  droppedInRanking,
  finalRubyMood,
} from '../components/rubyReactions';

interface GameRoomPageProps {
  roleHint: 'host' | 'participant';
}

export function formatElapsedSeconds(
  elapsedMs: number | null | undefined,
): string | null {
  if (
    typeof elapsedMs !== 'number' ||
    Number.isNaN(elapsedMs) ||
    elapsedMs < 0
  ) {
    return null;
  }
  return (elapsedMs / 1000).toFixed(2);
}

export function GameRoomPage({ roleHint }: GameRoomPageProps) {
  const { code = '' } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const normalizedCode = code.trim().toUpperCase();
  const { enableDebugControls } = getAppEnv();
  const muted = useSoundMuted();
  const prevStatusRef = useRef<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [nextInSeconds, setNextInSeconds] = useState<number | null>(null);
  const roundBaseline = useRef<{
    code: string;
    questionIndex: number;
    position?: number;
    streak: number;
  } | null>(null);

  const {
    liveState,
    connectionState,
    startSession,
    closeQuestion,
    nextQuestion,
    submitAnswer,
    leaveSession,
    simulateReconnect,
    retryReconnect,
    clearError,
  } = useGameSocket(normalizedCode, token, roleHint === 'host');

  const nextQuestionAt =
    liveState.status === 'question_closed'
      ? (liveState.lastClosed?.nextQuestionAt ?? null)
      : null;
  useEffect(() => {
    if (!nextQuestionAt) {
      setNextInSeconds(null);
      return;
    }
    const target = new Date(nextQuestionAt).getTime();
    const tick = () =>
      setNextInSeconds(
        Math.max(
          0,
          Math.ceil((target - (Date.now() + liveState.clockOffsetMs)) / 1000),
        ),
      );
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [nextQuestionAt, liveState.clockOffsetMs]);

  const isHost = liveState.isHost || roleHint === 'host';
  const myQuestionResult =
    liveState.participantId && liveState.lastClosed
      ? liveState.lastClosed.results.find(
          (r) => r.participantId === liveState.participantId,
        )
      : undefined;

  const answeredCount = liveState.lastClosed
    ? liveState.lastClosed.results.filter((r) => r.answered).length
    : 0;

  useEffect(() => {
    if (liveState.status === 'question_open' && liveState.currentQuestion) {
      const questionIndex = liveState.currentQuestion.questionIndex;
      if (
        roundBaseline.current?.code !== normalizedCode ||
        roundBaseline.current.questionIndex !== questionIndex
      ) {
        roundBaseline.current = {
          code: normalizedCode,
          questionIndex,
          position: liveState.ranking.find(
            (entry) => entry.participantId === liveState.participantId,
          )?.position,
          streak: liveState.myStreak,
        };
      }
    }
  }, [
    normalizedCode,
    liveState.status,
    liveState.currentQuestion,
    liveState.ranking,
    liveState.participantId,
    liveState.myStreak,
  ]);

  useEffect(() => {
    setAdvancing(false);
  }, [liveState.status, liveState.lastError, connectionState]);

  useEffect(() => {
    if (!advancing) return;
    // A brief visual cue, not an acknowledgement or a local game countdown.
    const timer = window.setTimeout(() => setAdvancing(false), 900);
    return () => window.clearTimeout(timer);
  }, [advancing]);

  const baseline =
    roundBaseline.current?.code === normalizedCode &&
    roundBaseline.current.questionIndex === liveState.lastClosed?.questionIndex
      ? roundBaseline.current
      : undefined;
  const resultMood = closedQuestionMood({
    isHost,
    results: liveState.lastClosed?.results ?? [],
    result: myQuestionResult,
    previousStreak: baseline?.streak,
  });
  const movedDown =
    !isHost &&
    droppedInRanking(
      liveState.lastClosed?.ranking ?? [],
      liveState.participantId,
      baseline?.position,
    );
  const podiumMood = finalRubyMood(
    liveState.ranking,
    liveState.participantId,
    isHost,
  );

  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = liveState.status;
    if (prev === curr) {
      return;
    }
    prevStatusRef.current = curr;

    if (curr === 'waiting') {
      playLobbySound();
    } else if (curr === 'question_open') {
      playQuestionOpenSound();
    } else if (curr === 'question_closed') {
      if (!isHost && myQuestionResult) {
        if (!myQuestionResult.answered) {
          playTimeUpSound();
        } else {
          playResultSound(myQuestionResult.correct, myQuestionResult.streak);
        }
      } else {
        playTimeUpSound();
      }
    } else if (curr === 'finished') {
      playPodiumFanfare();
    }
  }, [liveState.status, isHost, myQuestionResult]);

  const handleToggleSound = () => {
    unlockAudioContext();
    toggleSoundMuted();
  };

  const handleStartSession = () => {
    unlockAudioContext();
    setAdvancing(true);
    startSession();
  };

  const handleNextQuestion = () => {
    setAdvancing(true);
    nextQuestion();
  };

  const handleSubmitAnswer = (option: number) => {
    unlockAudioContext();
    playSubmitAnswerSound();
    if (liveState.currentQuestion) {
      submitAnswer(liveState.currentQuestion.questionIndex, option);
    }
  };

  const handleLeave = () => {
    leaveSession();
    navigate('/join');
  };

  const elapsedSecondsFormatted = formatElapsedSeconds(
    myQuestionResult?.elapsedMs ?? liveState.lastElapsedMs,
  );
  const currentStreak = myQuestionResult?.streak ?? liveState.myStreak;

  return (
    <div className="game-container" data-testid="game-room-page">
      {connectionState === 'reconnecting' && (
        <div
          className="reconnect-banner"
          role="status"
          data-testid="reconnect-banner"
        >
          {t('game.reconnectingBanner')}
        </div>
      )}

      {connectionState === 'reconnect_failed' && (
        <div
          className="reconnect-banner"
          role="alert"
          data-testid="reconnect-failed-banner"
        >
          <span>{t('game.reconnectFailedBanner')}</span>{' '}
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid="btn-retry-reconnect"
            onClick={retryReconnect}
          >
            {t('game.retryReconnectBtn')}
          </button>
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
          {!isHost && currentStreak >= 2 && (
            <span className="streak-pill" data-testid="header-streak-badge">
              {t('game.streakBadge', { streak: currentStreak })}
            </span>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid="btn-toggle-sound"
            aria-pressed={muted}
            onClick={handleToggleSound}
          >
            {muted ? t('game.soundMutedBtn') : t('game.soundOnBtn')}
          </button>
          {enableDebugControls && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid="btn-simulate-reconnect"
              onClick={simulateReconnect}
            >
              {t('game.simulateDisconnectBtn')}
            </button>
          )}
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
          {isHost && <RoomQr code={normalizedCode} />}
          <RubyFeedback
            mood={advancing ? 'cheer' : 'idle'}
            className="ruby-feedback--lobby"
          />
          <p className="lobby-status">
            {isHost
              ? t('game.lobbyWaitingHost')
              : t('game.lobbyWaitingParticipant')}
          </p>

          <h2 className="card__subtitle">
            {t('game.participantsTitle', {
              count: liveState.participants.length,
            })}
          </h2>

          {liveState.participants.length === 0 ? (
            <p className="empty-state">{t('game.noParticipants')}</p>
          ) : (
            <ul
              className="participant-chips"
              data-testid="lobby-participants-list"
            >
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
                onClick={handleStartSession}
                disabled={advancing || connectionState !== 'connected'}
              >
                {t('game.startSessionBtn')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* QUESTION OPEN */}
      {liveState.status === 'question_open' && liveState.currentQuestion && (
        <section
          className="card question-live-card"
          data-testid="question-open-view"
        >
          <div className="question-live__top">
            <span className="badge" data-testid="question-counter">
              {t('game.questionCounter', {
                current: liveState.currentQuestion.questionIndex + 1,
                total: liveState.currentQuestion.total,
              })}
            </span>

            <CountdownTimer
              closesAt={liveState.closesAt}
              openedAt={liveState.currentQuestion.openedAt}
              durationSeconds={liveState.currentQuestion.durationSeconds}
              clockOffsetMs={liveState.clockOffsetMs}
              enableTickSound
            />
          </div>

          <RubyQuestionCompanion
            key={`${normalizedCode}-${liveState.currentQuestion.openedAt}`}
            openedAt={liveState.currentQuestion.openedAt}
            clockOffsetMs={liveState.clockOffsetMs}
          />

          <h2
            className="question-live__statement"
            data-testid="question-statement"
          >
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
            <OptionButtons
              questionIndex={liveState.currentQuestion.questionIndex}
              options={liveState.currentQuestion.options}
              hasAnswered={liveState.hasAnswered}
              answerAccepted={liveState.answerAccepted}
              rejectedReason={liveState.rejectedReason}
              onSubmitAnswer={handleSubmitAnswer}
            />
          )}
        </section>
      )}

      {/* QUESTION CLOSED */}
      {liveState.status === 'question_closed' && liveState.lastClosed && (
        <section
          className="card results-card"
          data-testid="question-closed-view"
        >
          <RubyFeedback
            mood={advancing ? 'cheer' : resultMood}
            celebrate={!advancing}
            className="ruby-feedback--result"
            messageKey={
              advancing
                ? undefined
                : myQuestionResult?.correct && myQuestionResult.streak >= 2
                  ? 'ruby.streak'
                  : resultMood === 'surprised' && myQuestionResult?.answered
                    ? 'ruby.streakLost'
                    : undefined
            }
          />
          <h2 className="card__title">{t('game.questionClosedTitle')}</h2>

          <div
            className="correct-answer-banner"
            data-testid="correct-answer-reveal"
          >
            {t('game.correctAnswerWas', {
              answer:
                liveState.currentQuestion?.options[
                  liveState.lastClosed.correctOption
                ] ?? String(liveState.lastClosed.correctOption + 1),
            })}
          </div>

          {liveState.lastClosed.explanation && (
            <div
              className="answer-explanation"
              data-testid="answer-explanation"
            >
              <strong>{t('game.explanationTitle')}</strong>
              <p>{liveState.lastClosed.explanation}</p>
            </div>
          )}

          {nextInSeconds !== null && (
            <p
              className="auto-advance-note"
              role="status"
              data-testid="auto-advance-countdown"
            >
              {t('game.nextIn', { seconds: nextInSeconds })}
            </p>
          )}

          {!isHost && myQuestionResult && (
            <div
              className={`personal-result ${
                myQuestionResult.correct
                  ? 'personal-result--right'
                  : 'personal-result--wrong'
              }`}
              data-testid="personal-question-result"
            >
              <div>
                {!myQuestionResult.answered
                  ? t('game.didNotAnswer')
                  : myQuestionResult.correct
                    ? t('game.youAnsweredRight', {
                        points: myQuestionResult.pointsAwarded,
                      })
                    : t('game.youAnsweredWrong')}
              </div>

              {myQuestionResult.answered &&
                elapsedSecondsFormatted !== null && (
                  <div
                    className="personal-result__meta"
                    data-testid="response-elapsed-time"
                  >
                    {t('game.elapsedSeconds', {
                      seconds: elapsedSecondsFormatted,
                    })}
                  </div>
                )}

              {myQuestionResult.correct && (
                <div
                  className="personal-result__breakdown"
                  data-testid="points-breakdown"
                >
                  {t('game.pointsBreakdown', {
                    points: myQuestionResult.pointsAwarded,
                    total: myQuestionResult.totalScore,
                  })}
                </div>
              )}

              {myQuestionResult.streak >= 2 && (
                <div className="streak-badge" data-testid="streak-badge">
                  {t('game.streakBadge', { streak: myQuestionResult.streak })}
                </div>
              )}
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

          {movedDown && (
            <RubyFeedback
              mood="motivate"
              className="ruby-feedback--ranking"
              messageKey="ruby.rankDropped"
            />
          )}

          {isHost && (
            <div className="host-actions">
              <button
                type="button"
                data-testid="btn-next-question"
                className="btn btn--primary btn--lg"
                onClick={handleNextQuestion}
                disabled={advancing || connectionState !== 'connected'}
              >
                {t('game.nextQuestionBtn')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SESSION FINISHED */}
      {liveState.status === 'finished' && (
        <section
          className="card finished-card"
          data-testid="session-finished-view"
        >
          <RubyFeedback
            mood={podiumMood}
            celebrate
            className="ruby-feedback--finish"
            messageKey={podiumMood === 'sad' ? 'ruby.nearPodium' : undefined}
          />
          <h2 className="card__title">{t('game.finalRankingTitle')}</h2>

          <ol
            className="ranking-list ranking-list--final"
            data-testid="final-ranking-list"
          >
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
