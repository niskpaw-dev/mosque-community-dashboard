import { CONFIG, getPrayerSchedule, getProgressPercent, formatDuration, getCurrentPrayer, getNextPrayer } from './prayer-utils.js';
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
  currentTime: document.getElementById('currentTime'),
  hijriDate: document.getElementById('hijriDate'),
  weatherStatus: document.getElementById('weatherStatus'),
  masjidStatus: document.getElementById('masjidStatus')
};

function updateTopInfo() {
  const now = new Date();

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
    console.log('Prayer times loaded:', state.prayerTimes, 'Hijri:', state.hijriDate);
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
  const progress = renderPrayerCard(state);
  renderProgressBar(progress);
  renderStatusCard(state.masjidStatus);
  updateLastUpdated();
}

function startCountdown() {
  setInterval(() => {
    updateTopInfo();

    if (!state.nextPrayerTime) return;

    const now = new Date();
    if (now >= state.nextPrayerTime || now.getDate() !== state.nextPrayerTime.getDate()) {
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
