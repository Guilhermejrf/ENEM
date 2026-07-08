import { daysUntil, formatShortDate } from './countdown.js';
import { formatHours, summarize, updateGlobalProgress } from './progress.js';

export function renderDashboard(container, contents, state, meta) {
  const summary = summarize(contents, state);
  updateGlobalProgress(summary);
  renderHeroMetrics(summary, meta);

  container.innerHTML = `
    ${metricCard('Percentual geral', `${summary.percent}%`, `${summary.completed} de ${summary.total} itens`)}
    ${metricCard('Horas estudadas', formatHours(summary.hoursStudied), `${formatHours(summary.hoursRemaining)} restantes`)}
    ${metricCard('Questões resolvidas', summary.questionsDone.toLocaleString('pt-BR'), 'somadas pelos cards concluídos')}
    ${metricCard('Redações e simulados', `${summary.redactionsDone}/${summary.simulationsDone}`, 'redações / simulados feitos')}
    ${metricCard('ENEM dia 1', `${daysUntil(meta.enem.day1)} dias`, formatShortDate(meta.enem.day1))}
    ${metricCard('ENEM dia 2', `${daysUntil(meta.enem.day2)} dias`, formatShortDate(meta.enem.day2))}
    ${metricCard('IFPE', `${daysUntil(meta.ifpe.examDate)} dias`, `${formatShortDate(meta.ifpe.examDate)} · estimado`)}
    ${metricCard('Pendentes', summary.pending.toLocaleString('pt-BR'), 'conteúdos ainda abertos')}
    <div class="chart-panel">
      <h3>Progresso por disciplina</h3>
      <div class="bar-list">${disciplineBars(summary.byDiscipline)}</div>
    </div>
    <div class="chart-panel">
      <h3>Gráfico semanal</h3>
      <canvas class="chart-canvas" id="weeklyChart" width="620" height="220" aria-label="Progresso semanal"></canvas>
    </div>
  `;

  drawWeeklyChart(document.getElementById('weeklyChart'), summary.weekly);
}

function renderHeroMetrics(summary, meta) {
  const hero = document.getElementById('heroMetrics');
  if (!hero) return;

  hero.innerHTML = `
    <div><strong>${summary.percent}%</strong><span>progresso geral</span></div>
    <div><strong>${daysUntil(meta.enem.day1)}</strong><span>dias até o ENEM</span></div>
    <div><strong>${daysUntil(meta.ifpe.examDate)}</strong><span>dias até o IFPE</span></div>
    <div><strong>${formatHours(summary.hoursStudied)}</strong><span>horas estudadas</span></div>
  `;
}

function metricCard(label, value, detail) {
  return `
    <article class="dashboard-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function disciplineBars(rows) {
  return rows.map((row) => `
    <div class="bar-row">
      <span>${escapeHtml(row.name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${row.percent}%"></div></div>
      <strong>${row.percent}%</strong>
    </div>
  `).join('');
}

function drawWeeklyChart(canvas, rows) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 16, right: 16, bottom: 32, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const visible = rows.slice(0, 38);
  const max = Math.max(100, ...visible.map((item) => item.percent));
  const barGap = 3;
  const barWidth = Math.max(5, (chartWidth / visible.length) - barGap);

  context.clearRect(0, 0, width, height);
  context.fillStyle = getCss('--ink-soft');
  context.font = '12px Segoe UI, sans-serif';
  context.fillText('100%', 0, padding.top + 6);
  context.fillText('0%', 10, height - padding.bottom + 2);

  context.strokeStyle = getCss('--line');
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + chartHeight);
  context.lineTo(width - padding.right, padding.top + chartHeight);
  context.stroke();

  visible.forEach((item, index) => {
    const x = padding.left + index * (barWidth + barGap);
    const barHeight = (item.percent / max) * chartHeight;
    const y = padding.top + chartHeight - barHeight;
    context.fillStyle = item.percent >= 80 ? getCss('--green') : item.percent >= 40 ? getCss('--purple-2') : getCss('--pink');
    context.fillRect(x, y, barWidth, barHeight);

    if (index % 4 === 0) {
      context.fillStyle = getCss('--muted');
      context.fillText(String(item.week), x, height - 10);
    }
  });
}

function getCss(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
