import { useEffect, useState } from "react";
import type { Port } from "../api/apiSlice";

// Real current sea-state data from Open-Meteo Marine (free, no API key,
// public CORS). Not every port has ocean coverage in the model grid - an
// inland/riverine port (e.g. one sitting up a river mouth) can come back
// with every field null, which is handled as "no data" rather than 0.
export interface MarineWeather {
  waveHeightM: number | null;
  windWaveHeightM: number | null;
  swellWaveHeightM: number | null;
  wavePeriodS: number | null;
}

export type MarineWeatherStatus = "idle" | "loading" | "live" | "error";

const MARINE_API_URL = "https://marine-api.open-meteo.com/v1/marine";

export function useMarineWeather(ports: Port[] | undefined, enabled: boolean) {
  const [weatherByPort, setWeatherByPort] = useState<Map<string, MarineWeather>>(
    new Map(),
  );
  const [status, setStatus] = useState<MarineWeatherStatus>("idle");

  useEffect(() => {
    // Nothing to fetch while disabled - resetting state from a previous
    // enabled run is handled by that run's own cleanup below, not here.
    if (!enabled || !ports || ports.length === 0) {
      return;
    }

    let cancelled = false;

    function fetchWeather(portList: Port[]) {
      setStatus("loading");

      const lats = portList.map((p) => p.latitude).join(",");
      const lons = portList.map((p) => p.longitude).join(",");
      const params = new URLSearchParams({
        latitude: lats,
        longitude: lons,
        current: "wave_height,wind_wave_height,swell_wave_height,wave_period",
      });

      fetch(`${MARINE_API_URL}?${params.toString()}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Marine API error: ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (cancelled) return;
          // A single-port request returns one object, not an array.
          const entries = Array.isArray(json) ? json : [json];
          const next = new Map<string, MarineWeather>();
          portList.forEach((port, i) => {
            const current = entries[i]?.current;
            next.set(port.id, {
              waveHeightM: current?.wave_height ?? null,
              windWaveHeightM: current?.wind_wave_height ?? null,
              swellWaveHeightM: current?.swell_wave_height ?? null,
              wavePeriodS: current?.wave_period ?? null,
            });
          });
          setWeatherByPort(next);
          setStatus("live");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }
    fetchWeather(ports);

    return () => {
      cancelled = true;
      setWeatherByPort(new Map());
      setStatus("idle");
    };
    // RTK Query only returns a new `ports` reference when the underlying
    // cache data actually changes, so depending on it directly here is
    // safe - it won't refetch on every unrelated re-render.
  }, [enabled, ports]);

  return { weatherByPort, status };
}
