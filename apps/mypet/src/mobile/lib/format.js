export function formatMoney(amount) {
  if (amount == null) return '--';
  return `${new Intl.NumberFormat('ru-RU').format(amount)} KZT`;
}

export function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function initials(user) {
  return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim().toUpperCase() || 'MP';
}

export function relativeLabel(status) {
  const map = {
    PENDING: 'Pending approval',
    ACCEPTED: 'Accepted',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  return map[status] || status;
}
