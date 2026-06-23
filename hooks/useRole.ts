import { createContext, useContext } from 'react';
import type { UserRole } from '@/types/database';

export type { UserRole };

export const ROLE_CONFIG = {
  player: {
    label: 'Hráč',
    emoji: '🎾',
    accent: '#2D9148',
    homeRoute: '/(player)/home' as const,
  },
  coach: {
    label: 'Trenér',
    emoji: '📋',
    accent: '#2980B9',
    homeRoute: '/(coach)/home' as const,
  },
  club: {
    label: 'Klub',
    emoji: '🏟️',
    accent: '#D4A017',
    homeRoute: '/(club)/home' as const,
  },
} satisfies Record<UserRole, { label: string; emoji: string; accent: string; homeRoute: string }>;

export function getRoleConfig(role: UserRole) {
  return ROLE_CONFIG[role];
}
