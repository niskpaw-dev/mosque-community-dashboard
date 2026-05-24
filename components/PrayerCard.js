import { CONFIG } from '../utils/prayer-utils.js';

const elements = {
  scheduleGrid: document.getElementById('prayerSchedule'),
};

function renderScheduleGridContent(schedule, activeName) {
  if (!elements.scheduleGrid) return;

  const miladi = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace(' ', ', ');

  // Hijri and location are currently driven by the header in pages/index.html.
  // Keep schedule card compact to avoid UI duplication/conflicts.
  const hijriText = '—';
  const locationText = 'Kuala Langat';

  const rows = schedule
    .map(({ name, date }) => {
      const label = CONFIG.translation[name] || name;
      const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const activeClass = name === activeName ? 'schedule-row active' : 'schedule-row';

      return `
        <div class="${activeClass}" role="listitem" aria-current="${
          name === activeName ? 'true' : 'false'
        }">
          <span class="schedule-row__name">${label}</span>
          <span class="schedule-row__time">${time}</span>
        </div>
      `;
    })
    .join('');

  // IMPORTANT: No duplicate headings; a single title is already defined by the layout.
  // Here we render only the schedule card content area (top info + rows).
  elements.scheduleGrid.innerHTML = `
    <div class="schedule-top" role="heading" aria-level="2">
      <div class="schedule-title">Jadual Solat</div>

      <div class="schedule-date" id="scheduleSubtitle">
        ${miladi} • ${hijriText}
      </div>

      <div class="schedule-location" aria-label="Location">${locationText}</div>
    </div>

    <div class="schedule-body" role="list" aria-label="Prayer schedule">
      ${rows}
    </div>
  `;
}

// Public: schedule grid renderer for the current UI.
// Highlights CURRENT ACTIVE prayer row only.
export function renderScheduleGrid(prayerTimes, now, activePrayerName) {
  if (!elements.scheduleGrid) return;
  if (!prayerTimes) return;

  // prayerTimes values are strings like "HH:MM" created by time-service.
  const schedule = CONFIG.prayerOrder.map((name) => {
    const [hh, mm] = String(prayerTimes[name]).split(':');
    const date = new Date(now);
    date.setHours(Number(hh), Number(mm), 0, 0);
    return { name, date };
  });

  // Render CURRENT-PRAYER highlighted schedule rows only.
  // No extra heading: the schedule card already defines layout.
  renderScheduleGridContent(schedule, activePrayerName);
}




