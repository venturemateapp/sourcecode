const TOKEN_KEY = 'venturemate_token';
const USER_KEY = 'venturemate_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser<T = unknown>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser<T = unknown>(user: T): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  removeToken();
  removeStoredUser();
  localStorage.removeItem('venturemate_auth_user');
  localStorage.removeItem('venturemate_onboarding_completed');
}

export interface JwtPayload {
  user_id: string;
  email: string;
  first_name?: string;
  surname?: string;
  onboarded?: boolean;
  status?: string;
  is_admin?: boolean;
  subscription_plan?: string;
  subscription_status?: string;
  exp: number;
  iat: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp * 1000 < Date.now();
}
