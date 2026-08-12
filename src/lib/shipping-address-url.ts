export type MapsCoordinates = { lat: number; lng: number };

export function parseMapsCoordinateUrl(value: string): MapsCoordinates | null {
  try {
    const url = new URL(value.trim());
    const query = url.searchParams.get('q') ?? url.searchParams.get('query');
    const match = query?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    return { lat, lng };
  } catch {
    return null;
  }
}

export function appendMapsReference(reference: string, mapsUrl: string): string {
  const line = `Ubicación Google Maps: ${mapsUrl.trim()}`;
  const current = reference.trim();
  if (current.includes(line)) return current;
  return current ? `${current}\n\n${line}` : line;
}
