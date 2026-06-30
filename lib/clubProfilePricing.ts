import type { ClubSettings, PricingCategory } from '@/types/database';
import { localDateKey } from '@/lib/mockData';
import {
  formatPricingCategorySummary,
  isPricingCategoryEffective,
  pricingSportLabel,
  resolvePricingCategoryColorHex,
} from '@/lib/pricing';
import { getEffectiveSeasonId, SEASON_LABELS } from '@/lib/clubSeason';

export interface ClubPricingProfileLine {
  id: string;
  name: string;
  priceLabel: string;
  summary: string;
  sportLabel: string;
  color: string;
  isEffective: boolean;
}

export interface ClubPricingProfile {
  seasonLabel?: string;
  lines: ClubPricingProfileLine[];
  priceRangeLabel: string | null;
  hasPricing: boolean;
}

function buildPriceRangeLabel(categories: PricingCategory[]): string | null {
  if (categories.length === 0) return null;
  const prices = categories.map(c => c.price_per_hour);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min} Kč/hod`;
  return `${min}–${max} Kč/hod`;
}

/** Ceník z rezervačního systému pro záložku Profil a náhled */
export function buildClubPricingProfile(
  settings: ClubSettings,
  refDate = new Date(),
): ClubPricingProfile {
  const todayKey = localDateKey(refDate);
  const categories = (settings.pricingCategories ?? [])
    .filter(c => c.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const effectiveCategories = categories.filter(c =>
    isPricingCategoryEffective(c, settings, todayKey),
  );

  const lines: ClubPricingProfileLine[] = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    priceLabel: `${cat.price_per_hour} Kč/hod`,
    summary: formatPricingCategorySummary(cat),
    sportLabel: pricingSportLabel(cat.sport),
    color: resolvePricingCategoryColorHex(cat.color),
    isEffective: isPricingCategoryEffective(cat, settings, todayKey),
  }));

  return {
    seasonLabel: settings.seasonalModeEnabled
      ? SEASON_LABELS[getEffectiveSeasonId(todayKey, settings)]
      : undefined,
    lines,
    priceRangeLabel: buildPriceRangeLabel(effectiveCategories),
    hasPricing: lines.length > 0,
  };
}
