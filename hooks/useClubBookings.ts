import { useState, useCallback, useEffect } from 'react';
import { getEffectiveClosingSlot, isSlotBookableForCourt } from '@/lib/clubClosure';
import { calculateSlotsPrice } from '@/lib/clubSchedule';
import { applySettingsPatch } from '@/lib/clubSeason';
import {
  assignCourtToCategory,
  createCategory,
  removeCategory,
  syncCourtCategoryIds,
  getCourtIdsInCategory,
  basePriceFromCategoryPricing,
  reorderCategories as reorderCategoriesList,
  reorderCourtsInCategoryList,
  reorderUncategorizedCourtOrder,
  syncUncategorizedCourtOrder,
  getUncategorizedCourts,
} from '@/lib/clubCategories';
import type {
  ClubBooking, ClubSettings, CourtWithClub, DayHoursPartialOverride, PaymentStatus,
  CourtCategory, ClubPricing, OpeningSchedule, CourtSurface, SportType, Season,
} from '@/types/database';
import {
  createMockClubBookings,
  MOCK_COURTS,
  slotToTime,
  slotEndTime,
  SLOT_COUNT,
  localDateKey,
  slotPrice,
} from '@/lib/mockData';
import {
  getClubSettingsSnapshot,
  patchClubSettings,
  subscribeClubSettings,
} from '@/lib/clubSettingsState';

/** Pozice rezervace před přesunem — pro undo ve správci klubu */
export type OriginalBookingPosition = {
  court_id: string;
  date: string;
  slots: number[];
  starts_at: string;
  ends_at: string;
};

export function snapshotBookingPosition(booking: ClubBooking): OriginalBookingPosition {
  return {
    court_id:  booking.court_id,
    date:      booking.date,
    slots:     [...booking.slots],
    starts_at: booking.starts_at,
    ends_at:   booking.ends_at,
  };
}

export function useClubBookings() {
  const [bookings, setBookings]   = useState<ClubBooking[]>(createMockClubBookings);
  const [settings, setSettings]   = useState(() => getClubSettingsSnapshot());

  useEffect(() => subscribeClubSettings(() => setSettings(getClubSettingsSnapshot())), []);
  const [courts,   setCourts]     = useState<CourtWithClub[]>(MOCK_COURTS);

  /** Přesune rezervaci na nový start slot, volitelně i na jiný kurt */
  const moveBooking = useCallback((
    bookingId: string,
    newStartSlot: number,
    newCourtId?: string,
  ) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== bookingId) return b;
      const slotCount    = b.slots.length;
      const clampedStart = Math.max(0, Math.min(SLOT_COUNT - slotCount, newStartSlot));
      const newSlots     = Array.from({ length: slotCount }, (_, i) => clampedStart + i);
      const courtId      = newCourtId ?? b.court_id;
      return {
        ...b,
        court_id:  courtId,
        slots:     newSlots,
        starts_at: `${b.date}T${slotToTime(clampedStart)}:00.000Z`,
        ends_at:   `${b.date}T${slotEndTime(clampedStart + slotCount - 1)}:00.000Z`,
      };
    }));
  }, []);

  /** Aktualizuje detail kurtu (povrch, indoor, cena, …) */
  const updateCourt = useCallback((courtId: string, updates: Partial<CourtWithClub>) => {
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, ...updates } : c));
  }, []);

  /** Aktualizuje nastavení klubu (v sezónním režimu synchronizuje preset aktivní sezóny) */
  const updateSettings = useCallback((updates: Partial<ClubSettings>) => {
    const current = getClubSettingsSnapshot();
    patchClubSettings(applySettingsPatch(current, updates));
  }, []);

  /** Aktualizuje kalendářní sezónu v settings.seasons */
  const updateSeason = useCallback((seasonId: string, partial: Partial<Season>) => {
    const current = getClubSettingsSnapshot();
    updateSettings({
      seasons: (current.seasons ?? []).map(s =>
        s.id === seasonId ? { ...s, ...partial } : s,
      ),
    });
  }, [updateSettings]);

  /** Nastaví override provozní doby pro konkrétní den (jen pole odlišná od výchozího rozvrhu) */
  const setDayOverride = useCallback((dateKey: string, override: DayHoursPartialOverride) => {
    const current = getClubSettingsSnapshot();
    patchClubSettings({
      dayOverrides: { ...current.dayOverrides, [dateKey]: override },
    });
  }, []);

  /** Odstraní override provozní doby pro konkrétní den */
  const clearDayOverride = useCallback((dateKey: string) => {
    const current = getClubSettingsSnapshot();
    if (!current.dayOverrides?.[dateKey]) return;
    const next = { ...current.dayOverrides };
    delete next[dateKey];
    patchClubSettings({ dayOverrides: next });
  }, []);

  /** Nastaví kategoriální override provozní doby pro konkrétní den */
  const setCategoryDayOverride = useCallback((
    categoryId: string,
    dateKey: string,
    override: DayHoursPartialOverride,
  ) => {
    const current = getClubSettingsSnapshot();
    patchClubSettings({
      categoryDayOverrides: {
        ...current.categoryDayOverrides,
        [categoryId]: {
          ...current.categoryDayOverrides?.[categoryId],
          [dateKey]: override,
        },
      },
    });
  }, []);

  /** Odstraní kategoriální override provozní doby */
  const clearCategoryDayOverride = useCallback((categoryId: string, dateKey: string) => {
    const current = getClubSettingsSnapshot();
    const catDates = current.categoryDayOverrides?.[categoryId];
    if (!catDates?.[dateKey]) return;
    const next = { ...catDates };
    delete next[dateKey];
    patchClubSettings({
      categoryDayOverrides: {
        ...current.categoryDayOverrides,
        [categoryId]: next,
      },
    });
  }, []);

  /** Aktualizuje seznam kategorií a synchronizuje category_id na kurtech */
  const updateCategories = useCallback((categories: CourtCategory[]) => {
    const current = getClubSettingsSnapshot();
    const idMap = syncCourtCategoryIds(categories);
    const nextCourts = courts.map(c => ({
      ...c,
      category_id: idMap[c.id],
    }));
    setCourts(nextCourts);
    patchClubSettings({
      categories,
      uncategorizedCourtOrder: syncUncategorizedCourtOrder(
        categories,
        nextCourts,
        current.uncategorizedCourtOrder,
      ),
    });
  }, [courts]);

  /** Vytvoří nový kurt a volitelně ho přiřadí ke kategorii */
  const createCourt = useCallback((params: {
    name: string;
    sport?: SportType;
    surface?: CourtSurface;
    is_indoor?: boolean;
    price_per_hour?: number;
    capacity?: number;
    categoryId?: string | null;
  }): CourtWithClub | null => {
    const trimmedName = params.name.trim();
    if (!trimmedName) return null;

    const template = courts[0];
    const id = `c${Date.now()}`;
    const current = getClubSettingsSnapshot();

    let pricePerHour = params.price_per_hour ?? template?.price_per_hour ?? 250;
    if (params.categoryId) {
      const catPricing = current.categoryPricing?.[params.categoryId];
      if (catPricing) {
        const basePrice = basePriceFromCategoryPricing(catPricing);
        if (basePrice !== null) pricePerHour = basePrice;
      }
    }

    const newCourt: CourtWithClub = {
      id,
      club_id: template?.club_id ?? 'club1',
      club_name: template?.club_name ?? 'TK Sparta Praha',
      club_city: template?.club_city ?? 'Praha 7',
      name: trimmedName,
      sport: params.sport ?? 'tennis',
      surface: params.surface ?? 'clay',
      is_indoor: params.is_indoor ?? false,
      is_active: true,
      price_per_hour: pricePerHour,
      capacity: params.capacity ?? 4,
      category_id: params.categoryId ?? undefined,
      available_today: 0,
      created_at: new Date().toISOString(),
    };

    setCourts(prev => [...prev, newCourt]);

    if (params.categoryId) {
      const next = assignCourtToCategory(current.categories, id, params.categoryId);
      updateCategories(next);
    } else {
      patchClubSettings({
        uncategorizedCourtOrder: syncUncategorizedCourtOrder(
          current.categories,
          [...courts, newCourt],
          current.uncategorizedCourtOrder,
        ),
      });
    }

    return newCourt;
  }, [courts, updateCategories]);

  const saveCategory = useCallback((category: CourtCategory) => {
    const current = getClubSettingsSnapshot();
    const oldCat = current.categories.find(c => c.id === category.id);
    let next = oldCat
      ? current.categories.map(c => c.id === category.id ? category : c)
      : [...current.categories, category];
    for (const courtId of category.court_ids) {
      next = assignCourtToCategory(next, courtId, category.id);
    }
    if (oldCat) {
      for (const courtId of oldCat.court_ids) {
        if (!category.court_ids.includes(courtId)) {
          next = assignCourtToCategory(next, courtId, null);
        }
      }
    }
    updateCategories(next);
  }, [updateCategories]);

  const deleteCategory = useCallback((categoryId: string) => {
    const current = getClubSettingsSnapshot();
    updateCategories(removeCategory(current.categories, categoryId));
  }, [updateCategories]);

  const addCategory = useCallback((name: string, seasonId?: string) => {
    const current = getClubSettingsSnapshot();
    updateCategories(createCategory(current.categories, name, seasonId));
  }, [updateCategories]);

  const updateCategoryOpeningSchedule = useCallback((
    categoryId: string,
    schedule: OpeningSchedule,
  ) => {
    const current = getClubSettingsSnapshot();
    patchClubSettings({
      categoryOpeningSchedule: {
        ...current.categoryOpeningSchedule,
        [categoryId]: schedule,
      },
    });
  }, []);

  /** Uloží ceník kategorie a synchronizuje price_per_hour na kurtech v ní */
  const updateCategoryPricing = useCallback((categoryId: string, pricing: ClubPricing) => {
    const current = getClubSettingsSnapshot();
    patchClubSettings({
      categoryPricing: {
        ...current.categoryPricing,
        [categoryId]: pricing,
      },
    });
    const basePrice = basePriceFromCategoryPricing(pricing);
    if (basePrice !== null) {
      const courtIds = getCourtIdsInCategory(current, categoryId);
      setCourts(prev => prev.map(c =>
        courtIds.includes(c.id) ? { ...c, price_per_hour: basePrice } : c,
      ));
    }
  }, []);

  const reorderCategories = useCallback((fromIndex: number, toIndex: number) => {
    const current = getClubSettingsSnapshot();
    updateCategories(reorderCategoriesList(current.categories, fromIndex, toIndex));
  }, [updateCategories]);

  const reorderCourtsInCategory = useCallback((
    categoryId: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    const current = getClubSettingsSnapshot();
    updateCategories(reorderCourtsInCategoryList(
      current.categories,
      categoryId,
      fromIndex,
      toIndex,
    ));
  }, [updateCategories]);

  const reorderUncategorizedCourts = useCallback((fromIndex: number, toIndex: number) => {
    const current = getClubSettingsSnapshot();
    const ids = getUncategorizedCourts(courts, current).map(c => c.id);
    patchClubSettings({
      uncategorizedCourtOrder: reorderUncategorizedCourtOrder(ids, fromIndex, toIndex),
    });
  }, [courts]);

  /** Rezervace pro konkrétní datum (bez zrušených) */
  const getBookingsForDate = useCallback((date: string): ClubBooking[] => {
    return bookings.filter(b => b.date === date && b.status !== 'cancelled');
  }, [bookings]);

  /** Vrátí rezervaci na původní kurt/datum/sloty (undo přesunu) */
  const revertBookingMove = useCallback((
    bookingId: string,
    original: OriginalBookingPosition,
  ): { ok: true; booking: ClubBooking } | { ok: false; error: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, error: 'Rezervace nenalezena' };

    const conflict = bookings.some(b =>
      b.id !== bookingId
      && b.date === original.date
      && b.status !== 'cancelled'
      && b.court_id === original.court_id
      && original.slots.some(s => b.slots.includes(s))
    );
    if (conflict) {
      return { ok: false, error: 'Původní sloty jsou obsazené jinou rezervací' };
    }

    const court = courts.find(c => c.id === original.court_id);
    const pricePerHour = court?.price_per_hour ?? 0;
    const slotMin = Math.min(...original.slots);
    const slotMax = Math.max(...original.slots);
    const updated: ClubBooking = {
      ...booking,
      court_id:  original.court_id,
      date:      original.date,
      slots:     [...original.slots].sort((a, b) => a - b),
      starts_at: `${original.date}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:   `${original.date}T${slotEndTime(slotMax)}:00.000Z`,
      price: Math.round(calculateSlotsPrice(
        original.court_id, original.date, original.slots, pricePerHour, settings,
      )),
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    return { ok: true, booking: updated };
  }, [bookings, courts, settings]);

  /** Obecná aktualizace rezervace (platba, zrušení, …) */
  const updateBooking = useCallback((id: string, updates: Partial<ClubBooking>) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== id) return b;
      const next = { ...b, ...updates };
      if ('note' in updates && !updates.note) delete next.note;
      return next;
    }));
  }, []);

  /** Přesune rezervaci na jiný den (jen dnes nebo budoucí, do maxBookingDaysAhead) */
  const changeBookingDate = useCallback((
    bookingId: string,
    newDate: string,
  ): { ok: true; booking: ClubBooking } | { ok: false; error: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, error: 'Rezervace nenalezena' };

    const todayKey = localDateKey();
    if (newDate < todayKey) {
      return { ok: false, error: 'Datum nemůže být v minulosti' };
    }

    const maxD = new Date();
    maxD.setHours(12, 0, 0, 0);
    maxD.setDate(maxD.getDate() + settings.maxBookingDaysAhead);
    const maxKey = localDateKey(maxD);
    if (newDate > maxKey) {
      return { ok: false, error: `Maximálně ${settings.maxBookingDaysAhead} dní dopředu` };
    }

    if (newDate === booking.date) {
      return { ok: true, booking };
    }

    const conflict = bookings.some(b =>
      b.id !== bookingId
      && b.date === newDate
      && b.status !== 'cancelled'
      && b.court_id === booking.court_id
      && booking.slots.some(s => b.slots.includes(s))
    );
    if (conflict) {
      return { ok: false, error: 'V zvolený den je kurt v tomto čase obsazený' };
    }

    const slotMin = Math.min(...booking.slots);
    const slotMax = Math.max(...booking.slots);
    const updated: ClubBooking = {
      ...booking,
      date: newDate,
      starts_at: `${newDate}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:   `${newDate}T${slotEndTime(slotMax)}:00.000Z`,
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    return { ok: true, booking: updated };
  }, [bookings, settings.maxBookingDaysAhead]);

  /** Změní délku rezervace (stejný začátek, po sobě jdoucí sloty) */
  const changeBookingDuration = useCallback((
    bookingId: string,
    durationMinutes: number,
  ): { ok: true; booking: ClubBooking } | { ok: false; error: string } => {
    if (durationMinutes % 30 !== 0 || durationMinutes < 30) {
      return { ok: false, error: 'Neplatná délka rezervace' };
    }
    if (durationMinutes < settings.minBookingDurationMinutes) {
      return { ok: false, error: `Minimální doba rezervace je ${settings.minBookingDurationMinutes} min` };
    }

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { ok: false, error: 'Rezervace nenalezena' };

    const slotMin = Math.min(...booking.slots);
    const count   = durationMinutes / 30;
    const newSlots = Array.from({ length: count }, (_, i) => slotMin + i);

    if (Math.max(...newSlots) > getEffectiveClosingSlot(booking.date, settings)) {
      return { ok: false, error: 'Délka přesahuje provozní dobu' };
    }

    const conflict = bookings.some(b =>
      b.id !== bookingId
      && b.date === booking.date
      && b.status !== 'cancelled'
      && b.court_id === booking.court_id
      && newSlots.some(s => b.slots.includes(s))
    );
    if (conflict) {
      return { ok: false, error: 'Prodloužení koliduje s jinou rezervací' };
    }

    const court = courts.find(c => c.id === booking.court_id);
    const pricePerHour = court?.price_per_hour ?? 0;
    const slotMax = Math.max(...newSlots);
    const updated: ClubBooking = {
      ...booking,
      slots: newSlots,
      price: Math.round(calculateSlotsPrice(
        booking.court_id, booking.date, newSlots, pricePerHour, settings,
      )),
      starts_at: `${booking.date}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:   `${booking.date}T${slotEndTime(slotMax)}:00.000Z`,
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    return { ok: true, booking: updated };
  }, [bookings, courts, settings]);

  /** Vytvoří novou rezervaci (správce klubu) */
  const createBooking = useCallback((params: {
    courtId: string;
    playerName: string;
    date: string;
    slots: number[];
    price: number;
    paymentStatus: PaymentStatus;
    note?: string;
  }): ClubBooking | null => {
    const slotMin = Math.min(...params.slots);
    const slotMax = Math.max(...params.slots);
    const conflict = bookings.some(b =>
      b.date === params.date
      && b.status !== 'cancelled'
      && b.court_id === params.courtId
      && params.slots.some(s => b.slots.includes(s))
    );
    if (conflict) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (params.slots.some(s => !isSlotBookableForCourt(
      s, params.courtId, params.date, settings, nowMinutes,
    ))) return null;
    if (params.slots.length * 30 < settings.minBookingDurationMinutes) return null;

    const newBooking: ClubBooking = {
      id:              `cb_${Date.now()}`,
      court_id:        params.courtId,
      player_name:     params.playerName.trim(),
      date:            params.date,
      starts_at:       `${params.date}T${slotToTime(slotMin)}:00.000Z`,
      ends_at:         `${params.date}T${slotEndTime(slotMax)}:00.000Z`,
      slots:           [...params.slots].sort((a, b) => a - b),
      price:           params.price,
      payment_status:  params.paymentStatus,
      status:          'confirmed',
      ...(params.note?.trim() ? { note: params.note.trim() } : {}),
    };
    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  }, [bookings, settings]);

  /** Ověří, zda hráč smí editovat (slot je dál než editLockHours) */
  const canPlayerEdit = useCallback((booking: ClubBooking): boolean => {
    const startsMs  = new Date(booking.starts_at).getTime();
    const nowMs     = Date.now();
    const diffHours = (startsMs - nowMs) / 3_600_000;
    return diffHours > settings.editLockHours;
  }, [settings.editLockHours]);

  return {
    bookings, settings, courts,
    moveBooking, revertBookingMove, updateBooking, createBooking, changeBookingDate, changeBookingDuration,
    updateCourt, createCourt, updateSettings, updateSeason,
    setDayOverride, clearDayOverride, setCategoryDayOverride, clearCategoryDayOverride,
    updateCategories, saveCategory, deleteCategory, addCategory, updateCategoryPricing,
    updateCategoryOpeningSchedule,
    reorderCategories, reorderCourtsInCategory, reorderUncategorizedCourts,
    getBookingsForDate, canPlayerEdit,
  };
}
