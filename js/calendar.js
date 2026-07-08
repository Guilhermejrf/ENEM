import { getContentState, isCompletedStatus } from './storage.js';
import { getReviewsByDate } from './review.js';

export function createCalendarState(meta) {
  const start = meta.startDate ? new Date(`${meta.startDate}T00:00:00`) : new Date();
  const today = new Date();
  const base = today >= start ? today : start;
  return {
    year: base.getFullYear(),
    month: base.getMonth()
  };
}

export function shiftMonth(calendarState, amount) {
  const date = new Date(calendarState.year, calendarState.month + amount, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth()
  };
}

export function renderCalendar(container, contents, state, feriados, meta, calendarState) {
  const events = buildEvents(contents, state, feriados, meta);
  const reviews = getReviewsByDate(state);
  const first = new Date(calendarState.year, calendarState.month, 1);
  const last = new Date(calendarState.year, calendarState.month + 1, 0);
  const startOffset = first.getDay();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    const date = new Date(calendarState.year, calendarState.month, 1 - startOffset + i);
    cells.push({ date, muted: true });
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    cells.push({ date: new Date(calendarState.year, calendarState.month, day), muted: false });
  }

  while (cells.length % 7 !== 0) {
    const previous = cells[cells.length - 1].date;
    cells.push({ date: new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1), muted: true });
  }

  const title = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(first);
  container.innerHTML = `
    <div class="calendar-head">
      <span class="calendar-title">${title}</span>
    </div>
    <div class="calendar-grid">
      ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day) => `<span class="calendar-weekday">${day}</span>`).join('')}
      ${cells.map((cell) => renderDay(cell, events, reviews)).join('')}
    </div>
    <div class="calendar-legend">
      <span><i class="dot pending"></i>Pendente</span>
      <span><i class="dot done"></i>Estudado</span>
      <span><i class="dot review"></i>Revisão</span>
      <span><i class="dot simulado"></i>Simulado</span>
      <span><i class="dot exam"></i>Prova</span>
    </div>
  `;
}

function renderDay(cell, events, reviews) {
  const dateString = toDateString(cell.date);
  const dayEvents = events[dateString] || {};
  const dayReviews = reviews[dateString] || [];
  const today = toDateString(new Date());
  const classes = [
    'calendar-day',
    cell.muted ? 'is-muted' : '',
    dateString === today ? 'is-today' : ''
  ].filter(Boolean).join(' ');
  const dots = [];

  if (dayEvents.pending) dots.push('<i class="dot pending"></i>');
  if (dayEvents.done) dots.push('<i class="dot done"></i>');
  if (dayReviews.some((review) => !review.done)) dots.push('<i class="dot review"></i>');
  if (dayEvents.simulado) dots.push('<i class="dot simulado"></i>');
  if (dayEvents.exam) dots.push('<i class="dot exam"></i>');
  if (dayEvents.holiday && !dots.length) dots.push('<i class="dot study"></i>');

  const title = [
    dayEvents.pending ? `${dayEvents.pending} pendente(s)` : '',
    dayEvents.done ? `${dayEvents.done} concluído(s)` : '',
    dayReviews.length ? `${dayReviews.length} revisão(ões)` : '',
    dayEvents.simulado ? 'simulado' : '',
    dayEvents.exam ? 'prova' : '',
    dayEvents.holiday || ''
  ].filter(Boolean).join(' · ');

  return `
    <div class="${classes}" title="${escapeHtml(title)}">
      <strong>${cell.date.getDate()}</strong>
      <span class="calendar-dots">${dots.join('')}</span>
    </div>
  `;
}

function buildEvents(contents, state, feriados, meta) {
  const map = {};
  const holidayMap = Object.fromEntries((feriados || []).map((holiday) => [holiday.date, holiday.name]));

  for (const content of contents) {
    const date = content.scheduledDate;
    if (!map[date]) map[date] = { pending: 0, done: 0, simulado: false, exam: false, holiday: holidayMap[date] || '' };
    const status = getContentState(state, content.id).status;
    if (isCompletedStatus(status)) map[date].done += 1;
    else if (content.tipo !== 'descanso') map[date].pending += 1;
    if (content.tipo === 'simulado') map[date].simulado = true;
    if (content.tipo === 'prova') map[date].exam = true;
  }

  for (const holiday of feriados || []) {
    if (!holiday.date) continue;
    if (!map[holiday.date]) map[holiday.date] = { pending: 0, done: 0, simulado: false, exam: false, holiday: holiday.name };
    map[holiday.date].holiday = holiday.name;
  }

  for (const date of [meta.enem.day1, meta.enem.day2, meta.ifpe.examDate]) {
    if (!map[date]) map[date] = { pending: 0, done: 0, simulado: false, exam: true, holiday: '' };
    map[date].exam = true;
  }

  return map;
}

function toDateString(date) {
  const fixed = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return fixed.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
