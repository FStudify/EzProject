'use strict';

class AppError extends Error {
  constructor(statusCode, code, message, field) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    this.name = 'AppError';
  }
}

const exactMessages = {
  Unauthorized: 'Chưa xác thực',
  Forbidden: 'Bạn không có quyền thực hiện thao tác này',
  'Validation failed': 'Dữ liệu không hợp lệ',
  'Route not found': 'Không tìm thấy đường dẫn này',
  'Missing authorization header': 'Thiếu thông tin xác thực',
  'User no longer exists': 'Người dùng không còn tồn tại',
  'Invalid or expired token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
  'Admin access required': 'Cần quyền quản trị viên',
  'Too many requests, please try again later': 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau',

  'Tài khoản hoặc mật khẩu sai': 'Tài khoản hoặc mật khẩu sai',
  'Invalid credentials': 'Tài khoản hoặc mật khẩu sai',
  'Invalid or expired refresh token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
  'Email already in use': 'Email đã được sử dụng',
  'Username already taken': 'Tên đăng nhập đã tồn tại',

  'Username or email is required': 'Vui lòng nhập tên đăng nhập hoặc email',
  'Password is required': 'Vui lòng nhập mật khẩu',
  'Full name is required': 'Vui lòng nhập họ tên',
  'Invalid email format': 'Email không đúng định dạng',
  'Username must be at least 3 characters': 'Tên đăng nhập phải có ít nhất 3 ký tự',
  'Username too long': 'Tên đăng nhập không được quá 30 ký tự',
  'Username can only contain letters, numbers, underscores, or dots': 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới hoặc dấu chấm',
  'Password must be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự',
  'Passwords do not match': 'Mật khẩu xác nhận không khớp',

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
  'Only the owner can transfer ownership': 'Chỉ chủ sở hữu mới có thể chuyển quyền',
  'Cannot transfer ownership to yourself': 'Bạn không thể chuyển quyền cho chính mình',
  'Target user is not a member of this project': 'Người dùng được chọn không thuộc dự án này',
  'New owner is not a member of this project': 'Chủ sở hữu mới không thuộc dự án này',
  'You are the owner. Please transfer ownership before leaving.': 'Bạn là chủ sở hữu. Vui lòng chuyển quyền trước khi rời dự án',

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

function translateErrorMessage(message) {
  const text = String(message || '').trim();
  if (!text) return text;
  if (exactMessages[text]) return exactMessages[text];

  if (/^File too large\. Max allowed size is/i.test(text)) {
    return text.replace(/^File too large\. Max allowed size is/i, 'Tệp quá lớn. Dung lượng tối đa là');
  }
  if (/^User .+ is not a member of this project$/i.test(text)) {
    return 'Người dùng này không thuộc dự án này';
  }
  if (/^(.+) not found$/i.test(text)) {
    const resource = text.replace(/\s+not found$/i, '');
    const resourceMessages = {
      User: 'Không tìm thấy người dùng này',
      Project: 'Không tìm thấy dự án này',
      Member: 'Không tìm thấy thành viên này',
      Room: 'Không tìm thấy phòng chat này',
      Task: 'Không tìm thấy công việc này',
      Document: 'Không tìm thấy tài liệu này',
      Meeting: 'Không tìm thấy cuộc họp này',
      Invitation: 'Không tìm thấy lời mời này',
      'Invite link': 'Không tìm thấy link mời này',
      'Pending invitation': 'Không tìm thấy lời mời đang chờ',
    };
    return resourceMessages[resource] || 'Không tìm thấy dữ liệu yêu cầu';
  }

  return text;
}

const errorFactory = {
  AppError,
  BadRequest: (msg, field) => new AppError(400, 'BAD_REQUEST', msg, field),
  Unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  Forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  NotFound: (resource = 'Resource') => {
    const text = String(resource || 'Resource');
    const message = /\bnot found\b/i.test(text) ? text : `${text} not found`;
    return new AppError(404, 'NOT_FOUND', message);
  },
  Conflict: (msg) => new AppError(409, 'CONFLICT', msg),
  ValidationError: (validationErrors) => {
    const e = new AppError(400, 'VALIDATION_ERROR', 'Validation failed');
    e.errors = validationErrors;
    return e;
  },
};

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = {
      success: false,
      error: {
        code: err.code,
        message: translateErrorMessage(err.message),
      },
    };
    if (err.field) body.error.field = err.field;
    if (err.errors) {
      body.error.errors = err.errors.map((item) => ({
        ...item,
        message: translateErrorMessage(item.message),
      }));
    }
    res.status(err.statusCode).json(body);
    return;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? translateErrorMessage(err.message) : 'Lỗi máy chủ nội bộ',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: translateErrorMessage('Route not found') },
  });
}

module.exports = {
  AppError,
  errors: errorFactory,
  errorHandler,
  notFoundHandler,
  translateErrorMessage,
};
