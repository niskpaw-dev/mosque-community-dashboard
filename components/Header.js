export function renderHeader() {
  const appTitle = document.querySelector('.topbar h1');
  const appSubtitle = document.querySelector('.topbar .subline');

  if (appTitle) {
    appTitle.textContent = 'Waktu Solat Harian';
  }

  if (appSubtitle) {
    appSubtitle.textContent = 'Kuala Langat • Kemas kini automatik setiap saat';
  }
}
