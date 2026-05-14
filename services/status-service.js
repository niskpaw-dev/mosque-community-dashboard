import { CONFIG } from '../utils/prayer-utils.js';

export function getMasjidStatus(currentPrayerName, now) {
  if (!currentPrayerName) {
    return 'Menunggu jadual';
  }

  const activePrayers = ['Fajr', 'Maghrib', 'Isha'];
  if (activePrayers.includes(currentPrayerName)) {
    return 'Aktif sekarang';
  }

  const hour = now.getHours();
  return hour >= 6 && hour < 20 ? 'Aktif' : 'Buka 24 jam';
}

export function getDynamicAnnouncement(currentPrayerName, nextPrayerName) {
  if (!currentPrayerName || !nextPrayerName) {
    return 'Jadual akan dikemas kini dalam beberapa saat.';
  }

  const currentLabel = CONFIG.translation[currentPrayerName] || currentPrayerName;
  const nextLabel = CONFIG.translation[nextPrayerName] || nextPrayerName;

  return `Sekarang ${currentLabel} sedang dijalankan. Bersedia untuk ${nextLabel} seterusnya.`;
}
