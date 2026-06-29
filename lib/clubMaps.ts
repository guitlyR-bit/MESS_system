import type { Club } from '@/types/database';

export function formatClubAddressLine(
  club: Pick<Club, 'address' | 'city' | 'country'>,
): string {
  return [club.address, club.city, club.country].filter(Boolean).join(', ');
}

/** URL pro otevření polohy v Google Maps */
export function buildGoogleMapsUrl(club: Pick<
  Club,
  'address' | 'city' | 'country' | 'latitude' | 'longitude' | 'name'
>): string {
  if (club.latitude != null && club.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${club.latitude},${club.longitude}`;
  }
  const parts = [club.name, club.address, club.city, club.country].filter(Boolean);
  const query = encodeURIComponent(parts.join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function formatCoordinates(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null) return 'Nenastaveno';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
