const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=3.3783&longitude=101.2508&current_weather=true&timezone=Asia%2FKuala_Lumpur';

export async function fetchWeather() {
  const response = await fetch(WEATHER_API_URL);
  const json = await response.json();
  const weather = json.current_weather;

  if (!weather || typeof weather.temperature !== 'number') {
    throw new Error('Invalid weather data');
  }

  return {
    temperature: Math.round(weather.temperature),
    code: weather.weathercode,
    label: mapWeatherCode(weather.weathercode),
    icon: mapWeatherIcon(weather.weathercode)
  };
}

function mapWeatherCode(code) {
  if (code === 0) return 'Cerah';
  if ([1, 2, 3].includes(code)) return 'Berawan';
  if ([45, 48].includes(code)) return 'Berkabus';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Hujan lembut';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Hujan';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Salji';
  if ([95, 96, 99].includes(code)) return 'Ribut petir';
  return 'Cuaca tidak menentu';
}

function mapWeatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1, 2, 3].includes(code)) return '⛅';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}
