import { CONFIG } from '../utils/prayer-utils.js';

export function getMasjidStatus(currentPrayerName, now) {
  if (!currentPrayerName) {
    return 'Menunggu jadual';
  }

  if (currentPrayerName === 'Zawal') {
    return 'Waktu Larangan Solat';
  }

  if (currentPrayerName === 'Imsak') {
    return 'Waktu Imsak';
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
    return 'Sila tunggu sebentar, sistem sedang mengemas kini jadual waktu solat.';
  }

  const currentLabel = CONFIG.translation[currentPrayerName] || currentPrayerName;
  const nextLabel = CONFIG.translation[nextPrayerName] || nextPrayerName;

  if (currentPrayerName === 'Zawal') {
    return "Makluman: Waktu Istiwa' (Zawal) telah masuk. Para jemaah diminta untuk menangguhkan solat sunat seketika sehingga azan Zohor berkumandang.";
  }

  if (currentPrayerName === 'Imsak') {
    return 'Makluman: Waktu Imsak telah tiba. Para jemaah dinasihatkan untuk berhenti bersahur dan bersedia menantikan azan Subuh.';
  }

  const fardhuPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  if (fardhuPrayers.includes(currentPrayerName)) {
    return `Alhamdulillah, waktu ${currentLabel} telah masuk. Sila matikan telefon bimbit anda bagi menghormati azan dan solat. Bersedia menantikan waktu ${nextLabel} seterusnya.`;
  }

  return `Alhamdulillah, kita kini berada di dalam waktu ${currentLabel}. Sila bersedia menantikan waktu ${nextLabel} seterusnya.`;
}
