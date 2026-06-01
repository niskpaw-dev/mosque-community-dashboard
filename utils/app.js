﻿﻿﻿// Import Anime.js melalui CDN (Sesuai untuk Vanilla JS tanpa Node.js bundler)
import anime from 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.es.js';

import { CONFIG, getCurrentPrayer, getNextPrayer, getActiveHijri } from './prayer-utils.js';

import { fetchPrayerTimes } from '../services/prayer-service.js';
import { fetchWeather } from '../services/weather-service.js';
import { getCurrentTime, getHijriDate } from '../services/time-service.js';
import { renderHeader } from '../components/Header.js';
import { renderScheduleGrid } from '../components/PrayerCard.js';

const state = {
  prayerTimes: null,
  hijriDate: null,
  currentRecord: null,
  nextRecord: null,
  currentPrayerName: null,
  currentPrayerTime: null,
  nextPrayerName: null,
  nextPrayerTime: null,
  isIqamah: false,
  weather: null,
  lastFetchDay: null,
  lastFetchAttemptTime: 0,
};

const topInfo = {
  // Legacy chips (new UI may not include these ids)
  currentTime: document.getElementById('currentTime'),
  hijriDate: document.getElementById('hijriDate'),
  weatherStatus: document.getElementById('weatherStatus')
};

const topDateEls = {
  miladiHijriDate: document.getElementById('miladiHijriDate')
};

const focusEls = {
  activeBadge: document.getElementById('activePrayerBadge'),
  nextName: document.getElementById('nextPrayerFocus'),
  nextArabic: document.getElementById('nextPrayerArabicFocus'),
  nextTime: document.getElementById('nextPrayerTimeFocus'),
  nextLabel: document.querySelector('.hero-next__label'),
  currentPrayerList: document.getElementById('currentPrayerList'),
};


const ringEls = {
  jam: document.getElementById('timerJam'),
  minit: document.getElementById('timerMinit'),
  saat: document.getElementById('timerSaat'),
  cards: Array.from(document.querySelectorAll('.ring-card'))
};

// Konfigurasi Slideshow (Iklan/Poster)
// Nota: Gantikan URL di bawah dengan 'assets/iklan1.jpg' dan sebagainya nanti
const POSTERS = [
  { type: 'image', url: 'https://images.unsplash.com/photo-1564683214964-b31c990f1bc2?auto=format&fit=crop&w=1920&q=80' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1920&q=80' },
  { type: 'image', url: 'https://images.unsplash.com/photo-1590076214995-17bd36856cb9?auto=format&fit=crop&w=1920&q=80' }
];
let currentPosterIndex = 0;
let isPosterMode = false;
let modeTimer = 0; // saat
let slidesShown = 0; // Jejaki berapa banyak media (gambar/video) telah ditayang
const DISPLAY_DASHBOARD_SEC = 15; // Masa tayangan jadual (15 saat)
const SLIDE_DURATION_SEC = 15;    // Masa setiap 1 gambar iklan (15 saat)

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
    const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    const dayName = days[now.getDay()];
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthName = months[now.getMonth()];
    const yearStr = now.getFullYear();
    const miladi = `${dayName}, ${dayStr} ${monthName} ${yearStr}`;

    const hijri = state.hijriDate || getHijriDate(now);
    topDateEls.miladiHijriDate.textContent = `${miladi} | ${hijri}H`;
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

  // --- LOGIK FLIP CLOCK WAKTU SEMASA ---
  let hh = now.getHours();
  let mm = now.getMinutes();
  let ss = now.getSeconds();
  const ampm = hh >= 12 ? 'PM' : 'AM';

  hh = String(hh % 12 || 12).padStart(2, '0');
  mm = String(mm).padStart(2, '0');
  ss = String(ss).padStart(2, '0');

  const elH = document.getElementById('flipHour');
  const elM = document.getElementById('flipMinute');
  const elS = document.getElementById('flipSecond');
  const elAmpm = document.getElementById('flipAmpm');

  const updateFlipCard = (el, val) => {
    if (el && el.textContent !== val) {
      el.textContent = val;
      el.classList.remove('flip-animate');
      void el.offsetWidth; // Trigger browser reflow paksa animasi diulang
      el.classList.add('flip-animate');
    }
  };

  updateFlipCard(elH, hh);
  updateFlipCard(elM, mm);
  updateFlipCard(elS, ss);
  updateFlipCard(elAmpm, ampm);
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

  // --- LOGIK IQAMAH (10 MINIT) ---
  const isFriday = now.getDay() === 5;
  const fardhuPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const isFardhu = fardhuPrayers.includes(currentPrayer.name);
  const skipIqamah = currentPrayer.name === 'Dhuhr' && isFriday; // Solat Jumaat (tiada hitung mundur Iqamah)

  let targetTime = state.nextPrayerTime;
  state.isIqamah = false;

  if (isFardhu && !skipIqamah && state.currentPrayerTime) {
    const iqamahTime = new Date(state.currentPrayerTime.getTime() + 10 * 60 * 1000); // 10 minit
    if (now < iqamahTime) {
      state.isIqamah = true;
      targetTime = iqamahTime;
    }
  }

  // Kemas kini atribut tema supaya UI (gelang) bertukar warna mengikut waktu
  let themeName = nextPrayer.name;
  if (themeName === 'Dhuhr' && isFriday) {
    themeName = 'Dhuhr-Jumaat';
  }

  if (state.isIqamah) {
    // Semasa Iqamah, kekalkan tema warna waktu solat sekarang
    themeName = currentPrayer.name;
  }
  document.body.setAttribute('data-next-prayer', themeName);

  // 1) NEXT UPCOMING PRAYER / IQAMAH
  if (state.isIqamah) {
    if (focusEls.nextLabel) focusEls.nextLabel.textContent = 'IQAMAH BERMULA DALAM';
    if (focusEls.nextArabic) focusEls.nextArabic.textContent = 'إقامة';
    if (focusEls.nextName) focusEls.nextName.textContent = 'Menunggu Solat';
    if (focusEls.nextTime) focusEls.nextTime.textContent = targetTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else {
    if (focusEls.nextLabel) focusEls.nextLabel.textContent = 'WAKTU SOLAT SETERUSNYA';
    if (focusEls.nextArabic) focusEls.nextArabic.textContent = CONFIG.arabic[nextPrayer.name] || '—';
    if (focusEls.nextName) focusEls.nextName.textContent = CONFIG.translation[nextPrayer.name] || nextPrayer.name || '—';
    if (focusEls.nextTime) focusEls.nextTime.textContent = nextPrayer.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // 3) COUNTDOWN TO TARGET TIME
  const secondsLeft = Math.max(0, (targetTime - now) / 1000);
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

function setupIklanUploader() {
  // 1. Cipta Butang Muat Naik dari UI
  const uploaderBtn = document.createElement('label');
  uploaderBtn.className = 'upload-iklan-btn';
  uploaderBtn.innerHTML = '✨ Muat Naik Media <input type="file" accept="image/*,video/mp4,video/webm" multiple style="display:none;">';
  
  // 2. Gantikan array POSTERS apabila fail dipilih
  uploaderBtn.querySelector('input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Bersihkan memori (Revoke blob URL) untuk fail lama mengelak memory leak (kebocoran memori) pada Smart TV
      POSTERS.forEach(p => {
        if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
      });
      POSTERS.length = 0; // Buang fail media hardcode yang sedia ada
      files.forEach(file => {
        const isVideo = file.type.startsWith('video/');
        POSTERS.push({ type: isVideo ? 'video' : 'image', url: URL.createObjectURL(file) }); // Bina URL unik untuk media
      });
      currentPosterIndex = 0;
      alert(`${files.length} fail media berjaya dimuat naik dan akan dimainkan pada putaran seterusnya!`);
    }
  });
  
  const scheduleCard = document.querySelector('.schedule-card');
  if (scheduleCard) {
    scheduleCard.appendChild(uploaderBtn);
  } else {
    document.body.appendChild(uploaderBtn);
  }

  // --- LOGIK AUTO-SEMBUNYI BUTANG ---
  let hideBtnTimeout;
  const resetBtnTimeout = () => {
    // Munculkan butang
    uploaderBtn.style.opacity = '1';
    uploaderBtn.style.pointerEvents = 'auto';
    
    clearTimeout(hideBtnTimeout);
    // Sembunyikan selepas 60,000ms (1 minit)
    hideBtnTimeout = setTimeout(() => {
      uploaderBtn.style.opacity = '0';
      uploaderBtn.style.pointerEvents = 'none';
    }, 60000); 
  };

  // Kesan pergerakan tetikus atau sentuhan untuk munculkan butang semula
  window.addEventListener('mousemove', resetBtnTimeout);
  window.addEventListener('touchstart', resetBtnTimeout);
  resetBtnTimeout(); // Mulakan kiraan 1 minit pertama

  // 3. Pindahkan Slideshow Kontena ke dalam Hero Card (Kad Kiri)
  const posterContainer = document.getElementById('posterSlideshow');
  const heroCard = document.querySelector('.hero-card');
  if (posterContainer && heroCard) {
    heroCard.appendChild(posterContainer);
  }
}

async function init() {
  console.log('Waktu Solat app start');
  renderHeader();

  updateTopInfo();
  setupIklanUploader();

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
  state.currentPrayerTime = currentPrayer.date;
  state.nextPrayerName = nextPrayer.name;
  state.nextPrayerTime = nextPrayer.date;
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

  updateLastUpdated();
}

function startCountdown() {
  setInterval(() => {
    updateTopInfo();

    const now = new Date();

    // --- LOGIK SLIDESHOW IKLAN ---
    const posterContainer = document.getElementById('posterSlideshow');
    const posterImage = document.getElementById('posterImage');
    const posterVideo = document.getElementById('posterVideo');
    const posterCountdown = document.getElementById('posterCountdown');

    if (posterContainer && posterImage && POSTERS.length > 0) {
      let secondsToNextPrayer = 9999;
      if (state.nextPrayerTime) {
        secondsToNextPrayer = (state.nextPrayerTime - now) / 1000;
      }

      // Jangan tayang iklan jika masa < 10 minit (600 saat) ke azan ATAU sedang menunggu Iqamah
      if (secondsToNextPrayer <= 600 || state.isIqamah) {
        if (isPosterMode) {
          isPosterMode = false;
          modeTimer = 0;
          slidesShown = 0;
          posterContainer.classList.add('hidden');
          if (posterVideo) posterVideo.pause();
        }
      } else {
        modeTimer++;
        if (!isPosterMode) {
          // Mod Jadual
          if (modeTimer >= DISPLAY_DASHBOARD_SEC) {
            isPosterMode = true;
            modeTimer = 0;
            slidesShown = 1;
            posterContainer.classList.remove('hidden');

            const media = POSTERS[currentPosterIndex];
            posterVideo.loop = false; // Matikan loop agar video boleh tamat (ended)
            if (media.type === 'video') {
              posterImage.style.display = 'none';
              posterVideo.style.display = 'block';
              posterVideo.src = media.url;
              posterVideo.play().catch(e => console.warn('Gagal putar video', e));
            } else {
              posterVideo.style.display = 'none';
              posterVideo.pause();
              posterImage.style.display = 'block';
              posterImage.src = media.url;
            }
          }
        } else {
          // Mod Iklan / Slideshow
          const media = POSTERS[currentPosterIndex];
          let slideIsDone = false;
          let remaining = 0;

          if (media.type === 'video') {
            const duration = isNaN(posterVideo.duration) ? 0 : posterVideo.duration;
            const currentTime = posterVideo.currentTime || 0;
            remaining = Math.max(0, Math.ceil(duration - currentTime));
            
            // Video akan bermain sehingga habis (ended)
            if (posterVideo.ended) {
              slideIsDone = true;
            } else if (modeTimer > 3 && (posterVideo.paused || duration === 0)) {
              // Fallback keselamatan: Skip jika video rosak / gagal dimainkan selepas 3 saat
              slideIsDone = true;
            }
          } else {
            // Gambar kekal 15 saat
            remaining = Math.max(0, SLIDE_DURATION_SEC - modeTimer);
            if (modeTimer >= SLIDE_DURATION_SEC) {
              slideIsDone = true;
            }
          }

          if (posterCountdown) posterCountdown.textContent = remaining;

          if (slideIsDone) {
            if (slidesShown >= POSTERS.length) {
              // Tamat kitaran kesemua iklan, kembali ke jadual
              isPosterMode = false;
              modeTimer = 0;
              slidesShown = 0;
              posterContainer.classList.add('hidden');
              posterVideo.pause();
              currentPosterIndex = (currentPosterIndex + 1) % POSTERS.length;
            } else {
              // Tukar ke media iklan seterusnya
              currentPosterIndex = (currentPosterIndex + 1) % POSTERS.length;
              slidesShown++;
              modeTimer = 0;
              
              const nextMedia = POSTERS[currentPosterIndex];
              let targetEl;

              posterVideo.loop = false; // Matikan loop
              if (nextMedia.type === 'video') {
                posterImage.style.display = 'none';
                posterVideo.style.display = 'block';
                posterVideo.src = nextMedia.url;
                posterVideo.play().catch(e => console.warn('Gagal putar video', e));
                targetEl = posterVideo;
              } else {
                posterVideo.style.display = 'none';
                posterVideo.pause();
                posterImage.style.display = 'block';
                posterImage.src = nextMedia.url;
                targetEl = posterImage;
              }

              // Animasi pertukaran media (gambar/video) menggunakan Anime.js
              anime({
                targets: targetEl,
                translateX: ['100%', '0%'], // Slaid masuk dari arah kanan
                opacity: [0.5, 1],
                duration: 1000,
                easing: 'easeOutExpo'
              });
            }
          }
        }
      }
    }
    // --- TAMAT LOGIK SLIDESHOW ---

    // Hard-refresh (Muat semula) pada pukul 3:00 pagi setiap hari untuk mencuci memori (RAM) Smart TV
    if (now.getHours() === 3 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      console.log('Penyelenggaraan harian: Memuat semula sistem...');
      window.location.reload(true);
    }

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

// Auto-refresh secara paksa apabila TV kembali mendapat sambungan internet
window.addEventListener('online', () => {
  console.log('Internet kembali pulih. Memuat semula (refresh) sistem...');
  window.location.reload();
});

window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
