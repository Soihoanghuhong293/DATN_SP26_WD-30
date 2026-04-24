import type { UserRole } from './authStorage';

export function roleHome(role: UserRole | null | undefined) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hdv' || role === 'guide') return '/hdv';
  return '/';
}

export function isHdvRole(role: UserRole | null | undefined) {
  return role === 'hdv' || role === 'guide';
}

