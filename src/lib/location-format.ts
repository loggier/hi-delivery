const STATIONARY_SPEED_THRESHOLD_KMH = 3;

export function speedKmhFromMetersPerSecond(speedMps: number | null | undefined) {
  if (typeof speedMps !== 'number' || !Number.isFinite(speedMps) || speedMps < 0) {
    return null;
  }

  const speedKmh = speedMps * 3.6;
  return speedKmh < STATIONARY_SPEED_THRESHOLD_KMH ? 0 : speedKmh;
}

export function formatSpeedKmh(speedMps: number | null | undefined) {
  const speedKmh = speedKmhFromMetersPerSecond(speedMps);
  return speedKmh === null ? null : `${speedKmh.toFixed(1)} km/h`;
}
