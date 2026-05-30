/**
 * ============================================================
 * Auth API Module
 * ============================================================
 */
import { api, getRefreshToken, setTokens, clearTokens } from './config';
import { Endpoints } from './endpoints';
import type { AuthResponse } from './types';

/** Login — tra ve user + tokens */
export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await api.post<any>(Endpoints.AUTH_LOGIN, { username, password });
  if (res.user) res.user.id = res.user._id || res.user.id;
  setTokens(res.accessToken, res.refreshToken);
  return res as AuthResponse;
}

/** Register */
export async function register(
  dto: { fullName: string; email: string; username: string; password: string; confirmPassword: string },
): Promise<AuthResponse> {
  const res = await api.post<any>(Endpoints.AUTH_REGISTER, dto);
  if (res.user) res.user.id = res.user._id || res.user.id;
  setTokens(res.accessToken, res.refreshToken);
  return res as AuthResponse;
}

/** Logout — goi API roi xoa local tokens */
export async function logout(): Promise<void> {
  try {
    await api.post(Endpoints.AUTH_LOGOUT);
  } finally {
    clearTokens();
  }
}

/** Refresh token — goi khi access token het han */
export async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) throw new Error('No refresh token available');
  const res = await api.post<{ accessToken: string; refreshToken: string }>(Endpoints.AUTH_REFRESH, {
    refreshToken: currentRefreshToken,
  });
  setTokens(res.accessToken, res.refreshToken ?? currentRefreshToken);
  return res;
}
