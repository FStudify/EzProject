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
  dto: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    inviteToken?: string;
  },
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
  if (!currentRefreshToken) throw new Error('Không tìm thấy refresh token');
  const res = await api.post<{ accessToken: string; refreshToken: string }>(Endpoints.AUTH_REFRESH, {
    refreshToken: currentRefreshToken,
  });
  setTokens(res.accessToken, res.refreshToken ?? currentRefreshToken);
  return res;
}

// ── Forgot / Reset password ────────────────────────────────────

export interface ForgotPasswordResult {
  /** Server luôn trả generic — không phân biệt email tồn tại / không. */
  message: string;
}

export interface ValidateResetTokenResult {
  valid: boolean;
  /** 'MALFORMED' | 'NOT_FOUND' | 'USED' | 'EXPIRED' (chỉ khi valid=false) */
  reason?: string;
  /** ISO string, chỉ khi valid=true */
  expiresAt?: string;
}

export interface ResetPasswordResult {
  message: string;
}

/**
 * Yêu cầu gửi email đặt lại mật khẩu. Backend luôn trả về cùng message
 * bất kể email có tồn tại hay không (chống enumeration).
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const res = await api.post<ForgotPasswordResult>(Endpoints.AUTH_FORGOT_PASSWORD, { email });
  return res;
}

/**
 * Kiểm tra token còn hiệu lực không (FE gọi khi user mở `/reset-password?token=...`).
 */
export async function validateResetToken(token: string): Promise<ValidateResetTokenResult> {
  const res = await api.get<ValidateResetTokenResult>(
    `${Endpoints.AUTH_RESET_PASSWORD_VALIDATE}?token=${encodeURIComponent(token)}`,
  );
  return res;
}

/**
 * Đặt mật khẩu mới với token. Trả về message từ server.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ResetPasswordResult> {
  const res = await api.post<ResetPasswordResult>(Endpoints.AUTH_RESET_PASSWORD, {
    token,
    newPassword,
    confirmPassword,
  });
  return res;
}
