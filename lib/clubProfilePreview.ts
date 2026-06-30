import type { Club, ClubSettings } from '@/types/database';
import { buildClubOpeningHoursProfile } from '@/lib/clubProfileHours';
import { buildGoogleMapsUrl, formatClubAddressLine } from '@/lib/clubMaps';
import { buildClubAmenitiesSummary } from '@/lib/clubAmenities';
import { buildClubPricingProfile } from '@/lib/clubProfilePricing';

export function buildClubProfilePreviewModel(
  profile: Club,
  settings?: ClubSettings,
) {
  const hours = settings ? buildClubOpeningHoursProfile(settings) : null;
  const amenities = buildClubAmenitiesSummary(profile);
  const pricing = settings ? buildClubPricingProfile(settings) : null;
  const instagramUrl = profile.instagram
    ? `https://instagram.com/${profile.instagram.replace(/^@/, '')}`
    : null;
  const websiteUrl = profile.website?.trim()
    ? (profile.website.startsWith('http') ? profile.website : `https://${profile.website}`)
    : null;

  return {
    profile,
    addressLine: formatClubAddressLine(profile),
    mapsUrl: buildGoogleMapsUrl(profile),
    instagramUrl,
    websiteUrl,
    hours,
    amenities,
    pricing,
  };
}
