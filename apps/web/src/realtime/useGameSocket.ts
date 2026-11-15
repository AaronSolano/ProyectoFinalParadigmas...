import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAppEnv } from '../config/env';
import type {
  AnswerAcceptedEvent,
  AnswerRejectedEvent,
  AnswerRejectedReason,
  GameSessionStatus,
  LiveCurrentQuestion,
  LiveErrorEvent,
  LiveParticipant,
  LiveRankingEntry,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
  QuestionClosedEvent,
  QuestionOpenedEvent,
  SessionFinishedEvent,
  SessionStartedEvent,
  StateSyncEvent,
} from '../api/events';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'unauthorized';

export interface GameLiveState {
  code: string;
  status: GameSessionStatus;
  isHost: boolean;
  participantId: string | null;
  participants: LiveParticipant[];
  totalQuestions: number;
  currentQuestion: LiveCurrentQuestion | null;
  closesAt: string | null;
  clockOffsetMs: number;
  myScore: number;
  hasAnswered: boolean;
  answerAccepted: boolean;
  rejectedReason: AnswerRejectedReason | null;
  lastClosed: QuestionClosedEvent | null;
  ranking: LiveRankingEntry[];
  lastError: string | null;
}

export function createInitialGameLiveState(code: string, isHostHint = false): GameLiveState {
  return {
    code,
    status: 'waiting',
    isHost: isHostHint,
    participantId: null,
    participants: [],
    totalQuestions: 0,
    currentQuestion: null,
    closesAt: null,
    clockOffsetMs: 0,
    myScore: 0,
    hasAnswered: false,
    answerAccepted: false,
    rejectedReason: null,
    lastClosed: null,
    ranking: [],
    lastError: null,
  };
}

export function computeClockOffsetMs(serverTimeIso: string, localNowMs = Date.now()): number {
  const parsed = Date.parse(serverTimeIso);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed - localNowMs;
}

export function applyStateSync(
  _prev: GameLiveState,
  payload: StateSyncEvent,
  localNowMs = Date.now(),
): GameLiveState {
  const uniqueParticipants = new Map<string, LiveParticipant>();
  for (const p of payload.participants) {
    uniqueParticipants.set(p.id, p);
  }

  return {
    code: payload.code,
    status: payload.status,
    isHost: payload.isHost,
    participantId: payload.participantId,
    participants: Array.from(uniqueParticipants.values()),
    totalQuestions: payload.totalQuestions,
    currentQuestion: payload.currentQuestion,
    closesAt: payload.closesAt,
    clockOffsetMs: computeClockOffsetMs(payload.serverTime, localNowMs),
    myScore: payload.myScore,
    hasAnswered: payload.hasAnswered,
    answerAccepted: payload.hasAnswered,
    rejectedReason: null,
    lastClosed: payload.lastClosed ?? null,
    ranking: payload.ranking ?? payload.lastClosed?.ranking ?? [],
    lastError: null,
  };
}

export function useGameSocket(code: string, token: string | null, isHostHint = false) {
  const [liveState, setLiveState] = useState<GameLiveState>(() =>
    createInitialGameLiveState(code, isHostHint),
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    if (!token) {
      setConnectionState('unauthorized');
      setLiveState((prev) => ({ ...prev, lastError: 'UNAUTHORIZED' }));
      return;
    }

    const { kahootApiUrl } = getAppEnv();
    const socket = io(`${kahootApiUrl}/game`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('session:join', { code: normalizedCode });
    });

    socket.on('disconnect', () => {
      setConnectionState('reconnecting');
    });

    socket.on('connect_error', (err: Error) => {
      if (err?.message === 'unauthorized') {
        setConnectionState('unauthorized');
        setLiveState((prev) => ({ ...prev, lastError: 'UNAUTHORIZED' }));
      } else {
        setConnectionState('reconnecting');
      }
    });

    socket.on('state_sync', (payload: StateSyncEvent) => {
      setConnectionState('connected');
      setLiveState((prev) => applyStateSync(prev, payload, Date.now()));
    });

    socket.on('participant:joined', (payload: ParticipantJoinedEvent) => {
      setLiveState((prev) => {
        const exists = prev.participants.some((p) => p.id === payload.participant.id);
        if (exists) {
          return prev;
        }
        return {
          ...prev,
          participants: [...prev.participants, payload.participant],
        };
      });
    });

    socket.on('participant:left', (payload: ParticipantLeftEvent) => {
      setLiveState((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== payload.participantId),
      }));
    });

    socket.on('session:started', (payload: SessionStartedEvent) => {
      setLiveState((prev) => ({
        ...prev,
        totalQuestions: payload.totalQuestions,
        lastError: null,
      }));
    });

    socket.on('question:opened', (payload: QuestionOpenedEvent) => {
      setLiveState((prev) => ({
        ...prev,
        status: 'question_open',
        totalQuestions: payload.total,
        currentQuestion: {
          questionIndex: payload.questionIndex,
          total: payload.total,
          statement: payload.statement,
          imageUrl: payload.imageUrl,
          closesAt: payload.closesAt,
        },
        closesAt: payload.closesAt,
        clockOffsetMs: computeClockOffsetMs(payload.serverTime, Date.now()),
        hasAnswered: false,
        answerAccepted: false,
        rejectedReason: null,
        lastClosed: null,
        lastError: null,
      }));
    });

    socket.on('answer:accepted', (_payload: AnswerAcceptedEvent) => {
      setLiveState((prev) => ({
        ...prev,
        hasAnswered: true,
        answerAccepted: true,
        rejectedReason: null,
      }));
    });

    socket.on('answer:rejected', (payload: AnswerRejectedEvent) => {
      setLiveState((prev) => ({
        ...prev,
        hasAnswered: payload.reason === 'already_answered' ? true : prev.hasAnswered,
        rejectedReason: payload.reason,
      }));
    });

    socket.on('question:closed', (payload: QuestionClosedEvent) => {
      setLiveState((prev) => {
        const myResult = prev.participantId
          ? payload.results.find((r) => r.participantId === prev.participantId)
          : undefined;
        return {
          ...prev,
          status: 'question_closed',
          closesAt: null,
          lastClosed: payload,
          ranking: payload.ranking,
          myScore: myResult !== undefined ? myResult.totalScore : prev.myScore,
          lastError: null,
        };
      });
    });

    socket.on('session:finished', (payload: SessionFinishedEvent) => {
      setLiveState((prev) => {
        const myRank = prev.participantId
          ? payload.ranking.find((r) => r.participantId === prev.participantId)
          : undefined;
        return {
          ...prev,
          status: 'finished',
          closesAt: null,
          ranking: payload.ranking,
          myScore: myRank !== undefined ? myRank.score : prev.myScore,
          lastError: null,
        };
      });
    });

    socket.on('error', (payload: LiveErrorEvent) => {
      setLiveState((prev) => ({
        ...prev,
        lastError: payload.code || payload.message,
      }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, token]);

  const normalizedCode = code.trim().toUpperCase();

  const startSession = useCallback(() => {
    socketRef.current?.emit('session:start', { code: normalizedCode });
  }, [normalizedCode]);

  const closeQuestion = useCallback(() => {
    socketRef.current?.emit('question:close', { code: normalizedCode });
  }, [normalizedCode]);

  const nextQuestion = useCallback(() => {
    socketRef.current?.emit('question:next', { code: normalizedCode });
  }, [normalizedCode]);

  const submitAnswer = useCallback(
    (questionIndex: number, answer: boolean) => {
      socketRef.current?.emit('answer:submit', {
        code: normalizedCode,
        questionIndex,
        answer,
      });
    },
    [normalizedCode],
  );

  const leaveSession = useCallback(() => {
    socketRef.current?.emit('session:leave', { code: normalizedCode });
  }, [normalizedCode]);

  const simulateReconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }
    setConnectionState('reconnecting');
    socket.disconnect();
    window.setTimeout(() => {
      socket.connect();
    }, 350);
  }, []);

  const clearError = useCallback(() => {
    setLiveState((prev) => ({ ...prev, lastError: null }));
  }, []);

  return {
    liveState,
    connectionState,
    startSession,
    closeQuestion,
    nextQuestion,
    submitAnswer,
    leaveSession,
    simulateReconnect,
    clearError,
  };
}
