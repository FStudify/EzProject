/**
 * Trả về đường dẫn landing tương ứng với role.
 * Admin không đi qua trang user nữa — vào thẳng /admin.
 */
export function homePathForRole(role: string | null | undefined): string {
  return role === 'ADMIN' ? '/admin' : '/app';
}
