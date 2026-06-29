import type {
  ClubSettings,
  PricingCategory,
  PricingDayScope,
  PricingSeasonScope,
  PricingSport,
  SportType,
  WeekdayIndex,
} from '@/types/database';
import { isCzechPublicHoliday } from '@/lib/czechHolidays';
import { getEffectiveSeasonId } from '@/lib/clubSeason';
import { resolveCategoryColorHex } from '@/lib/clubCategories';
import { slotToTime, slotEndTime, SPORT_LABELS, CATEGORY_COLORS, localDateKey } from '@/lib/mockData';

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getWeekdayIndex(dateKey: string): WeekdayIndex {
  const d = parseDateKey(dateKey).getDay();
  return (d === 0 ? 6 : d - 1) as WeekdayIndex;
}

export const PRICING_SPORT_OPTIONS: { value: PricingSport; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'tennis', label: 'Tenis' },
  { value: 'squash', label: 'Squash' },
  { value: 'padel', label: 'Padel' },
  { value: 'badminton', label: 'Badminton' },
];

export const PRICING_DAY_SCOPE_OPTIONS: { value: PricingDayScope; label: string }[] = [
  { value: 'weekdays', label: 'Pracovní dny' },
  { value: 'weekend', label: 'Víkend' },
  { value: 'holidays', label: 'Svátky' },
  { value: 'custom', label: 'Vlastní' },
];

export const PRICING_SEASON_OPTIONS: { value: PricingSeasonScope; label: string }[] = [
  { value: 'year_round', label: 'Celoročně' },
  { value: 'summer', label: 'Léto' },
  { value: 'winter', label: 'Zima' },
];

export const PRICING_WEEKDAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const DAY_SCOPE_LABELS: Record<PricingDayScope, string> = {
  weekdays: 'Pracovní dny',
  weekend: 'Víkend',
  holidays: 'Svátky',
  custom: 'Vlastní dny',
};

const SEASON_SCOPE_LABELS: Record<PricingSeasonScope, string> = {
  year_round: 'Celoročně',
  summer: 'Léto',
  winter: 'Zima',
};

export function pricingSportLabel(sport: PricingSport): string {
  if (sport === 'all') return 'Vše';
  return SPORT_LABELS[sport as SportType] ?? sport;
}

export function pricingDayScopeLabel(scope: PricingDayScope): string {
  return DAY_SCOPE_LABELS[scope];
}

export function pricingSeasonScopeLabel(scope: PricingSeasonScope): string {
  return SEASON_SCOPE_LABELS[scope];
}

export function clonePricingCategories(
  src?: PricingCategory[],
): PricingCategory[] | undefined {
  if (!src) return undefined;
  return src.map(c => ({
    ...c,
    court_ids: [...c.court_ids],
    weekdays: c.weekdays ? [...c.weekdays] : undefined,
  }));
}

function sportMatches(categorySport: PricingSport, courtSport: SportType): boolean {
  return categorySport === 'all' || categorySport === courtSport;
}

/** Platí cenová kategorie v dané sezóně (bez kontroly is_active) */
export function isPricingCategorySeasonEffective(
  category: PricingCategory,
  settings: ClubSettings,
  dateKey: string = localDateKey(),
): boolean {
  if (category.season_scope === 'year_round') return true;
  if (!settings.seasonalModeEnabled) return false;
  return category.season_scope === getEffectiveSeasonId(dateKey, settings);
}

/** Efektivně aktivní — is_active a sezónní rozsah odpovídá aktuální sezóně */
export function isPricingCategoryEffective(
  category: PricingCategory,
  settings: ClubSettings,
  dateKey?: string,
): boolean {
  const key = dateKey ?? localDateKey();
  return category.is_active && isPricingCategorySeasonEffective(category, settings, key);
}

function timeMatches(category: PricingCategory, slotIdx: number): boolean {
  if (category.all_day) return true;
  const from = category.time_from_slot ?? 0;
  const to = category.time_to_slot ?? 47;
  return slotIdx >= from && slotIdx <= to;
}

function hasActiveHolidayCategory(
  categories: PricingCategory[],
  courtId: string,
  courtSport: SportType,
  dateKey: string,
  settings: ClubSettings,
): boolean {
  return categories.some(c =>
    isPricingCategoryEffective(c, settings, dateKey)
    && c.day_scope === 'holidays'
    && c.court_ids.includes(courtId)
    && sportMatches(c.sport, courtSport),
  );
}

function matchesDayScope(
  category: PricingCategory,
  dateKey: string,
  settings: ClubSettings,
  categories: PricingCategory[],
  courtId: string,
  courtSport: SportType,
): boolean {
  const dayIdx = getWeekdayIndex(dateKey);
  const isHol = isCzechPublicHoliday(dateKey);

  if (category.day_scope === 'holidays') return isHol;
  if (category.day_scope === 'custom') {
    return category.weekdays?.[dayIdx] === true;
  }

  if (isHol) {
    if (hasActiveHolidayCategory(categories, courtId, courtSport, dateKey, settings)) {
      return false;
    }
    const treatment = settings.holidayTreatment;
    if (category.day_scope === 'weekdays' && treatment === 'weekday') return true;
    if (category.day_scope === 'weekend' && treatment === 'weekend') return true;
    return false;
  }

  if (category.day_scope === 'weekend') return dayIdx >= 5;
  if (category.day_scope === 'weekdays') return dayIdx < 5;
  return false;
}

/** Vyšší = specifičtější pravidlo */
function categorySpecificity(category: PricingCategory): number {
  let score = 0;
  if (category.day_scope === 'holidays') score += 100;
  else if (category.day_scope === 'custom') score += 80;
  else if (category.day_scope === 'weekend' || category.day_scope === 'weekdays') score += 60;
  if (category.sport !== 'all') score += 40;
  if (!category.all_day) score += 30;
  if (category.season_scope !== 'year_round') score += 20;
  score += (category.sort_order ?? 0) * 0.01;
  return score;
}

function categoryMatches(
  category: PricingCategory,
  courtId: string,
  courtSport: SportType,
  dateKey: string,
  slotIdx: number,
  settings: ClubSettings,
  allCategories: PricingCategory[],
): boolean {
  if (!isPricingCategoryEffective(category, settings, dateKey)) return false;
  if (!category.court_ids.includes(courtId)) return false;
  if (!sportMatches(category.sport, courtSport)) return false;
  if (!matchesDayScope(category, dateKey, settings, allCategories, courtId, courtSport)) {
    return false;
  }
  return timeMatches(category, slotIdx);
}

/** Najde nejlepší matching cenovou kategorii pro kurt + datum + slot */
export function resolvePricingCategory(
  courtId: string,
  courtSport: SportType,
  dateKey: string,
  slotIdx: number,
  settings: ClubSettings,
): PricingCategory | undefined {
  const categories = settings.pricingCategories ?? [];
  if (categories.length === 0) return undefined;

  const matches = categories.filter(c =>
    categoryMatches(c, courtId, courtSport, dateKey, slotIdx, settings, categories),
  );
  if (matches.length === 0) return undefined;

  matches.sort((a, b) => categorySpecificity(b) - categorySpecificity(a));
  return matches[0];
}

/** Cena za hodinu pro konkrétní slot (nový systém cenových kategorií) */
export function getSlotPricePerHourFromCategories(
  courtId: string,
  courtSport: SportType,
  dateKey: string,
  slotIdx: number,
  basePricePerHour: number,
  settings: ClubSettings,
): number {
  const category = resolvePricingCategory(
    courtId, courtSport, dateKey, slotIdx, settings,
  );
  return category?.price_per_hour ?? basePricePerHour;
}

/** Celková cena za vybrané sloty (30 min / slot) */
export function calculateSlotsPriceFromCategories(
  courtId: string,
  courtSport: SportType,
  dateKey: string,
  slots: number[],
  basePricePerHour: number,
  settings: ClubSettings,
): number {
  return slots.reduce((sum, slot) => {
    const hourly = getSlotPricePerHourFromCategories(
      courtId, courtSport, dateKey, slot, basePricePerHour, settings,
    );
    return sum + hourly * 0.5;
  }, 0);
}

export function formatPricingCategoryTime(category: PricingCategory): string {
  if (category.all_day) return 'Celý den';
  const from = category.time_from_slot ?? 0;
  const to = category.time_to_slot ?? 47;
  return `${slotToTime(from)}–${slotEndTime(to)}`;
}

export function formatPricingCategoryDays(category: PricingCategory): string {
  if (category.day_scope === 'custom' && category.weekdays) {
    const days = category.weekdays
      .map((on, i) => (on ? PRICING_WEEKDAY_LABELS[i] : null))
      .filter(Boolean);
    return days.length > 0 ? days.join(', ') : 'Vlastní';
  }
  return pricingDayScopeLabel(category.day_scope);
}

export function formatPricingCategorySummary(category: PricingCategory): string {
  return [
    `${category.price_per_hour} Kč/hod`,
    formatPricingCategoryDays(category),
    formatPricingCategoryTime(category),
    pricingSportLabel(category.sport),
    pricingSeasonScopeLabel(category.season_scope),
  ].join(' · ');
}

export function defaultPricingCategoryColor(
  existing: PricingCategory[],
): string {
  const used = new Set(existing.map(c => resolveCategoryColorHex(c.color)));
  return CATEGORY_COLORS.find(c => !used.has(c.hex))?.hex ?? CATEGORY_COLORS[0].hex;
}

export function resolvePricingCategoryColorHex(color?: string): string {
  return resolveCategoryColorHex(color);
}

/** Efektivně aktivní kategorie přiřaditelné kurtu (sport + sezóna + is_active) */
export function getAssignablePricingCategories(
  settings: ClubSettings,
  courtSport: SportType,
  dateKey?: string,
): PricingCategory[] {
  const key = dateKey ?? localDateKey();
  return (settings.pricingCategories ?? [])
    .filter(c =>
      isPricingCategoryEffective(c, settings, key)
      && sportMatches(c.sport, courtSport),
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** ID kategorií přiřazených kurtu (z court_ids) */
export function getPricingCategoryIdsForCourt(
  settings: ClubSettings,
  courtId: string,
): string[] {
  return (settings.pricingCategories ?? [])
    .filter(c => c.court_ids.includes(courtId))
    .map(c => c.id);
}

/** Obousměrná synchronizace court_ids v kategoriích */
export function syncPricingCategoriesForCourt(
  settings: ClubSettings,
  courtId: string,
  categoryIds: string[],
): PricingCategory[] {
  const idSet = new Set(categoryIds);
  return (settings.pricingCategories ?? []).map(cat => {
    const hasCourt = cat.court_ids.includes(courtId);
    const shouldHave = idSet.has(cat.id);
    if (shouldHave && !hasCourt) {
      return { ...cat, court_ids: [...cat.court_ids, courtId] };
    }
    if (!shouldHave && hasCourt) {
      return { ...cat, court_ids: cat.court_ids.filter(id => id !== courtId) };
    }
    return cat;
  });
}

export function defaultCustomWeekdays(): boolean[] {
  return [true, true, true, true, true, false, false];
}
