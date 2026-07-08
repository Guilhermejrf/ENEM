import { getContentState, isCompletedStatus } from './storage.js';

export function summarize(contents, state) {
  const tracked = contents.filter((content) => content.tipo !== 'descanso');
  const completed = tracked.filter((content) => isCompletedStatus(getContentState(state, content.id).status));
  const totalMinutes = tracked.reduce((sum, content) => sum + content.tempoEstimadoMin, 0);
  const completedMinutes = completed.reduce((sum, content) => sum + content.tempoEstimadoMin, 0);
  const questionsDone = completed.reduce((sum, content) => sum + content.questoes, 0);
  const redactionsDone = completed.filter((content) => content.tipo === 'redacao').length;
  const simulationsDone = completed.filter((content) => content.tipo === 'simulado').length;

  return {
    total: tracked.length,
    completed: completed.length,
    pending: Math.max(0, tracked.length - completed.length),
    percent: tracked.length ? Math.round((completed.length / tracked.length) * 100) : 0,
    hoursStudied: Math.round(completedMinutes / 60),
    hoursRemaining: Math.max(0, Math.round((totalMinutes - completedMinutes) / 60)),
    questionsDone,
    redactionsDone,
    simulationsDone,
    byDiscipline: groupProgress(tracked, state, 'disciplina'),
    byArea: groupProgress(tracked, state, 'area'),
    weekly: weeklyProgress(tracked, state)
  };
}

export function updateGlobalProgress(summary) {
  const fill = document.getElementById('globalProgress');
  const text = document.getElementById('globalProgressText');
  if (fill) fill.style.width = `${summary.percent}%`;
  if (text) text.textContent = `${summary.percent}%`;
}

export function formatHours(hours) {
  return `${Number(hours).toLocaleString('pt-BR')}h`;
}

function groupProgress(contents, state, field) {
  const map = {};
  for (const content of contents) {
    const key = content[field] || 'Geral';
    if (!map[key]) {
      map[key] = { total: 0, completed: 0, minutes: 0, completedMinutes: 0 };
    }
    const done = isCompletedStatus(getContentState(state, content.id).status);
    map[key].total += 1;
    map[key].minutes += content.tempoEstimadoMin;
    if (done) {
      map[key].completed += 1;
      map[key].completedMinutes += content.tempoEstimadoMin;
    }
  }

  return Object.entries(map)
    .map(([name, data]) => ({
      name,
      ...data,
      percent: data.total ? Math.round((data.completed / data.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);
}

function weeklyProgress(contents, state) {
  const map = {};
  for (const content of contents) {
    const key = String(content.semana || 0).padStart(2, '0');
    if (!map[key]) map[key] = { week: Number(content.semana || 0), total: 0, completed: 0 };
    map[key].total += 1;
    if (isCompletedStatus(getContentState(state, content.id).status)) {
      map[key].completed += 1;
    }
  }
  return Object.values(map)
    .sort((a, b) => a.week - b.week)
    .map((item) => ({
      ...item,
      percent: item.total ? Math.round((item.completed / item.total) * 100) : 0
    }));
}
