import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quiz } from '../api/client';

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
export function matchesQuiz(quiz: Quiz, search: string) {
  return normalizeSearch(`${quiz.title} ${quiz.description ?? ''}`).includes(
    normalizeSearch(search),
  );
}
export function categoryLabel(category: string, t: (key: string) => string) {
  return category === 'Cultura general'
    ? t('features.general')
    : category === 'Tecnología'
      ? t('features.technology')
      : category;
}
export function QuizFilters({
  search,
  onSearch,
  count,
  category,
  onCategory,
  categories = [],
}: {
  search: string;
  onSearch: (value: string) => void;
  count: number;
  category?: string;
  onCategory?: (value: string) => void;
  categories?: string[];
}) {
  const { t } = useTranslation();
  const id = useId();
  const clear = () => {
    onSearch('');
    onCategory?.('');
  };
  return (
    <div
      className="quiz-filters"
      role="search"
      aria-label={t('features.search')}
    >
      <div className="form-field">
        <label htmlFor={`${id}-search`}>{t('features.search')}</label>
        <input
          id={`${id}-search`}
          type="search"
          data-testid="input-quiz-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {onCategory && (
        <div className="form-field">
          <label htmlFor={`${id}-category`}>{t('features.category')}</label>
          <select
            id={`${id}-category`}
            value={category}
            data-testid="filter-category"
            onChange={(e) => onCategory(e.target.value)}
          >
            <option value="">{t('features.all')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c, t)}
              </option>
            ))}
          </select>
        </div>
      )}
      <p role="status" aria-live="polite">
        {t('features.results', { count })}
      </p>
      {count === 0 && (search || category) && <p>{t('features.noResults')}</p>}
      {(search || category) && (
        <button className="btn btn--ghost" type="button" onClick={clear}>
          {t('features.clear')}
        </button>
      )}
    </div>
  );
}
