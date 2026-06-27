import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  ClubSettings, ClubPricing, CourtPriceRule, PriceDayScope,
  PriceTimeBand, CourtWithClub,
} from '@/types/database';
import { colors } from '@/lib/theme';
import { slotToTime, slotEndTime, SLOT_COUNT } from '@/lib/mockData';
import {
  scopeLabel, upsertPriceRule, removePriceRule,
} from '@/lib/clubSchedule';
import { courtsInCategory, getCategoryById } from '@/lib/clubCategories';

const W = colors.warm;

const SCOPE_OPTIONS: PriceDayScope[] = [
  'all', 'weekday', 'weekend', 'holiday', 0, 1, 2, 3, 4, 5, 6,
];

const SPORT_COLORS: Record<string, string> = {
  tennis: W.orange, badminton: W.rose, squash: W.red,
  padel: W.amber, volleyball: W.yellow,
};

function defaultBands(basePrice: number, openingSlot = 14, closingSlot = 43): PriceTimeBand[] {
  const mid = Math.floor((openingSlot + closingSlot) / 2);
  return [
    { fromSlot: openingSlot, toSlot: mid, pricePerHour: basePrice },
    { fromSlot: mid + 1, toSlot: closingSlot, pricePerHour: basePrice },
  ];
}

export function CourtPricingModal({
  visible,
  courts,
  settings,
  initialCourtId,
  initialCategoryId,
  categoryOnly,
  onSave,
  onSaveCategory,
  onClose,
}: {
  visible: boolean;
  courts: CourtWithClub[];
  settings: ClubSettings;
  initialCourtId?: string;
  initialCategoryId?: string;
  /** Skrýt režim jednotlivého kurtu — jen kategorie */
  categoryOnly?: boolean;
  onSave: (pricing: ClubPricing) => void;
  onSaveCategory?: (categoryId: string, pricing: ClubPricing) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'category' | 'court'>(categoryOnly ? 'category' : 'category');
  const [pricing, setPricing] = useState<ClubPricing>(settings.pricing);
  const [categoryPricing, setCategoryPricing] = useState<Record<string, ClubPricing>>(
    settings.categoryPricing ?? {},
  );
  const [courtId, setCourtId] = useState(initialCourtId ?? courts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(
    initialCategoryId ?? settings.categories[0]?.id ?? '',
  );
  const [editScope, setEditScope] = useState<PriceDayScope | null>(null);
  const [bands, setBands] = useState<PriceTimeBand[]>([]);

  const court = courts.find(c => c.id === courtId);
  const category = getCategoryById(settings, categoryId);
  const categoryCourts = categoryId ? courtsInCategory(courts, categoryId, settings) : [];
  const accent = mode === 'category'
    ? '#6366F1'
    : (court ? (SPORT_COLORS[court.sport] ?? W.orange) : W.orange);
  const dayHours = settings.openingSchedule.default;

  useEffect(() => {
    if (visible) {
      setPricing({
        rules: settings.pricing.rules.map(r => ({
          ...r,
          bands: r.bands.map(b => ({ ...b })),
        })),
      });
      setCategoryPricing(
        Object.fromEntries(
          Object.entries(settings.categoryPricing ?? {}).map(([k, p]) => [
            k,
            { rules: p.rules.map(r => ({ ...r, bands: r.bands.map(b => ({ ...b })) })) },
          ]),
        ),
      );
      setCourtId(initialCourtId ?? courts[0]?.id ?? '');
      setCategoryId(initialCategoryId ?? settings.categories[0]?.id ?? '');
      setMode(categoryOnly || (initialCategoryId && !initialCourtId) ? 'category' : (initialCourtId && !initialCategoryId ? 'court' : 'category'));
      setEditScope(null);
    }
  }, [visible, settings, initialCourtId, initialCategoryId, categoryOnly, courts]);

  const activePricing = mode === 'category'
    ? (categoryPricing[categoryId] ?? { rules: [] })
    : pricing;
  const targetRules = mode === 'category'
    ? activePricing.rules.filter(r => r.categoryId === categoryId)
    : activePricing.rules.filter(r => r.courtId === courtId);

  const basePrice = useMemo(() => {
    if (mode === 'category' && categoryCourts.length > 0) {
      return categoryCourts[0].price_per_hour;
    }
    return court?.price_per_hour ?? 200;
  }, [mode, categoryCourts, court]);

  function startEdit(scope: PriceDayScope) {
    const existing = targetRules.find(r => r.scope === scope);
    setEditScope(scope);
    setBands(
      existing?.bands.map(b => ({ ...b }))
        ?? defaultBands(basePrice, dayHours.openingSlot, dayHours.closingSlot),
    );
  }

  function saveRule() {
    if (editScope === null) return;
    if (mode === 'category') {
      if (!categoryId) return;
      const rule: CourtPriceRule = {
        id: `pr_cat_${categoryId}_${editScope}_${Date.now()}`,
        categoryId,
        scope: editScope,
        bands: bands.map(b => ({ ...b })),
      };
      const nextRules = upsertPriceRule(activePricing.rules, rule);
      setCategoryPricing(prev => ({
        ...prev,
        [categoryId]: { rules: nextRules },
      }));
    } else {
      if (!courtId) return;
      const rule: CourtPriceRule = {
        id: `pr_${courtId}_${editScope}_${Date.now()}`,
        courtId,
        scope: editScope,
        bands: bands.map(b => ({ ...b })),
      };
      setPricing(p => ({ rules: upsertPriceRule(p.rules, rule) }));
    }
    setEditScope(null);
  }

  function deleteRule(scope: PriceDayScope) {
    if (mode === 'category') {
      setCategoryPricing(prev => ({
        ...prev,
        [categoryId]: {
          rules: removePriceRule(activePricing.rules, categoryId, scope, 'category'),
        },
      }));
    } else {
      setPricing(p => ({ rules: removePriceRule(p.rules, courtId, scope, 'court') }));
    }
    if (editScope === scope) setEditScope(null);
  }

  function updateBand(idx: number, patch: Partial<PriceTimeBand>) {
    setBands(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  }

  function addBand() {
    const last = bands[bands.length - 1];
    const nextFrom = last ? Math.min(last.toSlot + 1, SLOT_COUNT - 1) : dayHours.openingSlot;
    setBands(prev => [
      ...prev,
      {
        fromSlot: nextFrom,
        toSlot: Math.min(nextFrom + 4, dayHours.closingSlot),
        pricePerHour: basePrice,
      },
    ]);
  }

  function removeBand(idx: number) {
    if (bands.length <= 1) return;
    setBands(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (mode === 'category' && onSaveCategory && categoryId) {
      onSaveCategory(categoryId, categoryPricing[categoryId] ?? { rules: [] });
    } else {
      onSave(pricing);
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[s.bar, { backgroundColor: accent }]} />
            <View style={s.body}>
              <Text style={s.title}>CENOVÉ KATEGORIE</Text>
              <Text style={s.sub}>
                {categoryOnly
                  ? 'Nastavte ceny pro vybranou kategorii kurtů.'
                  : 'Nastavte cenu podle kategorií kurtů nebo jednotlivých kurtů mimo kategorii.'}
              </Text>

              {!categoryOnly && (
              <View style={s.modeRow}>
                <TouchableOpacity
                  onPress={() => { setMode('category'); setEditScope(null); }}
                  style={[s.modeChip, mode === 'category' && { backgroundColor: '#6366F1', borderColor: '#6366F1' }]}
                >
                  <Text style={[s.modeChipText, mode === 'category' && { color: '#fff' }]}>
                    Podle kategorie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setMode('court'); setEditScope(null); }}
                  style={[s.modeChip, mode === 'court' && { backgroundColor: accent, borderColor: accent }]}
                >
                  <Text style={[s.modeChipText, mode === 'court' && { color: '#fff' }]}>
                    Jednotlivý kurt
                  </Text>
                </TouchableOpacity>
              </View>
              )}

              {mode === 'category' ? (
                <>
                  <Text style={s.label}>KATEGORIE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.courtScroll}>
                    {settings.categories.map(cat => {
                      const sel = cat.id === categoryId;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => { setCategoryId(cat.id); setEditScope(null); }}
                          style={[s.courtChip, sel && { backgroundColor: '#6366F1', borderColor: '#6366F1' }]}
                        >
                          <Text style={[s.courtChipText, sel && { color: '#fff' }]}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {category && (
                    <Text style={s.courtListHint}>
                      Kurty: {categoryCourts.map(c => c.name).join(', ') || 'žádné'}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={s.label}>KURT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.courtScroll}>
                    {courts.map(c => {
                      const cAccent = SPORT_COLORS[c.sport] ?? W.orange;
                      const sel = c.id === courtId;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => { setCourtId(c.id); setEditScope(null); }}
                          style={[s.courtChip, sel && { backgroundColor: cAccent, borderColor: cAccent }]}
                        >
                          <Text style={[s.courtChipText, sel && { color: '#fff' }]}>{c.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {targetRules.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>AKTIVNÍ PRAVIDLA</Text>
                  {targetRules.map(rule => (
                    <View key={`${rule.courtId ?? rule.categoryId}-${rule.scope}`} style={s.ruleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ruleScope}>{scopeLabel(rule.scope)}</Text>
                        <Text style={s.ruleBands}>
                          {rule.bands.map(b =>
                            `${slotToTime(b.fromSlot)}–${slotEndTime(b.toSlot)}: ${b.pricePerHour} Kč`,
                          ).join(' · ')}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => startEdit(rule.scope)} style={s.iconBtn}>
                        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRule(rule.scope)} style={s.iconBtn}>
                        <Ionicons name="trash-outline" size={18} color={W.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={s.section}>
                <Text style={s.sectionTitle}>
                  {editScope !== null ? 'UPRAVIT PRAVIDLO' : 'NOVÉ PRAVIDLO'}
                </Text>

                <Text style={s.label}>PLATÍ PRO</Text>
                <View style={s.scopeGrid}>
                  {SCOPE_OPTIONS.map(sc => {
                    const sel = editScope === sc;
                    return (
                      <TouchableOpacity
                        key={String(sc)}
                        onPress={() => startEdit(sc)}
                        style={[s.scopeChip, sel && { backgroundColor: accent, borderColor: accent }]}
                      >
                        <Text style={[s.scopeChipText, sel && { color: '#fff' }]}>
                          {scopeLabel(sc)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {editScope === 'holiday' && (
                  <Text style={s.holidayHint}>
                    Platí automaticky ve státní svátky ČR.
                    {' '}Bez vlastního pravidla se použije ceník {settings.holidayTreatment === 'weekday' ? 'pracovních dnů' : 'víkendu'}.
                  </Text>
                )}

                {editScope !== null && (
                  <>
                    <Text style={[s.label, { marginTop: 12 }]}>ČASOVÁ PÁSMA</Text>
                    {bands.map((band, idx) => (
                      <View key={idx} style={s.bandRow}>
                        <View style={s.bandTimes}>
                          <Text style={s.bandLabel}>OD</Text>
                          <View style={s.miniStepper}>
                            <TouchableOpacity
                              onPress={() => updateBand(idx, {
                                fromSlot: Math.max(dayHours.openingSlot, band.fromSlot - 1),
                              })}
                            >
                              <Text style={s.miniBtn}>−</Text>
                            </TouchableOpacity>
                            <Text style={s.miniVal}>{slotToTime(band.fromSlot)}</Text>
                            <TouchableOpacity
                              onPress={() => updateBand(idx, {
                                fromSlot: Math.min(band.toSlot - 1, band.fromSlot + 1),
                              })}
                            >
                              <Text style={s.miniBtn}>+</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={s.bandLabel}>DO</Text>
                          <View style={s.miniStepper}>
                            <TouchableOpacity
                              onPress={() => updateBand(idx, {
                                toSlot: Math.max(band.fromSlot + 1, band.toSlot - 1),
                              })}
                            >
                              <Text style={s.miniBtn}>−</Text>
                            </TouchableOpacity>
                            <Text style={s.miniVal}>{slotEndTime(band.toSlot)}</Text>
                            <TouchableOpacity
                              onPress={() => updateBand(idx, {
                                toSlot: Math.min(dayHours.closingSlot, band.toSlot + 1),
                              })}
                            >
                              <Text style={s.miniBtn}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={s.priceCol}>
                          <Text style={s.bandLabel}>KČ/HOD</Text>
                          <TextInput
                            style={s.priceInput}
                            keyboardType="number-pad"
                            value={String(band.pricePerHour)}
                            onChangeText={t => updateBand(idx, {
                              pricePerHour: Number(t.replace(/\D/g, '')) || 0,
                            })}
                          />
                        </View>
                        <TouchableOpacity onPress={() => removeBand(idx)} style={s.iconBtn}>
                          <Ionicons name="remove-circle-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity onPress={addBand} style={s.addBandBtn}>
                      <Ionicons name="add" size={16} color={accent} />
                      <Text style={[s.addBandText, { color: accent }]}>Přidat pásmo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveRule} style={[s.saveRuleBtn, { backgroundColor: accent }]}>
                      <Text style={s.saveRuleText}>ULOŽIT PRAVIDLO</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelText}>ZRUŠIT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[s.saveBtn, { backgroundColor: accent }]}>
              <Text style={s.saveText}>HOTOVÉ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', marginTop: 8 },
  bar: { height: 4 },
  body: { padding: 20 },
  title: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  sub: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 4, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeChip: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  modeChipText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  label: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1, marginTop: 8, marginBottom: 6,
  },
  courtScroll: { marginBottom: 4 },
  courtListHint: { fontSize: 11, color: colors.textMuted, marginBottom: 4, fontStyle: 'italic' },
  courtChip: {
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  courtChipText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  section: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: 0.8, marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: 10, marginBottom: 6, backgroundColor: colors.bgAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  ruleScope: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  ruleBands: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  iconBtn: { padding: 6 },
  scopeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scopeChip: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
  },
  scopeChipText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  holidayHint: { fontSize: 11, color: colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  bandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border,
  },
  bandTimes: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  bandLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted },
  miniStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: { fontSize: 16, fontWeight: '900', color: colors.textSecondary, paddingHorizontal: 6 },
  miniVal: { fontSize: 12, fontWeight: '800', color: colors.textPrimary, minWidth: 44, textAlign: 'center' },
  priceCol: { alignItems: 'center', gap: 4 },
  priceInput: {
    width: 64, height: 36, textAlign: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
    fontSize: 14, fontWeight: '900', color: colors.textPrimary,
  },
  addBandBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addBandText: { fontSize: 12, fontWeight: '800' },
  saveRuleBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  saveRuleText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  footer: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  saveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});
