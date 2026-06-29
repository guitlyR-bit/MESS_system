const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '1',
    countrycodes: 'cz',
    addressdetails: '0',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MESS-tennis-platform/1.0 (club profile geocoding)',
    },
  });

  if (!response.ok) {
    throw new Error('Geocoding služba neodpověděla. Zkuste to znovu.');
  }

  const data = await response.json() as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  const hit = data[0];
  if (!hit) return null;

  const latitude = parseFloat(hit.lat);
  const longitude = parseFloat(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    displayName: hit.display_name ?? trimmed,
  };
}
