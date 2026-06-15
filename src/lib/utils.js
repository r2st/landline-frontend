export function getScoreColor(score) {
  if (score >= 81) return 'text-green-700 bg-green-100 border-green-300';
  if (score >= 61) return 'text-blue-700 bg-blue-100 border-blue-300';
  if (score >= 31) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
  return 'text-red-700 bg-red-100 border-red-300';
}

export function getScoreLabel(score) {
  if (score >= 81) return 'Hot';
  if (score >= 61) return 'Warm';
  if (score >= 31) return 'Cool';
  return 'Cold';
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
