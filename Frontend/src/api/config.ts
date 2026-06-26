/**
 * ============================================================
 * API Config — Centralized Fetch Wrapper
 * ============================================================
 *
 * Mọi request HTTP đi qua đây. Không có fetch() gọi trực tiếp
 * ngoài api/ folder.
 *
 * Features:
 * - Auto inject JWT Bearer token
 * - Timeout handling (10s default)
 * - Auto JSON parsing
 * - Global error normalization
 * - Token refresh on 401
 * - Retry logic cho transient errors
 */

import { ApiError, NetworkError, UnauthorizedError } from './errors';

// ── Storage Keys ─────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'ez_access_token';
const REFRESH_TOKEN_KEY = 'ez_refresh_token';

// ── Token Management ──────────────────────────────────────────
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Config ───────────────────────────────────────────────────
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

function normalizeApiBaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  const isLocalFrontend =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isLocalFrontend) {
    return '';
  }

  return envUrl || 'http://localhost:3000';
}

const config: ApiConfig = {
  baseUrl: normalizeApiBaseUrl(resolveApiBaseUrl()),
  timeout: 10_000, // 10 seconds
  retryAttempts: 1,
  retryDelay: 1_000, // 1 second
};

function shouldAttemptRefresh(path: string): boolean {
  return ![
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
  ].includes(path);
}

// ── HTTP Methods ─────────────────────────────────────────────

async function request<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method,
        ...options,
        headers: buildHeaders(options.headers, undefined, options.body),
      });

      // 401 → try refresh token
      if (response.status === 401 && shouldAttemptRefresh(path)) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetchWithTimeout(url, {
            method,
            ...options,
            headers: buildHeaders(options.headers, refreshed, options.body),
          });
          return handleResponse(retryResponse);
        } else {
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          throw new UnauthorizedError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        }
      }

      return handleResponse(response);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      if (err instanceof ApiError) throw err;

      lastError = err as Error;

      if (attempt < config.retryAttempts) {
        await sleep(config.retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError || new NetworkError('Không thể kết nối tới máy chủ, vui lòng thử lại');
}

function buildHeaders(
  customHeaders: HeadersInit | undefined,
  accessToken?: string | null,
  body?: BodyInit | null,
): HeadersInit {
  const token = accessToken ?? getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders as Record<string, string>),
  };

  // Không set Content-Type cho FormData — browser tự set boundary
  if (body instanceof FormData) {
    delete headers['Content-Type'];
  }

  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = config.timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function handleResponse<T>(response: Response): Promise<T> {
  return new Promise((resolve, reject) => {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (response.status === 204) {
      resolve({} as T);
      return;
    }

    if (isJson) {
      response.json().then(
        (body) => {
          if (response.ok) {
            // unwrap { success: true, data: ... } or raw data
            if (body && typeof body === 'object' && 'success' in body && body.success) {
              resolve(body.data as T);
            } else {
              resolve(body as T);
            }
          } else {
            reject(normalizeError(response.status, body));
          }
        },
        () => reject(new ApiError(response.status, 'Phản hồi từ máy chủ không hợp lệ')),
      );
    } else {
      if (response.ok) {
        response.text().then(resolve as unknown as (value: unknown) => void, reject);
      } else {
        response.text().then(
          (text) => reject(new ApiError(response.status, text || response.statusText)),
          () => reject(new ApiError(response.status, response.statusText)),
        );
      }
    }
  });
}

const viErrorMessages: Record<string, string> = {
  Unauthorized: 'Chưa xác thực',
  Forbidden: 'Bạn không có quyền thực hiện thao tác này',
  'Validation failed': 'Dữ liệu không hợp lệ',
  'Route not found': 'Không tìm thấy đường dẫn này',
  'Missing authorization header': 'Thiếu thông tin xác thực',
  'User no longer exists': 'Người dùng không còn tồn tại',
  'Invalid or expired token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
  'Admin access required': 'Cần quyền quản trị viên',
  'Session expired. Please login again.': 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  'Request failed after retries': 'Không thể kết nối tới máy chủ, vui lòng thử lại',
  'Invalid JSON response': 'Phản hồi từ máy chủ không hợp lệ',

  'Invalid credentials': 'Tài khoản hoặc mật khẩu sai',
  'Tài khoản hoặc mật khẩu sai': 'Tài khoản hoặc mật khẩu sai',
  'Invalid or expired refresh token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
  'Email already in use': 'Email đã được sử dụng',
  'Username already taken': 'Tên đăng nhập đã tồn tại',

  'User not found': 'Không tìm thấy người dùng này',
  'User not found not found': 'Không tìm thấy người dùng này',
  'Project not found': 'Không tìm thấy dự án này',
  'Member not found': 'Không tìm thấy thành viên này',
  'Room not found': 'Không tìm thấy phòng chat này',
  'Task not found': 'Không tìm thấy công việc này',
  'Document not found': 'Không tìm thấy tài liệu này',
  'Meeting not found': 'Không tìm thấy cuộc họp này',
  'Invitation not found': 'Không tìm thấy lời mời này',
  'Invite link not found': 'Không tìm thấy link mời này',
  'Pending invitation not found': 'Không tìm thấy lời mời đang chờ',

  'Username or email is required': 'Vui lòng nhập tên đăng nhập hoặc email',
  'Password is required': 'Vui lòng nhập mật khẩu',
  'Full name is required': 'Vui lòng nhập họ tên',
  'Invalid email format': 'Email không đúng định dạng',
  'Username must be at least 3 characters': 'Tên đăng nhập phải có ít nhất 3 ký tự',
  'Username too long': 'Tên đăng nhập không được quá 30 ký tự',
  'Username can only contain letters, numbers, underscores, or dots': 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới hoặc dấu chấm',
  'Password must be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự',
  'Passwords do not match': 'Mật khẩu xác nhận không khớp',
  'Project name is required': 'Vui lòng nhập tên dự án',
  'Task title is required': 'Vui lòng nhập tiêu đề công việc',
  'Prompt is required': 'Vui lòng nhập nội dung yêu cầu',
  'Task deadline is required': 'Vui lòng chọn hạn công việc',
  'Comment content is required': 'Vui lòng nhập nội dung bình luận',
  'Meeting title is required': 'Vui lòng nhập tiêu đề cuộc họp',
  'Meeting startTime must be a valid future date': 'Thời gian bắt đầu cuộc họp phải là thời điểm hợp lệ trong tương lai',
  'Meeting endTime must be after startTime': 'Thời gian kết thúc phải sau thời gian bắt đầu',
  'Message cannot be empty': 'Tin nhắn không được để trống',
  'A valid email is required': 'Vui lòng nhập email hợp lệ',
  'Invite token is required': 'Thiếu mã lời mời',
  'Title is required': 'Vui lòng nhập tiêu đề',
  'URL is required': 'Vui lòng nhập đường dẫn',
  'At least one field must be provided': 'Vui lòng nhập ít nhất một trường cần cập nhật',

  'You are not a member of this project': 'Bạn không phải là thành viên của dự án này',
  'Only the project owner can perform this action': 'Chỉ chủ sở hữu dự án mới có thể thực hiện thao tác này',
  'Only the project owner, leader, supervisor, or admin can invite members': 'Chỉ chủ sở hữu, trưởng nhóm, giám sát hoặc quản trị viên mới có thể mời thành viên',
  'Only the project owner can change roles': 'Chỉ chủ sở hữu dự án mới có thể đổi vai trò',
  'Cannot change your own role': 'Bạn không thể tự đổi vai trò của mình',
  'Project owner cannot leave. Transfer ownership first.': 'Chủ sở hữu cần chuyển quyền trước khi rời dự án',
  'Only the project owner can remove members': 'Chỉ chủ sở hữu dự án mới có thể xóa thành viên',
  'token is required': 'Thiếu mã lời mời',
  'Invite link has expired': 'Link mời đã hết hạn',
  'You are already a member of this project': 'Bạn đã là thành viên của dự án này',
  'newOwnerId is required': 'Vui lòng chọn chủ sở hữu mới',
  'Cannot transfer ownership to yourself': 'Bạn không thể chuyển quyền cho chính mình',
  'Target user is not a member of this project': 'Người dùng được chọn không thuộc dự án này',
  'New owner is not a member of this project': 'Chủ sở hữu mới không thuộc dự án này',
  'You are the owner. Please transfer ownership before leaving.': 'Bạn là chủ sở hữu. Vui lòng chuyển quyền trước khi rời dự án',
  'You are the owner. Please specify newOwnerId to transfer ownership before leaving.': 'Bạn là chủ sở hữu. Vui lòng chọn người nhận quyền trước khi rời',

  'username or email is required': 'Vui lòng nhập tên đăng nhập hoặc email',
  'User is already a member of this project': 'Người dùng này đã là thành viên của dự án',
  'Invitation already sent': 'Lời mời đã được gửi trước đó',
  'Invitation has already been processed': 'Lời mời này đã được xử lý',
  'Invitation has expired': 'Lời mời đã hết hạn',
  'This invitation was sent to a different email address': 'Lời mời này được gửi tới một email khác',
  'Invitation has already been processed or expired': 'Lời mời đã được xử lý hoặc đã hết hạn',
  'This email already belongs to a project member': 'Email này đã thuộc một thành viên trong dự án',
  'Invitation not found or already processed': 'Không tìm thấy lời mời hoặc lời mời đã được xử lý',
  'Cannot resend an expired invitation': 'Không thể gửi lại lời mời đã hết hạn',

  'Invalid room type': 'Loại phòng chat không hợp lệ',
  'Cannot create General room via API': 'Không thể tạo phòng chung bằng API',
  'Channel name already exists in this project': 'Tên kênh đã tồn tại trong dự án này',
  'Cannot rename General room': 'Không thể đổi tên phòng chung',
  'You do not have permission to rename this room': 'Bạn không có quyền đổi tên phòng này',
  'Cannot add members to General room': 'Không thể thêm thành viên vào phòng chung',
  'Member invitation is locked': 'Tính năng mời thành viên đang bị khóa',
  'You do not have permission to add members': 'Bạn không có quyền thêm thành viên',
  'Cannot leave the General room': 'Không thể rời phòng chung',
  'You are not a member of this room': 'Bạn không phải là thành viên của phòng này',
  'New owner is not a member of this room': 'Chủ sở hữu mới không thuộc phòng này',
  'Cannot kick from General room': 'Không thể xóa thành viên khỏi phòng chung',
  'User is not a member of this room': 'Người dùng này không thuộc phòng này',
  'Cannot kick the owner': 'Không thể xóa chủ sở hữu',
  'Cannot kick another admin': 'Không thể xóa quản trị viên khác',
  'You do not have permission to kick members': 'Bạn không có quyền xóa thành viên',
  'Only the owner can promote members to admin': 'Chỉ chủ sở hữu mới có thể nâng quyền quản trị viên',
  'Cannot promote the owner': 'Không thể nâng quyền chủ sở hữu',
  'User is already an admin': 'Người dùng này đã là quản trị viên',
  'Only the owner can demote admins': 'Chỉ chủ sở hữu mới có thể hạ quyền quản trị viên',
  'Cannot transfer ownership of General room': 'Không thể chuyển quyền sở hữu phòng chung',
  'Only the owner can transfer ownership': 'Chỉ chủ sở hữu mới có thể chuyển quyền',
  'Target user is not a member of this room': 'Người dùng được chọn không thuộc phòng này',
  'Cannot change settings for General room': 'Không thể đổi cài đặt phòng chung',
  'You do not have permission to change settings': 'Bạn không có quyền đổi cài đặt',
  'Cannot delete General room': 'Không thể xóa phòng chung',
  'Only the owner can delete this room': 'Chỉ chủ sở hữu mới có thể xóa phòng này',

  'Invalid startTime': 'Thời gian bắt đầu không hợp lệ',
  'Invalid endTime': 'Thời gian kết thúc không hợp lệ',
  'Meeting startTime must be in the future': 'Thời gian bắt đầu cuộc họp phải ở tương lai',
  'Members cannot edit meetings': 'Thành viên không thể sửa cuộc họp',
  'Supervisors can only edit meetings they organized': 'Giám sát chỉ có thể sửa cuộc họp do mình tổ chức',
  'Cannot change start time of a meeting that has already started': 'Không thể đổi giờ bắt đầu của cuộc họp đã diễn ra',
  'Cannot edit a completed or cancelled meeting': 'Không thể sửa cuộc họp đã hoàn thành hoặc đã hủy',
  'Members cannot delete meetings': 'Thành viên không thể xóa cuộc họp',
  'Supervisors can only delete meetings they organized': 'Giám sát chỉ có thể xóa cuộc họp do mình tổ chức',
  'willAttend must be a boolean': 'Trạng thái tham gia không hợp lệ',
  'attendeeIds is required and must be non-empty': 'Vui lòng chọn ít nhất một người tham dự',
  'Members cannot invite attendees': 'Thành viên không thể mời người tham dự',
  'Members cannot remove attendees': 'Thành viên không thể xóa người tham dự',
  'Supervisors can only manage attendees of meetings they organized': 'Giám sát chỉ có thể quản lý người tham dự của cuộc họp do mình tổ chức',
  'Cannot remove the meeting organizer': 'Không thể xóa người tổ chức cuộc họp',
  'Attendee not found in this meeting': 'Không tìm thấy người tham dự trong cuộc họp này',

  'Current password is incorrect': 'Mật khẩu hiện tại không đúng',
  'No file uploaded. Use multipart/form-data with field "avatar"': 'Vui lòng chọn tệp ảnh đại diện để tải lên',
  'Only image files are allowed (jpeg/jpg/png/gif/webp)': 'Chỉ cho phép tải tệp ảnh jpeg, jpg, png, gif hoặc webp',
  'Unsupported file type': 'Định dạng tệp không được hỗ trợ',
  'Only the owner can edit this project': 'Chỉ chủ sở hữu mới có thể chỉnh sửa dự án này',
  'Only the owner can delete this project': 'Chỉ chủ sở hữu mới có thể xóa dự án này',
  'Only leaders and supervisors can generate tasks with AI': 'Chỉ trưởng nhóm hoặc giám sát mới có thể tạo công việc bằng AI',
  'Set a project deadline before generating tasks': 'Vui lòng đặt hạn chót dự án trước khi tạo công việc',
  'Each task must have a valid deadline': 'Mỗi công việc phải có hạn chót hợp lệ',
  'Task deadline cannot be after the project deadline': 'Hạn chót công việc không được sau hạn chót dự án',
  'AI returned an invalid task list': 'AI trả về danh sách công việc không hợp lệ',
  'AI did not return the requested number of tasks': 'AI không trả về đúng số lượng công việc yêu cầu',
  'AI returned a task without a title': 'AI trả về công việc thiếu tiêu đề',
  'AI generation is not configured. Set GEMINI_API_KEY on the server': 'Tính năng AI chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY trên server',
  'Gemini AI dependency is not available on the server': 'Thư viện Gemini AI chưa sẵn sàng trên server',
  'AI could not generate tasks. Please try again later': 'AI không thể tạo công việc. Vui lòng thử lại sau',
  'You can only edit tasks assigned to or created by you': 'Bạn chỉ có thể sửa công việc được giao cho bạn hoặc do bạn tạo',
  'Only the creator, leader, or supervisor can delete this task': 'Chỉ người tạo, trưởng nhóm hoặc giám sát mới có thể xóa công việc này',
  'Title cannot be empty': 'Tiêu đề không được để trống',
  'A valid URL is required': 'Vui lòng nhập đường dẫn hợp lệ',
  'No fields to update': 'Không có thông tin nào để cập nhật',
  'Only the creator or leaders can delete this document': 'Chỉ người tạo hoặc trưởng nhóm mới có thể xóa tài liệu này',
  'role must be ADMIN or CUSTOMER': 'Vai trò phải là ADMIN hoặc CUSTOMER',
  'Cannot demote yourself': 'Bạn không thể tự hạ quyền của mình',
  'Cannot delete your own account': 'Bạn không thể xóa tài khoản của chính mình',
  'Only leaders and supervisors can evaluate': 'Chỉ trưởng nhóm hoặc giám sát mới có thể đánh giá',
};

function translateApiErrorMessage(message: string): string {
  const text = String(message || '').trim();
  if (!text) return text;
  if (viErrorMessages[text]) return viErrorMessages[text];

  if (/^HTTP \d+$/i.test(text)) return 'Yêu cầu thất bại, vui lòng thử lại';
  if (/^File too large\. Max allowed size is/i.test(text)) {
    return text.replace(/^File too large\. Max allowed size is/i, 'Tệp quá lớn. Dung lượng tối đa là');
  }
  if (/^User .+ is not a member of this project$/i.test(text)) {
    return 'Người dùng này không thuộc dự án này';
  }
  if (/^(.+) not found$/i.test(text)) {
    const resource = text.replace(/\s+not found$/i, '');
    return viErrorMessages[`${resource} not found`] || 'Không tìm thấy dữ liệu yêu cầu';
  }

  return text;
}

function normalizeError(status: number, body: unknown): ApiError {
  const raw = body as Record<string, unknown> | null;
  const apiError =
    raw &&
    typeof raw.error === 'object' &&
    raw.error !== null
      ? (raw.error as Record<string, unknown>)
      : null;
  const code = typeof apiError?.code === 'string' ? apiError.code : undefined;
  const field = typeof apiError?.field === 'string' ? apiError.field : undefined;
  const details =
    apiError &&
    'errors' in apiError &&
    Array.isArray(apiError.errors)
      ? (apiError.errors as Array<Record<string, unknown>>)
          .map((item) => (typeof item.message === 'string' ? item.message : ''))
          .filter(Boolean)
      : [];
  const translatedDetails = details.map(translateApiErrorMessage);
  const msg =
    details.length > 0
      ? translatedDetails.join(', ')
      :
    raw && 'error' in raw
      ? typeof raw.error === 'string'
        ? raw.error
        : typeof raw.error === 'object' && raw.error !== null && 'message' in raw.error
        ? String((raw.error as Record<string, unknown>).message)
          : JSON.stringify(body)
      : typeof body === 'string'
        ? body
        : raw && 'message' in raw
          ? String(raw.message)
          : `HTTP ${status}`;

  return new ApiError(status, translateApiErrorMessage(msg), field, code);
}

// ── Token Refresh ─────────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json() as { data: { accessToken: string } };
    const { accessToken } = body.data;
    const newRefreshToken =
      (body as { data: { refreshToken?: string } }).data?.refreshToken || refreshToken;

    setTokens(accessToken, newRefreshToken);

    refreshSubscribers.forEach((cb) => cb(accessToken));
    refreshSubscribers = [];

    return accessToken;
  } catch {
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ── Exported HTTP Helpers ──────────────────────────────────────

export const api = {
  get<T = unknown>(path: string, options?: RequestInit): Promise<T> {
    return request<T>('GET', path, options);
  },

  post<T = unknown>(path: string, body?: unknown, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('POST', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T = unknown>(path: string, body?: unknown, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('PUT', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = unknown>(path: string, body?: unknown, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('PATCH', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = unknown>(path: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('DELETE', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
    });
  },

  /**
   * Upload file via FormData — không auto JSON stringify
   */
  upload<T = unknown>(
    path: string,
    formData: FormData,
    options?: RequestInit & { timeout?: number },
  ): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('POST', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: formData,
      headers: { Accept: 'application/json' },
    });
  },

  /** Lấy config (để test hoặc override) */
  getConfig(): ApiConfig {
    return { ...config };
  },
};

// ── Utilities ─────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Re-export types & errors ──────────────────────────────────
export type { ApiResponse, PaginatedResponse } from './types';
export { ApiError, NetworkError, UnauthorizedError, ValidationError } from './errors';
