export const CONFIG = {
  apiUrl: 'https://api.waktusolat.app/v2/solat/SGR03',
  prayerOrder: ['Imsak', 'Fajr', 'Syuruk', 'Dhuha', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
  translation: {
    Imsak: 'Imsak',
    Fajr: 'Subuh',
    Syuruk: 'Syuruk',
    Dhuha: 'Dhuha',
    Dhuhr: 'Zohor',
    Asr: 'Asar',
    Maghrib: 'Maghrib',
    Isha: 'Isyak'
  }
};

export function validatePrayerData(json) {
  return Array.isArray(json?.prayers) && json.prayers.length > 0;
}

// Cipta formatter di luar untuk elak bebanan CPU yang tinggi (Intl.DateTimeFormat amat berat jika dipanggil berulang kali)
const myDateFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: 'Asia/Kuala_Lumpur',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

export function normalizePrayerData(prayers, referenceDate) {
  const referenceParts = myDateFormatter.format(referenceDate);
  const currentRecord = prayers.find((entry) => compareMalaysiaDate(entry.fajr, referenceParts));

  if (!currentRecord) {
    throw new Error("Today's prayer schedule is not available");
  }

  const currentIndex = prayers.indexOf(currentRecord);
  const nextRecord = prayers[currentIndex + 1] || currentRecord;
  const hijri = getActiveHijri(currentRecord, nextRecord, referenceDate);

  return {
    prayerTimes: {
      Imsak: formatPrayerTimestamp(currentRecord.fajr - 600), // -10 minit (600 saat)
      Fajr: formatPrayerTimestamp(currentRecord.fajr),
      Syuruk: formatPrayerTimestamp(currentRecord.syuruk),
      Dhuha: formatPrayerTimestamp(currentRecord.syuruk + 1800), // +30 minit (1800 saat)
      Zawal: formatPrayerTimestamp(currentRecord.dhuhr - 600), // -10 minit (600 saat)
      Dhuhr: formatPrayerTimestamp(currentRecord.dhuhr),
      Asr: formatPrayerTimestamp(currentRecord.asr),
      Maghrib: formatPrayerTimestamp(currentRecord.maghrib),
      Isha: formatPrayerTimestamp(currentRecord.isha)
    },
    hijriDate: hijri,
    currentRecord,
    nextRecord
  };
}

function compareMalaysiaDate(timestamp, referenceParts) {
  // Hanya formatkan masa rekod sahaja, masa rujukan (referenceParts) diterima terus dari parameter
  const recordParts = myDateFormatter.format(new Date(timestamp * 1000));
  return referenceParts === recordParts;
}

export function getActiveHijri(currentRecord, nextRecord, referenceDate) {
  const maghribTime = new Date(currentRecord.maghrib * 1000);
  const hijriString = referenceDate >= maghribTime ? nextRecord.hijri : currentRecord.hijri;
  return formatHijriDate(hijriString);
}

function formatHijriDate(hijriString) {
  const [year, month, day] = hijriString.split('-').map(Number);
  const hijriMonths = [
    'Muharram',
    'Safar',
    'Rabiulawal',
    'Rabiulakhir',
    'Jamadilawal',
    'Jamadilakhir',
    'Rejab',
    'Syaaban',
    'Ramadhan',
    'Syawal',
    'Zulkaedah',
    'Zulhijjah'
  ];
  const monthName = hijriMonths[month - 1] || '';
  return `${day} ${monthName} ${year}`;
}

function formatPrayerTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function createPrayerDate(timeString, referenceDate) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function getPrayerSchedule(prayerTimes, referenceDate) {
  return CONFIG.prayerOrder.map((name) => ({
    name,
    date: createPrayerDate(prayerTimes[name], referenceDate)
  }));
}

export function getPreviousPrayer(prayerTimes, now) {
  const schedule = getPrayerSchedule(prayerTimes, now);
  const passed = schedule.filter((entry) => entry.date <= now);

  if (passed.length > 0) {
    return passed[passed.length - 1];
  }

  const yesterdayIsha = createPrayerDate(prayerTimes.Isha, now);
  yesterdayIsha.setDate(yesterdayIsha.getDate() - 1);
  return { name: 'Isha', date: yesterdayIsha };
}

export function getCurrentPrayer(prayerTimes, now) {
  const schedule = getPrayerSchedule(prayerTimes, now);
  const passed = schedule.filter((entry) => entry.date <= now);

  if (passed.length > 0) {
    return passed[passed.length - 1];
  }

  const yesterdayIsha = createPrayerDate(prayerTimes.Isha, now);
  yesterdayIsha.setDate(yesterdayIsha.getDate() - 1);
  return { name: 'Isha', date: yesterdayIsha };
}

export function getNextPrayer(prayerTimes, now) {
  const schedule = getPrayerSchedule(prayerTimes, now);
  const nextEntry = schedule.find((entry) => entry.date > now);

  if (nextEntry) {
    return nextEntry;
  }

  const nextImsak = createPrayerDate(prayerTimes.Imsak, now);
  nextImsak.setDate(nextImsak.getDate() + 1);
  return { name: 'Imsak', date: nextImsak };
}

export function getProgressPercent(prayerTimes, nextPrayerTime) {
  const now = new Date();
  const previous = getPreviousPrayer(prayerTimes, now);
  const duration = nextPrayerTime - previous.date;
  const elapsed = now - previous.date;
  return duration > 0 ? Math.min(100, Math.max(0, (elapsed / duration) * 100)) : 0;
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hourLabel = hours === 1 ? 'jam' : 'jam';
  const minuteLabel = minutes === 1 ? 'minit' : 'minit';
  const secondLabel = seconds === 1 ? 'saat' : 'saat';

  return `${hours} ${hourLabel} ${minutes} ${minuteLabel} ${seconds} ${secondLabel}`;
}
