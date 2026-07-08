import { STATUS, isCompletedStatus } from './storage.js';

export function toDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const fixed = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return fixed.toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${dateString}T00:00:00`));
}

export function ensureReviewsForContent(state, content, offsets = [1, 7, 30]) {
  const progress = state.progress[content.id];
  if (!progress || !isCompletedStatus(progress.status)) return state;

  const baseDate = toDateString(progress.completedAt || new Date());
  const existing = new Set(state.revisions.map((review) => review.id));
  const additions = offsets
    .map((offset) => ({
      id: `${content.id}-r${offset}`,
      contentId: content.id,
      title: content.titulo,
      discipline: content.disciplina,
      dueDate: addDays(baseDate, offset),
      offset,
      done: false,
      createdAt: new Date().toISOString()
    }))
    .filter((review) => !existing.has(review.id));

  if (!additions.length) return state;
  return {
    ...state,
    revisions: [...state.revisions, ...additions]
  };
}

export function removePendingReviewsForContent(state, contentId) {
  return {
    ...state,
    revisions: state.revisions.filter((review) => review.contentId !== contentId || review.done)
  };
}

export function toggleReviewDone(state, reviewId, done) {
  const revisions = state.revisions.map((review) => (
    review.id === reviewId
      ? { ...review, done, doneAt: done ? new Date().toISOString() : '' }
      : review
  ));

  const changed = revisions.find((review) => review.id === reviewId);
  if (!changed || !done) return { ...state, revisions };

  const hasOpenReviews = revisions.some((review) => (
    review.contentId === changed.contentId && !review.done
  ));

  if (hasOpenReviews) return { ...state, revisions };

  const progress = {
    ...state.progress,
    [changed.contentId]: {
      ...(state.progress[changed.contentId] || {}),
      status: STATUS.reviewed,
      reviewedAt: new Date().toISOString()
    }
  };

  return { ...state, revisions, progress };
}

export function getUpcomingReviews(state, limit = 8) {
  return [...state.revisions]
    .filter((review) => !review.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

export function getReviewsByDate(state) {
  return state.revisions.reduce((map, review) => {
    if (!map[review.dueDate]) map[review.dueDate] = [];
    map[review.dueDate].push(review);
    return map;
  }, {});
}

export function renderReviewList(container, state) {
  const reviews = getUpcomingReviews(state, 9);
  if (!reviews.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma revisão pendente.</div>';
    return;
  }

  container.innerHTML = reviews.map((review) => `
    <label class="review-item">
      <input class="review-check" type="checkbox" data-review-id="${review.id}">
      <span>
        <strong>${escapeHtml(review.title)}</strong>
        <span>${escapeHtml(review.discipline)} · ${formatDate(review.dueDate)} · D+${review.offset}</span>
      </span>
    </label>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
