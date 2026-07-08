const GIST_API = 'https://api.github.com/gists';
const PROGRESS_FILE = 'progress.json';

export function hydrateSyncForm(state) {
  const token = document.getElementById('gistToken');
  const gist = document.getElementById('gistId');
  const auto = document.getElementById('autoSync');
  if (token) token.value = state.settings.gistToken || '';
  if (gist) gist.value = state.settings.gistId || '';
  if (auto) auto.checked = state.settings.autoSync !== false;
}

export function readSyncSettings() {
  return {
    gistToken: document.getElementById('gistToken')?.value.trim() || '',
    gistId: document.getElementById('gistId')?.value.trim() || '',
    autoSync: document.getElementById('autoSync')?.checked !== false
  };
}

export function setSyncStatus(message, tone = '') {
  const element = document.getElementById('syncStatus');
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
}

export function hasSyncConfig(state) {
  return Boolean(state.settings.gistToken && state.settings.gistId && state.settings.autoSync !== false);
}

export function mergeSyncedState(localState, remoteState) {
  const localProgress = localState.progress || {};
  const remoteProgress = remoteState?.progress || {};
  const progressIds = new Set([...Object.keys(localProgress), ...Object.keys(remoteProgress)]);
  const progress = {};

  for (const id of progressIds) {
    progress[id] = pickNewest(localProgress[id], remoteProgress[id]);
  }

  const revisions = mergeRevisions(localState.revisions || [], remoteState?.revisions || []);
  const localTime = Date.parse(localState.updatedAt || '') || 0;
  const remoteTime = Date.parse(remoteState?.updatedAt || '') || 0;

  return {
    ...localState,
    ...(remoteTime > localTime ? remoteState : {}),
    progress,
    revisions,
    settings: {
      ...localState.settings,
      lastSync: new Date().toISOString(),
      lastPull: new Date().toISOString()
    },
    updatedAt: new Date(Math.max(localTime, remoteTime, Date.now())).toISOString()
  };
}

export async function pushStateToGist(state) {
  const { gistToken, gistId } = state.settings;
  assertConfig(gistToken, gistId);

  const payload = {
    files: {
      [PROGRESS_FILE]: {
        content: JSON.stringify({
          ...state,
          settings: {
            ...state.settings,
            gistToken: ''
          }
        }, null, 2)
      }
    }
  };

  const response = await fetch(`${GIST_API}/${gistId}`, {
    method: 'PATCH',
    headers: headers(gistToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`GitHub respondeu ${response.status}`);
  }

  return response.json();
}

export async function pullStateFromGist(settings) {
  const { gistToken, gistId } = settings;
  assertConfig(gistToken, gistId);

  const response = await fetch(`${GIST_API}/${gistId}`, {
    headers: headers(gistToken)
  });

  if (!response.ok) {
    throw new Error(`GitHub respondeu ${response.status}`);
  }

  const gist = await response.json();
  const file = gist.files?.[PROGRESS_FILE];
  if (!file?.content) {
    throw new Error('progress.json não encontrado no Gist.');
  }

  return JSON.parse(file.content);
}

function assertConfig(token, gistId) {
  if (!token || !gistId) {
    throw new Error('Informe token e Gist ID.');
  }
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function pickNewest(localValue = {}, remoteValue = {}) {
  const localTime = Date.parse(localValue.updatedAt || localValue.completedAt || '') || 0;
  const remoteTime = Date.parse(remoteValue.updatedAt || remoteValue.completedAt || '') || 0;
  return remoteTime > localTime ? remoteValue : localValue;
}

function mergeRevisions(localRevisions, remoteRevisions) {
  const map = new Map();
  for (const review of localRevisions) map.set(review.id, review);
  for (const review of remoteRevisions) {
    const current = map.get(review.id);
    map.set(review.id, pickNewest(current, review));
  }
  return [...map.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
