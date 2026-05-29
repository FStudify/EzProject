/**
 * ============================================================
 * Auth Service — JWT Authentication (API Layer)
 * ============================================================
 */
import { api, getAccessToken, setTokens, clearTokens } from '@/api/config';
import { Endpoints } from '@/api/endpoints';
import type { AuthResponse } from '@/api/types';

/** Login — tra ve user + tokens */
export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>(Endpoints.AUTH_LOGIN, {
    username,
    password,
  });
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

/** Register */
export async function register(data: {
  fullName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>(Endpoints.AUTH_REGISTER, data);
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

/** Logout — goi API roi xoa local tokens */
export async function logout(): Promise<void> {
  try {
    await api.post(Endpoints.AUTH_LOGOUT);
  } finally {
    clearTokens();
  }
}
