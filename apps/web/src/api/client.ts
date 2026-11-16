import type { components as AuthComponents } from './generated/auth-api';
import type { components as KahootComponents } from './generated/kahoot-api';
import { getAppEnv } from '../config/env';
import { getStoredToken, notifySessionExpired } from '../auth/storage';

export type Guest = AuthComponents['schemas']['GuestResponse']['guest'];
export type SessionProfile = Profile | (Guest & { guest: true });
export type Profile = AuthComponents['schemas']['Profile'];
export type RegisterRequest = AuthComponents['schemas']['RegisterRequest'];
export type LoginRequest = AuthComponents['schemas']['LoginRequest'];
export type AuthResponse = AuthComponents['schemas']['AuthResponse'];
export type AuthProblem = AuthComponents['schemas']['Problem'];

export type Quiz = KahootComponents['schemas']['Quiz'];
export type QuizInput = KahootComponents['schemas']['QuizInput'];
export type Question = KahootComponents['schemas']['Question'];
export type QuestionInput = KahootComponents['schemas']['QuestionInput'];
export type Session = KahootComponents['schemas']['Session'];
export type SessionInput = KahootComponents['schemas']['SessionInput'];
export type JoinInput = KahootComponents['schemas']['JoinInput'];
export type Participant = KahootComponents['schemas']['Participant'];
export type SessionResults = KahootComponents['schemas']['SessionResults'];
export type RankingEntry = KahootComponents['schemas']['RankingEntry'];
export type KahootProblem = KahootComponents['schemas']['Problem'];

export class ApiProblemError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Array<{ field?: string; message?: string }>;

  constructor(problem: {
    status: number;
    code: string;
    message: string;
    details?: Array<{ field?: string; message?: string }>;
  }) {
    super(problem.message);
    this.name = 'ApiProblemError';
    this.status = problem.status;
    this.code = problem.code;
    this.details = problem.details;
  }
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiProblemError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network error while connecting to server.',
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && requiresAuth) {
      notifySessionExpired();
    }

    const problem = (data ?? {}) as Partial<KahootProblem>;
    const fallbackCode =
      response.status === 401
        ? requiresAuth
          ? 'SESSION_EXPIRED'
          : 'UNAUTHORIZED'
        : response.status === 403
          ? 'FORBIDDEN'
          : response.status === 404
            ? 'NOT_FOUND'
            : response.status === 413
              ? 'IMAGE_TOO_LARGE'
              : response.status === 415
                ? 'IMAGE_UNSUPPORTED'
                : 'INTERNAL_ERROR';

    throw new ApiProblemError({
      status: problem.status ?? response.status,
      code: problem.code ?? fallbackCode,
      message: problem.message ?? `HTTP ${response.status}`,
      details: problem.details,
    });
  }

  return data as T;
}

export const authApi = {
  guest(displayName: string): Promise<AuthComponents['schemas']['GuestResponse']> {
    return requestJson(getAppEnv().authApiUrl, '/auth/guest', {
      method: 'POST', body: JSON.stringify({ displayName }),
    }, false);
  },
  register(input: RegisterRequest): Promise<AuthResponse> {
    const { authApiUrl } = getAppEnv();
    return requestJson<AuthResponse>(
      authApiUrl,
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      false,
    );
  },

  login(input: LoginRequest): Promise<AuthResponse> {
    const { authApiUrl } = getAppEnv();
    return requestJson<AuthResponse>(
      authApiUrl,
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      false,
    );
  },

  me(): Promise<Profile> {
    const { authApiUrl } = getAppEnv();
    return requestJson<Profile>(authApiUrl, '/auth/me', { method: 'GET' }, true);
  },
};

export const kahootApi = {
  listQuizzes(): Promise<Quiz[]> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Quiz[]>(kahootApiUrl, '/quizzes', { method: 'GET' });
  },

  createQuiz(input: QuizInput): Promise<Quiz> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Quiz>(kahootApiUrl, '/quizzes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getQuiz(quizId: string): Promise<Quiz> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Quiz>(kahootApiUrl, `/quizzes/${quizId}`, { method: 'GET' });
  },

  updateQuiz(quizId: string, input: QuizInput): Promise<Quiz> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Quiz>(kahootApiUrl, `/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deleteQuiz(quizId: string): Promise<void> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<void>(kahootApiUrl, `/quizzes/${quizId}`, { method: 'DELETE' });
  },

  listQuestions(quizId: string): Promise<Question[]> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Question[]>(kahootApiUrl, `/quizzes/${quizId}/questions`, {
      method: 'GET',
    });
  },

  listLibrary(): Promise<Quiz[]> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Quiz[]>(kahootApiUrl, '/library', { method: 'GET' });
  },

  listLibraryQuestions(quizId: string): Promise<Question[]> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Question[]>(kahootApiUrl, `/library/${quizId}/questions`, { method: 'GET' });
  },

  copyLibraryQuiz(quizId: string): Promise<Quiz> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Quiz>(kahootApiUrl, `/library/${quizId}/copy`, { method: 'POST' });
  },

  createQuestion(quizId: string, input: QuestionInput): Promise<Question> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Question>(kahootApiUrl, `/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateQuestion(quizId: string, questionId: string, input: QuestionInput): Promise<Question> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Question>(
      kahootApiUrl,
      `/quizzes/${quizId}/questions/${questionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    );
  },

  deleteQuestion(quizId: string, questionId: string): Promise<void> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<void>(kahootApiUrl, `/quizzes/${quizId}/questions/${questionId}`, {
      method: 'DELETE',
    });
  },

  uploadQuestionImage(quizId: string, questionId: string, file: File): Promise<Question> {
    const { kahootApiUrl } = getAppEnv();
    const formData = new FormData();
    formData.append('file', file);
    return requestJson<Question>(
      kahootApiUrl,
      `/quizzes/${quizId}/questions/${questionId}/image`,
      {
        method: 'PUT',
        body: formData,
      },
    );
  },

  deleteQuestionImage(quizId: string, questionId: string): Promise<Question> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Question>(
      kahootApiUrl,
      `/quizzes/${quizId}/questions/${questionId}/image`,
      {
        method: 'DELETE',
      },
    );
  },

  listSessions(): Promise<Session[]> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Session[]>(kahootApiUrl, '/sessions', { method: 'GET' });
  },

  createSession(input: SessionInput): Promise<Session> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Session>(kahootApiUrl, '/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getSession(code: string): Promise<Session> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Session>(kahootApiUrl, `/sessions/${encodeURIComponent(code)}`, {
      method: 'GET',
    });
  },

  joinSession(code: string, input?: JoinInput): Promise<Participant> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Participant>(kahootApiUrl, `/sessions/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: input ? JSON.stringify(input) : JSON.stringify({}),
    });
  },

  listParticipants(code: string): Promise<Participant[]> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<Participant[]>(
      kahootApiUrl,
      `/sessions/${encodeURIComponent(code)}/participants`,
      {
        method: 'GET',
      },
    );
  },

  getSessionResults(code: string): Promise<SessionResults> {
    const { kahootApiUrl } = getAppEnv();
    return requestJson<SessionResults>(
      kahootApiUrl,
      `/sessions/${encodeURIComponent(code)}/results`,
      {
        method: 'GET',
      },
    );
  },
};
