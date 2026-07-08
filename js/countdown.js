export function daysUntil(dateString, fromDate = new Date()) {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const target = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.ceil((target - start) / 86400000));
}

export function formatShortDate(dateString) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${dateString}T00:00:00`));
}
