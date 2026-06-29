import { useState, useEffect, useCallback } from 'react';
import type { Club } from '@/types/database';
import {
  getClubProfileSnapshot,
  patchClubProfile,
  subscribeClubProfile,
} from '@/lib/clubProfileState';

export function useClubProfile() {
  const [profile, setProfile] = useState(() => getClubProfileSnapshot());

  useEffect(() => subscribeClubProfile(() => setProfile(getClubProfileSnapshot())), []);

  const updateProfile = useCallback((updates: Partial<Club>) => {
    patchClubProfile(updates);
  }, []);

  return { profile, updateProfile };
}
