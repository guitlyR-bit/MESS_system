import { localDateKey } from '@/lib/mockData';

export interface CzechHoliday {
  dateKey: string;
  name: string;
}

/** Velikonoční neděle (Gregoriánský kalendář) */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fixedHoliday(year: number, month: number, day: number, name: string): CzechHoliday {
  const d = new Date(year, month - 1, day);
  return { dateKey: localDateKey(d), name };
}

/** Všechny státní svátky ČR pro daný rok */
export function getCzechHolidaysForYear(year: number): CzechHoliday[] {
  const easter = easterSunday(year);
  return [
    fixedHoliday(year, 1, 1, 'Nový rok'),
    fixedHoliday(year, 5, 1, 'Svátek práce'),
    fixedHoliday(year, 5, 8, 'Den vítězství'),
    fixedHoliday(year, 7, 5, 'Den slovanských věrozvěstů Cyrila a Metoděje'),
    fixedHoliday(year, 7, 6, 'Den upálení mistra Jana Husa'),
    { dateKey: localDateKey(addDays(easter, -2)), name: 'Velký pátek' },
    { dateKey: localDateKey(addDays(easter, 1)), name: 'Velikonoční pondělí' },
    fixedHoliday(year, 9, 28, 'Den české státnosti'),
    fixedHoliday(year, 10, 28, 'Den vzniku samostatného československého státu'),
    fixedHoliday(year, 11, 17, 'Den boje za svobodu a demokracii'),
    fixedHoliday(year, 12, 24, 'Štědrý den'),
    fixedHoliday(year, 12, 25, '1. svátek vánoční'),
    fixedHoliday(year, 12, 26, '2. svátek vánoční'),
  ];
}

const cache = new Map<number, Map<string, CzechHoliday>>();

function holidayMapForYear(year: number): Map<string, CzechHoliday> {
  let map = cache.get(year);
  if (!map) {
    map = new Map(getCzechHolidaysForYear(year).map(h => [h.dateKey, h]));
    cache.set(year, map);
  }
  return map;
}

export function getCzechHoliday(dateKey: string): CzechHoliday | undefined {
  const year = Number(dateKey.slice(0, 4));
  return holidayMapForYear(year).get(dateKey);
}

export function isCzechPublicHoliday(dateKey: string): boolean {
  return !!getCzechHoliday(dateKey);
}

/** Nadcházející státní svátky od dnešního dne (včetně) */
export function getUpcomingCzechHolidays(count = 8, fromDate = new Date()): CzechHoliday[] {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const result: CzechHoliday[] = [];
  const years = new Set([start.getFullYear(), start.getFullYear() + 1]);

  for (const year of years) {
    for (const h of getCzechHolidaysForYear(year)) {
      const d = parseDateKey(h.dateKey);
      if (d >= start) result.push(h);
    }
  }

  result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return result.slice(0, count);
}

/** Svátky v rozsahu včetně obou konců (YYYY-MM-DD) */
export function getCzechHolidaysInRange(fromKey: string, toKey: string): CzechHoliday[] {
  const fromYear = Number(fromKey.slice(0, 4));
  const toYear = Number(toKey.slice(0, 4));
  const result: CzechHoliday[] = [];

  for (let y = fromYear; y <= toYear; y++) {
    for (const h of getCzechHolidaysForYear(y)) {
      if (h.dateKey >= fromKey && h.dateKey <= toKey) result.push(h);
    }
  }
  return result;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtHolidayDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

export function holidayTreatmentLabel(treatment: 'weekday' | 'weekend'): string {
  return treatment === 'weekday' ? 'jako pracovní den' : 'jako víkend';
}
