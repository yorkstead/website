import { fetchJSON, type Fetcher } from "@/lib/morning-briefing/sources/http";
import type { ForecastPeriod, SourceResult, WeatherLocation } from "@/lib/morning-briefing/types";

const locations = [
  { city: "Golden" as const, latitude: 39.7555, longitude: -105.2211 },
  { city: "Denver" as const, latitude: 39.7392, longitude: -104.9903 },
];

type PointsResponse = { properties?: { forecast?: unknown } };
type ForecastResponse = { properties?: { periods?: unknown } };

function forecastURL(value: unknown) {
  if (typeof value !== "string") throw new Error("NWS point response is missing forecast URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "api.weather.gov") throw new Error("NWS returned an unexpected forecast host");
  return url.toString();
}

export function normalizeForecastPeriods(value: unknown): ForecastPeriod[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const row = candidate as Record<string, unknown>;
    if (typeof row.name !== "string" || !Number.isFinite(Number(row.temperature)) || typeof row.shortForecast !== "string") return [];
    const wind = [row.windSpeed, row.windDirection].filter((item) => typeof item === "string" && item.trim()).join(" ");
    return [{
      name: row.name,
      temperature: Number(row.temperature),
      temperatureUnit: typeof row.temperatureUnit === "string" ? row.temperatureUnit : "F",
      shortForecast: row.shortForecast,
      wind: wind || "light wind",
    }];
  }).slice(0, 4);
}

async function loadLocation(location: (typeof locations)[number], fetcher: Fetcher): Promise<WeatherLocation> {
  const headers = { Accept: "application/geo+json", "User-Agent": "YorksteadMorningBriefing/1.0 (https://yorkstead.com)" };
  const point = await fetchJSON<PointsResponse>(`https://api.weather.gov/points/${location.latitude},${location.longitude}`, { headers }, fetcher);
  const forecast = await fetchJSON<ForecastResponse>(forecastURL(point.properties?.forecast), { headers }, fetcher);
  const periods = normalizeForecastPeriods(forecast.properties?.periods);
  if (!periods.length) throw new Error("NWS forecast contained no usable periods");
  return { city: location.city, periods };
}

export async function loadWeatherSource(fetcher: Fetcher = fetch): Promise<SourceResult<WeatherLocation[]>> {
  const settled = await Promise.allSettled(locations.map((location) => loadLocation(location, fetcher)));
  const value = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!value.length) return { status: "unavailable", value: [] };
  return { status: value.length === locations.length ? "ok" : "partial", value };
}
