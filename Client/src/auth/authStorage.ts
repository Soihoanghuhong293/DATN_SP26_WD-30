export type UserRole = 'admin' | 'hdv' | 'guide' | 'user' | string;

const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';
const EMAIL_KEY = 'user_email';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getRole(): UserRole | null {
    return (localStorage.getItem(ROLE_KEY) as UserRole | null) || null;
  },
  getEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  },
  setAuth(payload: { token: string; role?: UserRole | null; email?: string | null }) {
    localStorage.setItem(TOKEN_KEY, payload.token);
    if (payload.role !== undefined) {
      if (payload.role === null) localStorage.removeItem(ROLE_KEY);
      else localStorage.setItem(ROLE_KEY, String(payload.role));
    }
    if (payload.email !== undefined) {
      if (!payload.email) localStorage.removeItem(EMAIL_KEY);
      else localStorage.setItem(EMAIL_KEY, payload.email);
    }
    window.dispatchEvent(new Event('auth:changed'));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    window.dispatchEvent(new Event('auth:changed'));
  },
};

