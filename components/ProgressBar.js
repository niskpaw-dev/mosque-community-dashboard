const progressElement = document.getElementById('progressBar');

export function renderProgressBar(percent) {
  if (!progressElement) return;
  progressElement.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}
