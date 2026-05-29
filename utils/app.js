﻿import { CONFIG, getCurrentPrayer, getNextPrayer, getActiveHijri } from './prayer-utils.js';

import { fetchPrayerTimes } from '../services/prayer-service.js';
import { fetchWeather } from '../services/weather-service.js';
import { getCurrentTime, getHijriDate } from '../services/time-service.js';
import { getMasjidStatus, getDynamicAnnouncement } from '../services/status-service.js';
import { renderHeader } from '../components/Header.js';
import { renderScheduleGrid } from '../components/PrayerCard.js';
import { renderAnnouncementCard } from '../components/AnnouncementCard.js';
import { renderStatusCard } from '../components/StatusCard.js';

const state = {
  prayerTimes: null,
  hijriDate: null,
  currentRecord: null,
  nextRecord: null,
  currentPrayerName: null,
  nextPrayerName: null,
  nextPrayerTime: null,
  weather: null,
  masjidStatus: 'Sedang memuat...',
  lastFetchDay: null,
  lastFetchAttemptTime: 0,
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

// Objek Audio untuk bunyi notifikasi (chime)
// Nota: Sila pastikan anda meletakkan fail audio (contoh: chime.mp3) di dalam folder yang betul.
const notificationChime = new Audio('assets/chime.mp3'); 

function playChimeSound() {
  notificationChime.currentTime = 0; // Mula dari awal
  notificationChime.play().catch(e => console.warn('Sistem menghalang audio autoplay. Sila klik sekali pada skrin.', e));
}

// Objek Audio untuk laungan Azan penuh
// Nota: Pastikan fail azan.mp3 diletakkan di dalam folder assets
const azanAudio = new Audio('assets/azan.mp3');

function playAzanSound() {
  azanAudio.currentTime = 0;
  azanAudio.play().catch(e => console.warn('Sistem menghalang audio autoplay. Sila klik sekali pada skrin.', e));
}

// Objek Audio untuk laungan Azan Subuh (mengandungi As-salatu khairum minan-naum)
// Nota: Pastikan fail azan-subuh.mp3 diletakkan di dalam folder assets
const azanSubuhAudio = new Audio('assets/azan-subuh.mp3');

function playAzanSubuhSound() {
  azanSubuhAudio.currentTime = 0;
  azanSubuhAudio.play().catch(e => console.warn('Sistem menghalang audio autoplay. Sila klik sekali pada skrin.', e));
}

function updateTopInfo() {
  const now = new Date();

  // New top date section
  if (topDateEls.miladiHijriDate) {
    const miladi = now.toLocaleDateString('ms-MY', {
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
      ? `${state.weather.icon} ${state.weather.label} ${state.weather.temperature}°C`
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

  // Kemas kini atribut tema supaya UI (gelang) bertukar warna mengikut waktu seterusnya
  let themeName = nextPrayer.name;
  if (themeName === 'Dhuhr' && now.getDay() === 5) {
    themeName = 'Dhuhr-Jumaat';
  }
  document.body.setAttribute('data-next-prayer', themeName);

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
  // Guard: when API uses exact minute boundaries, nextPrayerTime can equal 'now' very briefly.
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
    state.currentRecord = prayerData.currentRecord;
    state.nextRecord = prayerData.nextRecord;
    state.hijriDate = prayerData.hijriDate;
    state.lastUpdated = new Date();
    state.lastFetchDay = new Date().getDate();

    calculatePrayerState();
    updateDashboard();
  } catch (error) {
    console.error('Prayer load failed:', error);
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

  // Semak jika waktu solat sasaran telah bertukar ganti (dan bukan pada muat turun pertama kali)
  if (state.nextPrayerName && state.nextPrayerName !== nextPrayer.name) {
    const mainPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    // Jika masuk 5 waktu solat utama
    if (mainPrayers.includes(currentPrayer.name)) {
      // Jika waktu Subuh, mainkan azan khusus Subuh
      if (currentPrayer.name === 'Fajr') {
        playAzanSubuhSound();
      }
      // Kecuali Zohor pada hari Jumaat (Solat Jumaat - Bilal azan secara live)
      else if (currentPrayer.name === 'Dhuhr' && now.getDay() === 5) {
        playChimeSound(); 
      } else {
        playAzanSound();
      }
    } else {
      // Waktu lain (Imsak, Syuruk, Dhuha, Zawal)
      playChimeSound();
    }
  }

  // Semak dan kemas kini tarikh Hijrah secara dinamik (bertukar pada waktu Maghrib)
  if (state.currentRecord && state.nextRecord) {
    state.hijriDate = getActiveHijri(state.currentRecord, state.nextRecord, now);
  }

  state.currentPrayerName = currentPrayer.name;
  state.nextPrayerName = nextPrayer.name;
  state.nextPrayerTime = nextPrayer.date;
  state.masjidStatus = getMasjidStatus(currentPrayer.name, now);

  renderAnnouncementCard(getDynamicAnnouncement(currentPrayer.name, nextPrayer.name));
  renderStatusCard(state.masjidStatus);
}

function updateDashboard() {
  // New UI: focus + rings countdown
  updatePrayerZonesAndCountdown();

  // Schedule card: highlight CURRENT ACTIVE prayer row only
  if (state.prayerTimes) {
    const now = new Date();
    const currentPrayer = getCurrentPrayer(state.prayerTimes, now);
    renderScheduleGrid(state.prayerTimes, now, currentPrayer.name);
  }

  renderStatusCard(state.masjidStatus);
  updateLastUpdated();
}

function startCountdown() {
  setInterval(() => {
    updateTopInfo();

    const now = new Date();

    // Muat turun automatik data API setiap kali hari bertukar (tengah malam)
    if (state.lastFetchDay && now.getDate() !== state.lastFetchDay) {
      // Jika tiada internet/gagal, kiat hadkan percubaan semula kepada setiap 1 minit (60000ms) untuk elak spam API
      if (now.getTime() - state.lastFetchAttemptTime > 60000) {
        console.log('Pertukaran hari dikesan! Memuat turun jadual solat baharu...');
        state.lastFetchAttemptTime = now.getTime();
        loadPrayerTimes(); // state.lastFetchDay hanya akan dikemas kini di dalam loadPrayerTimes() jika berjaya
      }
    }

    if (!state.nextPrayerTime) return;

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
