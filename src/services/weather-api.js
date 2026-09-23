import { store } from '../storage/store.js';
import { getLang } from './i18n.js';

/** Servicio del widget de clima usando Open-Meteo (gratis, sin API key). */
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

let geoCache = new Map();
let weatherCache = null;
let weatherCacheTs = 0;

export async function fetchWeather(location) {
  if (!location || !location.trim()) return null;
  const city = location.trim();
  let place = geoCache.get(city.toLowerCase());
  if (!place) {
    const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo buscar la ciudad');
    const data = await res.json();
    place = data.results?.[0] ?? null;
    if (!place) return null;
    geoCache.set(city.toLowerCase(), place);
  }
  const now = Date.now();
  if (weatherCache && weatherCacheTs && now - weatherCacheTs < 600000) return weatherCache;
  const url = `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo obtener el clima');
  const data = await res.json();
  weatherCache = {
    place: place.name,
    country: place.country_code || '',
    temp: data.current?.temperature_2m,
    feels: data.current?.apparent_temperature,
    code: data.current?.weather_code,
    humidity: data.current?.relative_humidity_2m,
    wind: data.current?.wind_speed_10m,
  };
  if (weatherCache.temp == null) return null;
  weatherCacheTs = now;
  return weatherCache;
}

export function weatherLabel(code) {
  const es = {
    0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla helada',
    51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna densa',
    61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
    71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte',
    80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos fuertes',
    95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo',
  };
  const en = {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy',
    45: 'Fog', 48: 'Freezing fog',
    51: 'Drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
  };
  const dict = getLang() === 'en' ? en : es;
  return dict[code] ?? (getLang() === 'en' ? 'Variable sky' : 'Cielo variable');
}
