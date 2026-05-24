import { CONFIG, getProgressPercent, formatDuration, getCurrentPrayer, getNextPrayer } from './prayer-utils.js';

import { fetchPrayerTimes } from '../services/prayer-service.js';
import { fetchWeather } from '../services/weather-service.js';
import { getCurrentTime, getHijriDate } from '../services/time-service.js';
import { getMasjidStatus, getDynamicAnnouncement } from '../services/status-service.js';
import { renderHeader } from '../components/Header.js';
import { renderPrayerCard } from '../components/PrayerCard.js';
import { renderProgressBar } from '../components/ProgressBar.js';
import { renderAnnouncementCard } from '../components/AnnouncementCard.js';
import { renderStatusCard } from '../components/StatusCard.js';

const state = {
  prayerTimes: null,
  hijriDate: null,
  currentPrayerName: null,
  nextPrayerName: null,
  nextPrayerTime: null,
  weather: null,
  masjidStatus: 'Sedang memuat...',
};

const topInfo = {
  // Legacy chips (new UI may not include these ids)
  currentTime: document.getElementById('currentTime'),
  hijriDate: document.getElementById('hijriDate'),
  weatherStatus: document.getElementById('weatherStatus'),
  masjidStatus: document.getElementById('masjidStatus')
};

const topDateEls = {
  miladiHijriDate: document.getElementById('miladiHijriDate')
};

const focusEls = {
  activeBadge: document.getElementById('activePrayerBadge'),
  nextName: document.getElementById('nextPrayerFocus'),
  nextTime: document.getElementById('nextPrayerTimeFocus'),
  currentPrayerList: document.getElementById('currentPrayerList'),
};


const ringEls = {
  jam: document.getElementById('timerJam'),
  minit: document.getElementById('timerMinit'),
  saat: document.getElementById('timerSaat'),
  cards: Array.from(document.querySelectorAll('.ring-card'))
};

function updateTopInfo() {
  const now = new Date();

  // New top date section
  if (topDateEls.miladiHijriDate) {
    const miladi = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const hijri = state.hijriDate || getHijriDate(now);
    topDateEls.miladiHijriDate.textContent = `${miladi} Miladi | ${hijri} Hijri`;
  }

  // Legacy chips
  if (topInfo.currentTime) {
    topInfo.currentTime.textContent = getCurrentTime(now);
  }

  if (topInfo.hijriDate) {
    topInfo.hijriDate.textContent = state.hijriDate || getHijriDate(now);
  }

  if (topInfo.weatherStatus) {
    topInfo.weatherStatus.textContent = state.weather
      ? `${state.weather.label} ${state.weather.temperature}°C`
      : 'Memuat cuaca...';
  }

  if (topInfo.masjidStatus) {
    topInfo.masjidStatus.textContent = state.masjidStatus;
  }
}

function secondsToHMS(seconds) {
  const clamped = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const sec = clamped % 60;
  return { hours, minutes, seconds: sec };
}

function setRingProgress(cardEl, ratio01) {
  const fg = cardEl.querySelector('.ring__fg');
  if (!fg) return;

  const r = Number(fg.getAttribute('r') || 48);
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, ratio01));

  fg.style.strokeDasharray = `${circumference} ${circumference}`;
  fg.style.strokeDashoffset = `${circumference * (1 - pct)}`;
}

function updatePrayerZonesAndCountdown() {
  if (!state.prayerTimes || !state.nextPrayerTime) return;

  const now = new Date();
  const currentPrayer = getCurrentPrayer(state.prayerTimes, now);
  const nextPrayer = getNextPrayer(state.prayerTimes, now);

  // 1) CURRENT ACTIVE PRAYER
  const activeLabel = CONFIG.translation[currentPrayer.name] || currentPrayer.name || '--';
  if (focusEls.activeBadge) {
    focusEls.activeBadge.textContent = `🌙 ${activeLabel}`;
    focusEls.activeBadge.classList.add('active-prayer-pulse');
  }

  // 2) NEXT UPCOMING PRAYER
  if (focusEls.nextName) {
    focusEls.nextName.textContent = CONFIG.translation[nextPrayer.name] || nextPrayer.name || '—';
  }

  if (focusEls.nextTime) {
    focusEls.nextTime.textContent = nextPrayer.date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // 3) COUNTDOWN TO NEXT PRAYER (always target nextPrayerTime)
  const secondsLeft = Math.max(0, (state.nextPrayerTime - now) / 1000);
  const { hours, minutes, seconds } = secondsToHMS(secondsLeft);

  if (ringEls.jam) ringEls.jam.textContent = String(hours).padStart(2, '0');
  if (ringEls.minit) ringEls.minit.textContent = String(minutes).padStart(2, '0');
  if (ringEls.saat) ringEls.saat.textContent = String(seconds).padStart(2, '0');

  // Best-effort ring progress: use percent of each unit relative to its max.
  const hourRatio = Math.min(1, hours / 12);
  const minRatio = minutes / 60;
  const secRatio = seconds / 60;

  for (const cardEl of ringEls.cards) {
    const kind = cardEl.getAttribute('data-ring');
    if (kind === 'jam') setRingProgress(cardEl, hourRatio);
    if (kind === 'minit') setRingProgress(cardEl, minRatio);
    if (kind === 'saat') setRingProgress(cardEl, secRatio);
  }
}


async function init() {
  console.log('Waktu Solat app start');
  renderHeader();
  renderAnnouncementCard('Memuat data solat...');
  renderStatusCard(state.masjidStatus);

  updateTopInfo();

  loadWeather();
  await loadPrayerTimes();

  startCountdown();
  setInterval(loadWeather, 15 * 60 * 1000);
}

async function loadPrayerTimes() {
  try {
    console.log('Memuat waktu solat...');
    const prayerData = await fetchPrayerTimes();
    state.prayerTimes = prayerData.prayerTimes;
    state.hijriDate = prayerData.hijriDate;
    state.lastUpdated = new Date();

    calculatePrayerState();
    updateDashboard();
  } catch (error) {
    console.error('Prayer load failed:', error);
    renderPrayerCard({ error: true });
    renderStatusCard('Data tidak tersedia');

    if (document.getElementById('nextPrayer')) {
      document.getElementById('nextPrayer').textContent = 'Gagal muat data solat';
    }
    if (document.getElementById('countdown')) {
      document.getElementById('countdown').textContent = '--';
    }

    if (ringEls.jam) ringEls.jam.textContent = '--';
    if (ringEls.minit) ringEls.minit.textContent = '--';
    if (ringEls.saat) ringEls.saat.textContent = '--';
  }
}

async function loadWeather() {
  try {
    state.weather = await fetchWeather();
  } catch (error) {
    console.warn(error);
    state.weather = { label: 'Cuaca tidak tersedia', temperature: '--' };
  }

  updateTopInfo();
}

function calculatePrayerState() {
  const now = new Date();
  if (!state.prayerTimes) return;

  const currentPrayer = getCurrentPrayer(state.prayerTimes, now);
  const nextPrayer = getNextPrayer(state.prayerTimes, now);

  state.currentPrayerName = currentPrayer.name;
  state.nextPrayerName = nextPrayer.name;
  state.nextPrayerTime = nextPrayer.date;
  state.masjidStatus = getMasjidStatus(currentPrayer.name, now);

  renderAnnouncementCard(getDynamicAnnouncement(currentPrayer.name, nextPrayer.name));
  renderStatusCard(state.masjidStatus);
}

function updateDashboard() {
  // Legacy schedule/list rendering (kept for now)
  const progress = renderPrayerCard(state);
  if (typeof progress === 'number') {
    renderProgressBar(progress);
  }

  // New UI: focus + rings countdown
  updatePrayerZonesAndCountdown();


  renderStatusCard(state.masjidStatus);
  updateLastUpdated();
}

function startCountdown() {
  setInterval(() => {
    updateTopInfo();

    if (!state.nextPrayerTime) return;

    const now = new Date();
    if (now >= state.nextPrayerTime || (now.getDate() !== state.nextPrayerTime.getDate())) {
      calculatePrayerState();
      state.lastUpdated = new Date();
      updateLastUpdated();
    }

    updateDashboard();
  }, 1000);
}

function updateLastUpdated() {
  const updatedElement = document.getElementById('lastUpdated');
  if (!updatedElement || !state.lastUpdated) return;

  updatedElement.textContent = `Dikemaskini ${state.lastUpdated.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;
}

window.addEventListener('DOMContentLoaded', init);

window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

