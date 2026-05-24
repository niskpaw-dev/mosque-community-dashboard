import { CONFIG, getPrayerSchedule, getProgressPercent, formatDuration } from '../utils/prayer-utils.js';

const elements = {
  nextPrayer: document.getElementById('nextPrayer'),
  countdown: document.getElementById('countdown'),
  card: document.querySelector('.waktu-solat'),
  pill: document.getElementById('prayerStatusPill'),
  currentPrayerList: document.getElementById('currentPrayerList'),
  scheduleGrid: document.getElementById('prayerSchedule')
};

const statusClassMap = {
  Fajr: 'status-fajr',
  Maghrib: 'status-maghrib',
  Isha: 'status-isha'
};

const statusClasses = ['status-fajr', 'status-maghrib', 'status-isha', 'status-default'];

function applyPrayerStatus(prayerName) {
  if (!elements.card) return;

  elements.card.classList.remove(...statusClasses);
  elements.card.classList.add(statusClassMap[prayerName] || 'status-default');
}

function renderCurrentPrayerList(schedule, activeName) {
  if (!elements.currentPrayerList) return;

  elements.currentPrayerList.innerHTML = schedule
    .map(({ name }) => {
      const label = CONFIG.translation[name] || name;
      const active = name === activeName ? 'prayer-pill active' : 'prayer-pill';
      return `<span class="${active}">${label}</span>`;
    })
    .join('');
}

function renderScheduleGrid(schedule, activeName) {
  if (!elements.scheduleGrid) return;

  const rows = schedule
    .map(({ name, date }) => {
      const label = CONFIG.translation[name] || name;
      const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const activeClass = name === activeName ? 'schedule-row active' : 'schedule-row';

      return `
        <div class="${activeClass}">
          <span>${label}</span>
          <span>${time}</span>
        </div>
      `;
    })
    .join('');

  elements.scheduleGrid.innerHTML = `
    <div class="schedule-header">
      <div class="schedule-header__titles">
        <div class="schedule-title">Jadual Solat</div>
        <div class="schedule-subtitle" id="scheduleSubtitle">${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • Hijri</div>
      </div>
      <div class="schedule-header__meta">Masjid • Kuala Langat</div>
    </div>
    <div class="schedule-divider" aria-hidden="true"></div>
    <div class="schedule-body">
      ${rows}
    </div>
  `;
}

export function renderPrayerCard(state) {
  const { prayerTimes, currentPrayerName, nextPrayerName, nextPrayerTime, error } = state;

  if (error || !prayerTimes) {
    if (elements.nextPrayer) elements.nextPrayer.textContent = 'API Error';
    if (elements.countdown) elements.countdown.textContent = '--';
    if (elements.pill) elements.pill.textContent = 'Terhenti';
    return;
  }

  const now = new Date();
  const secondsLeft = nextPrayerTime - now;
  const progress = getProgressPercent(prayerTimes, nextPrayerTime);

  if (elements.nextPrayer) {
    elements.nextPrayer.textContent = `Seterusnya: ${CONFIG.translation[nextPrayerName] || nextPrayerName}`;
  }

  if (elements.countdown) {
    elements.countdown.textContent = secondsLeft <= 0 ? 'Waktu telah masuk' : formatDuration(secondsLeft);
  }

  if (elements.pill) {
    // Active prayer: should correspond to the focus prayer (state.currentPrayerName)
    const currentLabel = CONFIG.translation[currentPrayerName] || currentPrayerName;
    elements.pill.textContent = `Aktif: ${currentLabel}`;
  }


  applyPrayerStatus(currentPrayerName);
  renderCurrentPrayerList(getPrayerSchedule(prayerTimes, new Date()), currentPrayerName);
  renderScheduleGrid(getPrayerSchedule(prayerTimes, new Date()), currentPrayerName);

  return progress;
}
