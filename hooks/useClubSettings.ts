import { useState, useEffect } from 'react';
import type { ClubSettings } from '@/types/database';
import { getClubSettingsSnapshot, subscribeClubSettings } from '@/lib/clubSettingsState';

export function useClubSettings(): ClubSettings {
  const [settings, setSettings] = useState(() => getClubSettingsSnapshot());

  useEffect(() => subscribeClubSettings(() => setSettings(getClubSettingsSnapshot())), []);

  return settings;
}
