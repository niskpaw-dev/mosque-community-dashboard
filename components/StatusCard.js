const statusText = document.getElementById('statusText');

export function renderStatusCard(status) {
  if (!statusText) return;
  statusText.textContent = status;
}
