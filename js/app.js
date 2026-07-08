import { renderCalendar, createCalendarState, shiftMonth } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { renderPlanner } from './planner.js';
import { summarize } from './progress.js';
import {
  STATUS,
  getContentState,
  isCompletedStatus,
  loadState,
  replaceState,
  saveState,
  setContentStatus
} from './storage.js';
import {
  ensureReviewsForContent,
  removePendingReviewsForContent,
  renderReviewList,
  toggleReviewDone
} from './review.js';
import {
  hasSyncConfig,
  hydrateSyncForm,
  mergeSyncedState,
  pullStateFromGist,
  pushStateToGist,
  readSyncSettings,
  setSyncStatus
} from './sync.js';

const AUTO_SYNC_DELAY = 1800;
const AUTO_SYNC_INTERVAL = 120000;
const DATA_VERSION = 'ifpe-20260708-v1';

let autoSyncTimer = null;
let periodicSyncTimer = null;

const app = {
  contents: [],
  disciplinas: [],
  feriados: [],
  meta: {},
  state: loadState(),
  filters: {
    query: '',
    filter: 'todos'
  },
  calendar: null,
  disciplineMap: new Map()
};

init();

async function init() {
  try {
    const [cronograma, disciplinas, feriados] = await Promise.all([
      loadJSON('data/cronograma.json'),
      loadJSON('data/disciplinas.json'),
      loadJSON('data/feriados.json')
    ]);

    app.contents = cronograma.conteudos;
    app.meta = cronograma.meta;
    app.disciplinas = disciplinas;
    app.feriados = feriados;
    app.disciplineMap = new Map(disciplinas.map((disciplina) => [disciplina.nome, disciplina]));
    app.calendar = createCalendarState(app.meta);
    applyBaselineProgress();

    applyTheme(app.state.settings.theme);
    hydrateSyncForm(app.state);
    bindEvents();
    render();
    registerServiceWorker();
    setupInstallPrompt();
    startAutoSync();
    autoPullProgress();
  } catch (error) {
    document.body.innerHTML = `<main class="app-shell"><div class="empty-state">Não foi possível carregar o planner: ${escapeHtml(error.message)}</div></main>`;
  }
}

async function loadJSON(path) {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${path}${separator}v=${DATA_VERSION}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path} respondeu ${response.status}`);
  return response.json();
}

function bindEvents() {
  document.getElementById('plannerWeeks')?.addEventListener('change', handlePlannerChange);
  document.getElementById('reviewList')?.addEventListener('change', handleReviewChange);
  document.getElementById('searchInput')?.addEventListener('input', handleSearch);
  document.getElementById('filterGroup')?.addEventListener('click', handleFilter);
  document.getElementById('prevMonth')?.addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonth')?.addEventListener('click', () => changeMonth(1));
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('jumpToday')?.addEventListener('click', jumpToToday);
  document.getElementById('syncForm')?.addEventListener('submit', saveSyncConfig);
  document.getElementById('syncPush')?.addEventListener('click', pushSync);
  document.getElementById('syncPull')?.addEventListener('click', pullSync);
}

function render() {
  renderDashboard(document.getElementById('dashboard'), app.contents, app.state, app.meta);
  renderPlanner(document.getElementById('plannerWeeks'), app.contents, app.state, app.filters, app.disciplineMap);
  renderCalendar(document.getElementById('calendar'), app.contents, app.state, app.feriados, app.meta, app.calendar);
  renderReviewList(document.getElementById('reviewList'), app.state);
}

function persistAndRender() {
  app.state = saveState(app.state);
  render();
  queueAutoSync();
}

function handlePlannerChange(event) {
  const contentId = event.target.dataset.contentId;
  if (!contentId) return;

  const content = app.contents.find((item) => item.id === contentId);
  if (!content) return;

  if (event.target.classList.contains('content-check')) {
    const status = event.target.checked ? STATUS.done : STATUS.notStarted;
    updateContent(content, status);
  }

  if (event.target.classList.contains('status-select')) {
    updateContent(content, event.target.value);
  }
}

function updateContent(content, status) {
  app.state = setContentStatus(app.state, content, status);
  const currentStatus = getContentState(app.state, content.id).status;

  if (isCompletedStatus(currentStatus)) {
    app.state = ensureReviewsForContent(app.state, content, app.meta.reviewOffsets);
  } else {
    app.state = removePendingReviewsForContent(app.state, content.id);
  }

  persistAndRender();
}

function handleReviewChange(event) {
  const reviewId = event.target.dataset.reviewId;
  if (!reviewId) return;

  app.state = toggleReviewDone(app.state, reviewId, event.target.checked);
  persistAndRender();
}

function handleSearch(event) {
  app.filters.query = event.target.value;
  renderPlanner(document.getElementById('plannerWeeks'), app.contents, app.state, app.filters, app.disciplineMap);
}

function handleFilter(event) {
  const button = event.target.closest('[data-filter]');
  if (!button) return;

  app.filters.filter = button.dataset.filter;
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip === button);
  });
  renderPlanner(document.getElementById('plannerWeeks'), app.contents, app.state, app.filters, app.disciplineMap);
}

function changeMonth(amount) {
  app.calendar = shiftMonth(app.calendar, amount);
  renderCalendar(document.getElementById('calendar'), app.contents, app.state, app.feriados, app.meta, app.calendar);
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  app.state = {
    ...app.state,
    settings: {
      ...app.state.settings,
      theme: next
    }
  };
  applyTheme(next);
  persistAndRender();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

function jumpToToday() {
  const today = new Date().toISOString().slice(0, 10);
  let target = document.querySelector(`[data-day-date="${today}"]`);

  if (!target) {
    const futureDays = [...document.querySelectorAll('[data-day-date]')];
    target = futureDays.find((element) => element.dataset.dayDate >= today) || futureDays.at(-1);
  }

  if (!target) return;
  const details = target.closest('details');
  if (details) details.open = true;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.animate([
    { outline: '2px solid transparent' },
    { outline: '2px solid var(--pink)' },
    { outline: '2px solid transparent' }
  ], { duration: 1600, easing: 'ease-out' });
}

function saveSyncConfig(event) {
  event.preventDefault();
  const settings = readSyncSettings();
  app.state = {
    ...app.state,
    settings: {
      ...app.state.settings,
      ...settings
    }
  };
  app.state = saveState(app.state);
  setSyncStatus('Configuração salva.');
  startAutoSync();
  if (hasSyncConfig(app.state)) autoPullProgress();
}

async function pushSync() {
  try {
    app.state = saveState(app.state);
    setSyncStatus('Enviando...');
    await pushStateToGist(app.state);
    app.state = {
      ...app.state,
      settings: {
        ...app.state.settings,
        lastSync: new Date().toISOString(),
        lastPush: new Date().toISOString()
      }
    };
    app.state = saveState(app.state);
    setSyncStatus('Progresso enviado.');
  } catch (error) {
    setSyncStatus(error.message, 'error');
  }
}

async function pullSync() {
  try {
    const settings = readSyncSettings();
    setSyncStatus('Baixando...');
    const remote = await pullStateFromGist(settings);
    app.state = replaceState(mergeSyncedState(app.state, {
      ...remote,
      settings: {
        ...(remote.settings || {}),
        ...settings
      }
    }));
    applyBaselineProgress();
    app.state = saveState(app.state);
    hydrateSyncForm(app.state);
    setSyncStatus('Progresso baixado.');
    render();
  } catch (error) {
    setSyncStatus(error.message, 'error');
  }
}

async function autoPullProgress() {
  if (!hasSyncConfig(app.state)) return;
  try {
    const remote = await pullStateFromGist(app.state.settings);
    app.state = replaceState(mergeSyncedState(app.state, {
      ...remote,
      settings: {
        ...(remote.settings || {}),
        gistToken: app.state.settings.gistToken,
        gistId: app.state.settings.gistId,
        autoSync: app.state.settings.autoSync
      }
    }));
    applyBaselineProgress();
    app.state = saveState(app.state);
    hydrateSyncForm(app.state);
    setSyncStatus('Sincronizado.');
    render();
  } catch (error) {
    setSyncStatus('Sincronização pendente.');
  }
}

function applyBaselineProgress() {
  let changed = false;
  for (const content of app.contents) {
    const shouldStartDone = content.baselineCompleted || content.status === STATUS.done || content.status === STATUS.reviewed;
    if (!shouldStartDone || app.state.progress[content.id]) continue;

    app.state = {
      ...app.state,
      progress: {
        ...app.state.progress,
        [content.id]: {
          status: content.status === STATUS.reviewed ? STATUS.reviewed : STATUS.done,
          completedAt: content.completedAt || new Date().toISOString(),
          updatedAt: content.completedAt || new Date().toISOString(),
          source: 'baseline'
        }
      }
    };
    app.state = ensureReviewsForContent(app.state, content, app.meta.reviewOffsets);
    changed = true;
  }

  if (changed) app.state = saveState(app.state);
}

function startAutoSync() {
  if (periodicSyncTimer) {
    clearInterval(periodicSyncTimer);
    periodicSyncTimer = null;
  }

  if (!hasSyncConfig(app.state)) return;

  periodicSyncTimer = setInterval(() => {
    autoPullProgress();
  }, AUTO_SYNC_INTERVAL);
}

function queueAutoSync() {
  if (!hasSyncConfig(app.state)) return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(async () => {
    try {
      setSyncStatus('Salvo localmente. Sincronizando...');
      await pushStateToGist(app.state);
      app.state = saveState({
        ...app.state,
        settings: {
          ...app.state.settings,
          lastSync: new Date().toISOString(),
          lastPush: new Date().toISOString()
        }
      });
      setSyncStatus('Sincronizado automaticamente.');
    } catch (error) {
      setSyncStatus('Salvo localmente. Sync pendente.', 'error');
    }
  }, AUTO_SYNC_DELAY);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('service-worker.js').catch((error) => {
    console.warn('Service worker não registrado.', error);
  });
}

function setupInstallPrompt() {
  let deferredPrompt = null;
  const button = document.getElementById('installBtn');
  if (!button) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.hidden = true;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.plannerSummary = () => summarize(app.contents, app.state);
