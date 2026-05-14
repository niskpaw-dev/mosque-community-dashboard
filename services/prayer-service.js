import { CONFIG, validatePrayerData, normalizePrayerData } from '../utils/prayer-utils.js';

export async function fetchPrayerTimes() {
  const response = await fetch(CONFIG.apiUrl);

  if (!response.ok) {
    throw new Error(`Prayer API request failed with status ${response.status}`);
  }

  const json = await response.json();

  if (!validatePrayerData(json)) {
    throw new Error('Invalid prayer data from API');
  }

  return normalizePrayerData(json.prayers, new Date());
}
