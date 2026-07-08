const STORAGE_KEY = 'enem-ifpe-planner-state-v1';

export const STATUS = {
  notStarted: 'nao-iniciado',
  studying: 'estudando',
  done: 'concluido',
  reviewed: 'revisado'
};

export const STATUS_LABELS = {
  'nao-iniciado': 'Não iniciado',
  estudando: 'Estudando',
  concluido: 'Concluído',
  revisado: 'Revisado'
};

export function createDefaultState() {
  return {
    version: 1,
    progress: {},
    revisions: [],
    settings: {
      theme: 'light',
      gistToken: '',
      gistId: '',
      autoSync: true,
      lastSync: '',
      lastPull: '',
      lastPush: ''
    },
    updatedAt: new Date().toISOString()
  };
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultState();
    return mergeState(createDefaultState(), JSON.parse(saved));
  } catch (error) {
    console.warn('Não foi possível carregar o progresso salvo.', error);
    return createDefaultState();
  }
}

export function saveState(state) {
  const next = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function replaceState(nextState) {
  const state = mergeState(createDefaultState(), nextState || {});
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function mergeState(base, incoming) {
  return {
    ...base,
    ...incoming,
    progress: {
      ...(base.progress || {}),
      ...(incoming.progress || {})
    },
    settings: {
      ...(base.settings || {}),
      ...(incoming.settings || {})
    },
    revisions: Array.isArray(incoming.revisions) ? incoming.revisions : (base.revisions || [])
  };
}

export function getContentState(state, contentId) {
  return state.progress[contentId] || { status: STATUS.notStarted };
}

export function setContentStatus(state, content, status) {
  const current = getContentState(state, content.id);
  const now = new Date().toISOString();
  const next = {
    ...current,
    status,
    updatedAt: now
  };

  if ((status === STATUS.done || status === STATUS.reviewed) && !current.completedAt) {
    next.completedAt = now;
  }

  if (status === STATUS.notStarted || status === STATUS.studying) {
    delete next.completedAt;
  }

  return {
    ...state,
    progress: {
      ...state.progress,
      [content.id]: next
    }
  };
}

export function isCompletedStatus(status) {
  return status === STATUS.done || status === STATUS.reviewed;
}

export function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
