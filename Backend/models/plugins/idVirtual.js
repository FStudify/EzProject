'use strict';

/**
 * =====================================================================================
 *  Mongoose Plugin: expose `id` virtual + ensure it's emitted in JSON + lean outputs
 * =====================================================================================
 *
 * Lý do tồn tại:
 * - Frontend `AdminUser`, `AdminProject`, `AdminAnnouncement`, `AdminActivityLog`,
 *   `AdminHealthError`, `DetailBody.user` types đều khai báo `id: string`.
 * - Mongoose mặc định chỉ serialize `_id` (ObjectId) khi gọi `.lean()` hoặc `.toJSON()`.
 * - Hệ quả trước đây: `u.id` ở frontend = `undefined` → URL build sai
 *   (vd `/users/undefined/block`) → server 500 vì CastError ObjectId.
 *
 * Plugin này thêm `id` (string) song song với `_id` cho cả:
 *   - toJSON / toObject (document thường)
 *   - .lean({ virtuals: true }) (cần `mongoose-lean-virtuals` đã cài ở package.json)
 *
 * Không phá contract: `_id` vẫn giữ nguyên, chỉ thêm `id`.
 */
const leanVirtuals = require('mongoose-lean-virtuals');

module.exports = function idVirtualPlugin(schema) {
  // (1) Virtual getter thuần — hoạt động khi gọi .toJSON() / .toObject()
  schema.virtual('id').get(function idVirtualGetter() {
    return this._id != null ? String(this._id) : undefined;
  });

  // (2) Đăng ký mongoose-lean-virtuals để các query `.lean({ virtuals: true })`
  //     cũng include `id`
  schema.plugin(leanVirtuals);

  // (3) Mặc định bật virtuals cho toJSON / toObject
  schema.set('toJSON', { ...(schema.options.toJSON || {}), virtuals: true });
  schema.set('toObject', { ...(schema.options.toObject || {}), virtuals: true });
};
