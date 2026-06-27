import { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CourtCategory, CourtWithClub, Season } from '@/types/database';
import { colors } from '@/lib/theme';
import { CATEGORY_COLORS } from '@/lib/mockData';
import { formatSeasonDates, resolveCategoryColorHex, defaultCategoryColor, isSeasonClosed } from '@/lib/clubCategories';

const W = colors.warm;

export function CourtCategoryEditModal({
  visible,
  category,
  courts,
  allCategories,
  seasons,
  seasonalModeEnabled = false,
  onSave,
  onClose,
}: {
  visible: boolean;
  category: CourtCategory | null;
  courts: CourtWithClub[];
  allCategories: CourtCategory[];
  seasons: Season[];
  seasonalModeEnabled?: boolean;
  onSave: (category: CourtCategory) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0].hex);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? '');
    setSeasonId(category?.season_id ?? seasons[0]?.id);
    setColor(category?.color
      ? resolveCategoryColorHex(category.color)
      : defaultCategoryColor(allCategories.filter(c => c.id !== category?.id)));
    setSelectedIds(new Set(category?.court_ids ?? []));
  }, [visible, category, seasons, allCategories]);

  function toggleCourt(courtId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(courtId)) next.delete(courtId);
      else next.add(courtId);
      return next;
    });
  }

  function courtInOtherCategory(courtId: string): string | undefined {
    for (const cat of allCategories) {
      if (cat.id === category?.id) continue;
      if (cat.court_ids.includes(courtId)) return cat.name;
    }
    return undefined;
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: category?.id ?? `cat_${Date.now()}`,
      name: trimmed,
      court_ids: [...selectedIds],
      color,
      ...(seasonalModeEnabled && seasonId ? { season_id: seasonId } : {}),
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[s.bar, { backgroundColor: color }]} />
            <View style={s.body}>
              <Text style={s.title}>
                {category ? 'UPRAVIT KATEGORII' : 'NOVÁ KATEGORIE'}
              </Text>
              <Text style={s.sub}>
                Kurt může být jen v jedné kategorii. Provozní dobu a ceník nastavíte v záložce Nastavení.
              </Text>

              <Text style={s.label}>NÁZEV KATEGORIE</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Např. Venkovní kurty"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={s.label}>BARVA KATEGORIE</Text>
              <View style={s.colorRow}>
                {CATEGORY_COLORS.map(preset => {
                  const sel = color === preset.hex;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => setColor(preset.hex)}
                      style={[s.colorChip, { backgroundColor: preset.hex }, sel && s.colorChipSel]}
                      activeOpacity={0.8}
                      accessibilityLabel={preset.label}
                    >
                      {sel && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {seasonalModeEnabled && seasons.length > 0 && (
                <>
                  <Text style={s.label}>SEZÓNA</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.seasonScroll}>
                    {seasons.map(season => {
                      const sel = seasonId === season.id;
                      const closed = isSeasonClosed(season);
                      return (
                        <TouchableOpacity
                          key={season.id}
                          onPress={() => setSeasonId(season.id)}
                          style={[
                            s.seasonChip,
                            sel && s.seasonChipSel,
                            closed && s.seasonChipClosed,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.seasonChipTitle, sel && s.seasonChipTitleSel]}>
                            {season.name}{closed ? ' · ZAVŘENO' : ''}
                          </Text>
                          <Text style={[s.seasonChipDates, sel && s.seasonChipDatesSel]}>
                            {formatSeasonDates(season)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={s.label}>KURTY V KATEGORII</Text>
              {courts.map(court => {
                const sel = selectedIds.has(court.id);
                const otherCat = courtInOtherCategory(court.id);
                const disabled = !!otherCat && !sel;
                return (
                  <TouchableOpacity
                    key={court.id}
                    onPress={() => !disabled && toggleCourt(court.id)}
                    style={[s.courtRow, sel && s.courtRowSel, disabled && s.courtRowDisabled]}
                    activeOpacity={disabled ? 1 : 0.7}
                  >
                    <Ionicons
                      name={sel ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={sel ? '#6366F1' : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.courtName, disabled && { color: colors.textDisabled }]}>
                        {court.name}
                      </Text>
                      <Text style={s.courtMeta}>
                        {court.club_name}
                        {otherCat && !sel ? ` · v kategorii „${otherCat}"` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelText}>ZRUŠIT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim()}
              style={[s.saveBtn, !name.trim() && { opacity: 0.4 }]}
            >
              <Text style={s.saveText}>ULOŽIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, maxHeight: '88%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', marginTop: 8 },
  bar: { height: 4 },
  body: { padding: 20, gap: 8 },
  title: { fontSize: 14, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  sub: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  label: {
    fontSize: 9, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1, marginTop: 8,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, padding: 12,
    fontSize: 14, color: colors.textPrimary, backgroundColor: colors.bgAlt,
  },
  colorRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4,
  },
  colorChip: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorChipSel: {
    borderColor: colors.textPrimary,
  },
  seasonScroll: { marginBottom: 4 },
  seasonChip: {
    paddingHorizontal: 14, paddingVertical: 10, marginRight: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt,
    minWidth: 140,
  },
  seasonChipSel: { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' },
  seasonChipClosed: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  seasonChipTitle: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  seasonChipTitleSel: { color: '#6366F1' },
  seasonChipDates: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  seasonChipDatesSel: { color: '#6366F1' },
  courtRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgAlt, marginBottom: 6,
  },
  courtRowSel: { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.08)' },
  courtRowDisabled: { opacity: 0.55 },
  courtName: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  courtMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  cancelText: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, backgroundColor: '#6366F1' },
  saveText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});
