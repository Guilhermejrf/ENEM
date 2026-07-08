import { STATUS, STATUS_LABELS, getContentState, isCompletedStatus } from './storage.js';

const TYPE_LABELS = {
  estudo: 'Estudo',
  redacao: 'Redação',
  simulado: 'Simulado',
  revisao: 'Revisão',
  questoes: 'Questões',
  prova: 'Prova',
  descanso: 'Descanso'
};

export function renderPlanner(container, contents, state, filters, disciplineMap) {
  const filtered = filterContents(contents, state, filters);
  const count = document.getElementById('resultCount');
  if (count) count.textContent = `${filtered.length.toLocaleString('pt-BR')} itens`;

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">Nenhum conteúdo encontrado.</div>';
    return;
  }

  const weeks = groupBy(filtered, (content) => content.semana || 0);
  const today = new Date().toISOString().slice(0, 10);
  container.innerHTML = Object.entries(weeks).map(([weekNumber, weekItems], index) => {
    const weekTitle = weekItems[0].semanaTitulo || `Semana ${weekNumber}`;
    const weekProgress = getWeekProgress(weekItems, state);
    const dates = groupBy(weekItems, (content) => content.scheduledDate);
    const hasToday = weekItems.some((content) => content.scheduledDate === today);
    const open = hasToday || index === 0 || filters.filter !== 'todos';

    return `
      <details class="week" ${open ? 'open' : ''}>
        <summary>
          <div class="week-title">
            <h3>${escapeHtml(weekTitle)}</h3>
            <span>${weekItems.length} itens</span>
          </div>
          <div class="week-progress" aria-label="${weekProgress}% concluído">
            <div class="mini-track"><div class="mini-fill" style="width:${weekProgress}%"></div></div>
            <span class="mini-pct">${weekProgress}%</span>
          </div>
        </summary>
        <div class="days">
          ${Object.entries(dates).map(([date, dayItems]) => renderDay(date, dayItems, state, disciplineMap)).join('')}
        </div>
      </details>
    `;
  }).join('');
}

export function filterContents(contents, state, filters) {
  const query = normalize(filters.query || '');
  return contents.filter((content) => {
    const status = getContentState(state, content.id).status;
    const done = isCompletedStatus(status);
    const haystack = normalize(`${content.titulo} ${content.disciplina} ${content.tema} ${content.area}`);

    if (query && !haystack.includes(query)) return false;
    if (filters.filter === 'pendentes' && done) return false;
    if (filters.filter === 'concluidos' && !done) return false;
    if (filters.filter === 'revisoes' && content.tipo !== 'revisao') return false;
    if (filters.filter === 'redacoes' && content.tipo !== 'redacao' && content.disciplina !== 'Redação') return false;
    if (filters.filter === 'simulados' && content.tipo !== 'simulado') return false;
    return true;
  });
}

function renderDay(date, items, state, disciplineMap) {
  return `
    <section class="day-group" data-day-date="${date}">
      <div class="day-header">
        <strong>${formatDate(date)}</strong>
        <span>${items[0].diaSemana || ''} · ${items.length} tarefa${items.length === 1 ? '' : 's'}</span>
      </div>
      <div class="cards-grid">
        ${items.map((content) => renderCard(content, state, disciplineMap)).join('')}
      </div>
    </section>
  `;
}

function renderCard(content, state, disciplineMap) {
  const itemState = getContentState(state, content.id);
  const status = itemState.status || STATUS.notStarted;
  const done = isCompletedStatus(status);
  const color = (disciplineMap.get(content.disciplina) || {}).color || '#6d48a0';
  const source = content.source === 'generated'
    ? 'Gerado pela estratégia'
    : content.originalDate && content.originalDate !== content.scheduledDate
      ? `Original: ${formatDate(content.originalDate)}`
      : 'Original preservado';

  return `
    <article class="study-card ${done ? 'is-done' : ''}" style="--card-color:${color};--pill-color:${color}" data-content-id="${content.id}">
      <label class="check-wrap">
        <input class="content-check" type="checkbox" data-content-id="${content.id}" ${done ? 'checked' : ''} aria-label="Concluir ${escapeHtml(content.titulo)}">
      </label>
      <div class="card-main">
        <div class="card-topline">
          <span class="pill">${escapeHtml(content.disciplina)}</span>
          <span class="priority ${content.prioridade}">${escapeHtml(content.prioridade)}</span>
          <span class="type-badge">${escapeHtml(TYPE_LABELS[content.tipo] || content.tipo)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(content.titulo)}</h3>
        <div class="card-meta">
          <span>${escapeHtml(content.tema)}</span>
          <span>${escapeHtml(content.tempoEstimadoTexto)}</span>
          <span>${content.questoes} questões</span>
          <span>Peso ${content.pesoEnem}/5</span>
        </div>
        <div class="card-actions">
          <select class="status-select" data-content-id="${content.id}" aria-label="Status">
            ${Object.entries(STATUS_LABELS).map(([value, label]) => `
              <option value="${value}" ${value === status ? 'selected' : ''}>${label}</option>
            `).join('')}
          </select>
          <span class="source-note">${escapeHtml(source)}</span>
        </div>
      </div>
    </article>
  `;
}

function getWeekProgress(items, state) {
  const tracked = items.filter((content) => content.tipo !== 'descanso');
  const done = tracked.filter((content) => isCompletedStatus(getContentState(state, content.id).status));
  return tracked.length ? Math.round((done.length / tracked.length) * 100) : 0;
}

function groupBy(items, getKey) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${dateString}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
