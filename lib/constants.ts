export const APP_NAME = 'MESS';
export const APP_VERSION = '0.1.0';
export const APP_TAGLINE = 'Tennis Management System';

export const COLORS = {
  background: '#0F1923',
  surface: '#1A2634',
  border: '#2D3748',
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    muted: '#6B7280',
    disabled: '#4A5568',
  },
  role: {
    player: '#2D9148',
    coach: '#2980B9',
    club: '#D4A017',
  },
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
} as const;

export const COURT_SURFACES = ['clay', 'hard', 'grass', 'carpet', 'indoor'] as const;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;

export const USER_ROLES = ['player', 'coach', 'club'] as const;
