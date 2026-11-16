import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../i18n';
import { kahootApi, type Question, type Quiz } from '../api/client';
import { LibraryPage } from '../pages/LibraryPage';
import { QuizQuestionsPage } from '../pages/QuizQuestionsPage';

function renderAt(path: string, element: React.ReactElement, route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const quiz = (over: Partial<Quiz> = {}): Quiz => ({
  id: 'quiz-1',
  ownerId: 'owner',
  title: 'Geografía del mundo',
  description: 'Países y capitales',
  category: 'Cultura general',
  isLibrary: true,
  questionCount: 10,
  createdAt: '2026-11-10T14:00:00.000Z',
  updatedAt: '2026-11-10T14:00:00.000Z',
  ...over,
});

describe('opciones múltiples y biblioteca', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('el formulario permite de 2 a 4 opciones, marcar la correcta y enviarlas', async () => {
    vi.spyOn(kahootApi, 'getQuiz').mockResolvedValue(quiz({ isLibrary: false, category: null }));
    vi.spyOn(kahootApi, 'listQuestions').mockResolvedValue([]);
    const create = vi.spyOn(kahootApi, 'createQuestion').mockResolvedValue({} as Question);

    renderAt('/quizzes/quiz-1/questions', <QuizQuestionsPage />, '/quizzes/:quizId/questions');

    const statement = await screen.findByRole('textbox', { name: /enunciado/i });
    fireEvent.change(statement, { target: { value: '¿Capital de Costa Rica?' } });

    expect(screen.queryByTestId('btn-remove-option-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-add-option'));
    fireEvent.click(screen.getByTestId('btn-add-option'));
    expect(screen.queryByTestId('btn-add-option')).not.toBeInTheDocument();

    ['Alajuela', 'San José', 'Cartago', 'Heredia'].forEach((text, index) =>
      fireEvent.change(screen.getByTestId(`input-option-${index}`), { target: { value: text } }),
    );
    fireEvent.click(screen.getByTestId('radio-correct-1'));
    fireEvent.click(screen.getByTestId('btn-save-question'));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith('quiz-1', {
      statement: '¿Capital de Costa Rica?',
      options: ['Alajuela', 'San José', 'Cartago', 'Heredia'],
      correctOption: 1,
    });
  });

  it('quitar una opción por encima de la correcta mantiene marcada la misma opción', async () => {
    vi.spyOn(kahootApi, 'getQuiz').mockResolvedValue(quiz({ isLibrary: false, category: null }));
    vi.spyOn(kahootApi, 'listQuestions').mockResolvedValue([]);
    renderAt('/quizzes/quiz-1/questions', <QuizQuestionsPage />, '/quizzes/:quizId/questions');

    await screen.findByTestId('btn-add-option');
    fireEvent.click(screen.getByTestId('btn-add-option'));
    fireEvent.click(screen.getByTestId('radio-correct-2'));
    fireEvent.click(screen.getByTestId('btn-remove-option-0'));

    expect(screen.getByTestId('radio-correct-1')).toBeChecked();
    expect(screen.queryByTestId('input-option-2')).not.toBeInTheDocument();
  });

  it('la biblioteca agrupa por categoría, muestra las respuestas correctas y copia a mi cuenta', async () => {
    vi.spyOn(kahootApi, 'listLibrary').mockResolvedValue([
      quiz(),
      quiz({ id: 'quiz-2', title: 'Internet y redes', category: 'Tecnología' }),
    ]);
    vi.spyOn(kahootApi, 'listLibraryQuestions').mockResolvedValue([
      {
        id: 'q-1',
        quizId: 'quiz-1',
        statement: '¿Cuál es la capital de Australia?',
        options: ['Sídney', 'Melbourne', 'Canberra', 'Perth'],
        correctOption: 2,
        imageUrl: null,
        position: 1,
        createdAt: '2026-11-10T14:00:00.000Z',
        updatedAt: '2026-11-10T14:00:00.000Z',
      },
    ]);
    const copy = vi.spyOn(kahootApi, 'copyLibraryQuiz').mockResolvedValue(quiz({ isLibrary: false }));

    renderAt('/library', <LibraryPage />, '/library');

    expect(await screen.findByText('Cultura general')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /ver preguntas/i })[0]!);
    const list = await screen.findByTestId('library-questions-quiz-1');
    expect(list).toHaveTextContent('Canberra ✓');

    fireEvent.click(screen.getByTestId('btn-copy-library-quiz-1'));
    await waitFor(() => expect(copy).toHaveBeenCalledWith('quiz-1'));
    expect(await screen.findByTestId('library-copied')).toBeInTheDocument();
  });
});
