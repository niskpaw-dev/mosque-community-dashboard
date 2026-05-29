import { CONFIG } from '../utils/prayer-utils.js';

const elements = {
  scheduleGrid: document.getElementById('prayerSchedule'),
};

function renderScheduleGridContent(schedule, activeName) {
  if (!elements.scheduleGrid) return;

  const miladi = new Date().toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace(' ', ', ');

  // Hijri and location are currently driven by the header in pages/index.html.
  // Keep schedule card compact to avoid UI duplication/conflicts.
  const hijriText = '—';
  const locationText = 'Kuala Langat';
  const isFriday = new Date().getDay() === 5;

  const rows = schedule
    .map(({ name, date }) => {
      let label = CONFIG.translation[name] || name;

      if (name === 'Dhuhr' && isFriday) {
        label = `Zohor <span class="badge-jumaat">Jumaat</span>`;
      }

      const time = date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const activeClass = name === activeName ? 'schedule-row active' : 'schedule-row';
      let rowClass = activeClass;
      if (name === 'Syuruk') rowClass += ' schedule-row--syuruk';
      if (name === 'Zawal') rowClass += ' schedule-row--zawal';
      if (name === 'Imsak') rowClass += ' schedule-row--imsak';
      if (name === 'Dhuhr' && isFriday) rowClass += ' schedule-row--jumaat';

      // Koleksi ikon dinamik untuk setiap waktu (Feather Icons)
      const iconPaths = {
        Imsak: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>', // Jam peringatan
        Fajr: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>', // Bulan
        Syuruk: '<path d="M12 2v6"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h20"/><path d="M20 14h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><polyline points="8 6 12 2 16 6"/><path d="M16 18a4 4 0 0 0-8 0"/>', // Sunrise
        Dhuha: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', // Matahari penuh
        Zawal: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>', // Ikon Alert/Amaran
        Dhuhr: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', // Matahari penuh
        Asr: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>', // Matahari penuh
        Maghrib: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h20"/><path d="M20 14h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><polyline points="16 5 12 9 8 5"/><path d="M16 18a4 4 0 0 0-8 0"/>', // Sunset
        Isha: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' // Bulan
      };

      const iconHtml = iconPaths[name] 
        ? `<svg class="row-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>` 
        : '';

      return `
        <div class="${rowClass}" role="listitem" aria-current="${
          name === activeName ? 'true' : 'false'
        }">
          <span class="schedule-row__name">
            ${iconHtml}
            ${label}
          </span>
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
