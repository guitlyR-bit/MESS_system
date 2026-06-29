import type { Club } from '@/types/database';
import { MOCK_CLUB_PROFILE } from '@/lib/mockData';

function cloneProfile(src: Club): Club {
  return { ...src };
}

let clubProfile: Club = cloneProfile(MOCK_CLUB_PROFILE);
const listeners = new Set<() => void>();

export function getClubProfileSnapshot(): Club {
  return clubProfile;
}

export function subscribeClubProfile(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchClubProfile(updates: Partial<Club>): Club {
  clubProfile = { ...clubProfile, ...updates };
  listeners.forEach(l => l());
  return clubProfile;
}
