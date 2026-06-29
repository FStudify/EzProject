'use strict';

const User = require('../models/User');

/**
 * Format phần thời gian còn lại của block (tiếng Việt).
 * Trả về null nếu đã hết hạn.
 *
 * @example
 *   formatRemainingVi(now + 7 days + 2 hours) → "7 ngày 2 giờ"
 *   formatRemainingVi(now + 3 hours)          → "3 giờ"
 *   formatRemainingVi(now + 30 mins)          → "dưới 1 giờ"
 */
function formatRemainingVi(until) {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalHours = Math.ceil(ms / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const parts = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (parts.length === 0) parts.push('dưới 1 giờ');
  return parts.join(' ');
}

/**
 * Trả về object mô tả trạng thái bị khoá của user:
 *   { blocked, blockedUntil, blockedReason, message, remainingText }
 *
 *   - `blocked`     : true nếu user đang bị khoá
 *   - `message`     : câu tiếng Việt đầy đủ (vd: "Tài khoản của bạn đã bị khoá trong 7 ngày 2 giờ. Lý do: …")
 */
function describeBlock(user) {
  if (!user || !user.isBlocked) {
    return { blocked: false };
  }
  const reason = user.blockedReason;
  const until = user.blockedUntil;
  const remaining = until ? formatRemainingVi(until) : null;
  const durationText = remaining ? `trong ${remaining}` : 'vĩnh viễn';
  const message = reason
    ? `Tài khoản của bạn đã bị khoá ${durationText}. Lý do: ${reason}.`
    : `Tài khoản của bạn đã bị khoá ${durationText}.`;
  return {
    blocked: true,
    blockedUntil: until ? new Date(until).toISOString() : null,
    blockedReason: reason || null,
    remainingText: remaining,
    message,
  };
}

/**
 * Lazy-unblock: nếu user bị khoá có thời hạn mà đã quá hạn thì gỡ trạng thái.
 * Trả về `true` nếu đã thực sự gỡ, `false` nếu không.
 *
 * Cập nhật cả object trong bộ nhớ + ghi xuống DB.
 */
async function clearExpiredBlock(user) {
  if (!user || !user.isBlocked) return false;
  const until = user.blockedUntil;
  if (!until || new Date(until).getTime() > Date.now()) return false;
  user.isBlocked = false;
  user.blockedAt = null;
  user.blockedUntil = null;
  user.blockedReason = null;
  await User.updateOne(
    { _id: user._id },
    { $set: { isBlocked: false, blockedAt: null, blockedUntil: null, blockedReason: null } },
  );
  return true;
}

module.exports = {
  formatRemainingVi,
  describeBlock,
  clearExpiredBlock,
};
