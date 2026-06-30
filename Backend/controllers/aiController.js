'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { ChatRoom } = require('../models/Chat');
const { AppError, errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

const VALID_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);

function daysFromToday(days) {
  const safeDays = Number.isInteger(days) && days > 0 ? days : 1;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + safeDays);
  return date.toISOString();
}

function parsePositiveInteger(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`${field} phải lớn hơn 0`);
  }
  return Math.max(1, Math.round(num));
}

function parseTaskDeadlineDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 7;
  return Math.max(1, Math.round(num));
}

function clampToProjectWindow(taskDays, projectDays) {
  const t = Math.max(1, Number.isFinite(taskDays) && taskDays > 0 ? Math.round(taskDays) : 1);
  const p = Math.max(1, Number.isFinite(projectDays) && projectDays > 0 ? Math.round(projectDays) : 30);
  return Math.min(t, p);
}

function buildGenerateProjectPrompt(idea) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  return `You are a professional project manager. Analyze this project idea and return a complete project preview.

Project idea: "${idea}"

Today (UTC) is ${todayStr}.

Return valid JSON only. Do not include markdown, code fences, or explanations. Use this exact schema:
{
  "name": "Short project name, max 100 characters",
  "description": "Project description, 100-300 characters",
  "subject": "Domain or school subject",
  "suggestedDeadlineDays": 30,
  "tasks": [
    {
      "title": "Short task title",
      "description": "Task description",
      "priority": "LOW | MEDIUM | HIGH",
      "status": "BACKLOG",
      "suggestedDeadlineDays": 7
    }
  ]
}

Hard validation rules (these are enforced on the server; violating them will be rejected):
- "suggestedDeadlineDays" of the project MUST be a positive integer >= 5 and <= 180.
- Each task's "suggestedDeadlineDays" MUST be a positive integer >= 1.
- Every task's "suggestedDeadlineDays" MUST be <= the project's "suggestedDeadlineDays" (a task cannot end after the project ends).
- Spread tasks across the project timeline: early tasks should have smaller deadlines, later tasks larger ones, but never exceed the project deadline.

Other requirements:
- Generate 5 to 15 useful tasks.
- priority must be one of LOW, MEDIUM, HIGH.
- status must always be BACKLOG.
- Reply in the same language as the input idea.`;
}

function extractJson(raw) {
  const text = String(raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function parseGeminiResponse(raw) {
  const parsed = JSON.parse(extractJson(raw));
  const requiredFields = ['name', 'description', 'subject', 'suggestedDeadlineDays', 'tasks'];

  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }
  }

  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw new Error('Danh sách công việc không được để trống');
  }

  const projectDays = Math.min(180, Math.max(5, parsePositiveInteger(parsed.suggestedDeadlineDays, 'suggestedDeadlineDays')));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = parsed.tasks.map((task) => {
    if (!task || typeof task !== 'object' || !String(task.title || '').trim()) {
      throw new Error('Mỗi công việc phải có tiêu đề');
    }
    const rawTaskDays = parseTaskDeadlineDays(task.suggestedDeadlineDays);
    const priority = VALID_PRIORITIES.has(task.priority) ? task.priority : 'MEDIUM';
    const safeTaskDays = clampToProjectWindow(rawTaskDays, projectDays);
    const deadline = daysFromToday(safeTaskDays);

    if (new Date(deadline) < today) {
      throw new Error('Deadline công việc do AI gợi ý phải lớn hơn hoặc bằng ngày hiện tại');
    }

    return {
      title: String(task.title).trim(),
      description: String(task.description || '').trim(),
      priority,
      status: 'BACKLOG',
      suggestedDeadlineDays: safeTaskDays,
      deadline,
    };
  });

  return {
    name: String(parsed.name).trim(),
    description: String(parsed.description).trim(),
    subject: String(parsed.subject).trim(),
    suggestedDeadlineDays: projectDays,
    deadline: daysFromToday(projectDays),
    tasks,
  };
}

function mapGeminiError(err) {
  const status = err?.status || err?.response?.status;
  const message = String(err?.message || '');

  if (
    status === 429 ||
    /quota|credits?|billing|prepayment/i.test(message)
  ) {
    return new AppError(
      503,
      'AI_QUOTA_EXCEEDED',
      'Tài khoản Gemini đã hết quota hoặc credits. Vui lòng kiểm tra billing/API key.',
    );
  }

  if (status === 400 || status === 401 || status === 403 || /api key/i.test(message)) {
    return new AppError(
      503,
      'AI_AUTH_FAILED',
      'GEMINI_API_KEY không hợp lệ hoặc không có quyền truy cập model',
    );
  }

  return new AppError(503, 'AI_SERVICE_UNAVAILABLE', 'Dịch vụ AI tạm thời không khả dụng');
}

function getGeminiModelNames() {
  const primary = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return [...new Set([primary, 'gemini-2.5-flash-lite'])];
}

function canTryFallbackModel(err) {
  const status = err?.status || err?.response?.status;
  const message = String(err?.message || '');
  if (status === 400 || status === 401 || status === 403 || /api key/i.test(message)) {
    return false;
  }
  return status === 429 || status === 500 || status === 503;
}

function formatDate(dateStr) {
  if (!dateStr) return 'chưa có';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function classifyIntent(text) {
  const lower = text.toLowerCase();
  if (lower.includes('nhiem vu') || lower.includes('nhiệm vụ') || lower.includes('task') || lower.includes('cong viec') || lower.includes('công việc')) return 'tasks';
  if (lower.includes('thanh vien') || lower.includes('member') || lower.includes('nguoi')) return 'members';
  if (lower.includes('deadline') || lower.includes('han chot') || lower.includes('hạn chót') || lower.includes('ngay') || lower.includes('ngày')) return 'deadline';
  if (lower.includes('tien do') || lower.includes('tiến độ') || lower.includes('progress') || lower.includes('%')) return 'progress';
  if (lower.includes('kenh') || lower.includes('chat') || lower.includes('nhom')) return 'chat';
  return 'general';
}

function buildTasksSummary(tasks) {
  if (!tasks || tasks.length === 0) return 'Hiện tại chưa có nhiệm vụ nào trong dự án.';
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter((t) => t.status !== 'DONE' && t.deadline && new Date(t.deadline) < new Date()).length;
  return `Dự án có **${tasks.length} nhiệm vụ**: **${done}** hoàn thành, **${inProgress}** đang làm, **${overdue}** quá hạn.`;
}

function buildMembersSummary(members) {
  if (!members || members.length === 0) return 'Chưa có thành viên trong dự án.';
  const roles = { LEADER: 0, SUPERVISOR: 0, MEMBER: 0 };
  for (const m of members) {
    const r = m.role || (m.userId && m.userId.role);
    if (r) roles[r] = (roles[r] || 0) + 1;
  }
  const lines = [`Dự án có **${members.length} thành viên**:`];
  if (roles.LEADER) lines.push(`- **LEADER**: ${roles.LEADER} người`);
  if (roles.SUPERVISOR) lines.push(`- **SUPERVISOR**: ${roles.SUPERVISOR} người`);
  if (roles.MEMBER) lines.push(`- **MEMBER**: ${roles.MEMBER} người`);
  return lines.join('\n');
}

function buildDeadlinesSummary(tasks) {
  const upcoming = tasks
    .filter((t) => t.status !== 'DONE' && t.deadline && new Date(t.deadline) >= new Date())
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);
  if (upcoming.length === 0) return 'Không có nhiệm vụ nào có deadline sắp tới.';
  const lines = ['**Các nhiệm vụ sắp đến hạn:**'];
  for (const t of upcoming) {
    const days = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const dayLabel = days === 0 ? 'Hôm nay' : days === 1 ? 'Ngày mai' : `Còn ${days} ngày`;
    lines.push(`- **${t.title}** (${dayLabel}, ${formatDate(t.deadline)})`);
  }
  return lines.join('\n');
}

function buildProgressSummary(project, tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const lines = [
    `Tiến độ dự án: **${pct}%**`,
    `${done}/${total} nhiệm vụ hoàn thành.`,
  ];
  if (project.status === 'ACTIVE') lines.push('Trạng thái: **Đang hoạt động**');
  if (project.deadline) lines.push(`Deadline du an: **${formatDate(project.deadline)}**`);
  return lines.join('\n');
}

async function generateAIResponse(text, projectId, userId) {
  const intent = classifyIntent(text);

  let project;
  try {
    project = await Project.findOne({
      _id: new ObjectId(projectId),
      'members.userId': new ObjectId(userId),
    })
      .populate('members.userId', 'fullName email avatar')
      .lean();
  } catch {
    return 'Bạn cần đăng nhập vào một dự án để tôi có thể hỗ trợ bạn.';
  }

  if (!project) {
    return 'Tôi không tìm thấy dự án này hoặc bạn không có quyền truy cập.';
  }

  let tasks = [];
  try {
    tasks = await Task.find({ projectId: new ObjectId(projectId) })
      .populate('assigneeId', 'fullName')
      .lean();
  } catch {
    tasks = [];
  }

  switch (intent) {
    case 'tasks':
      return buildTasksSummary(tasks);
    case 'members':
      return buildMembersSummary(project.members);
    case 'deadline':
      return buildDeadlinesSummary(tasks);
    case 'progress':
      return buildProgressSummary(project, tasks);
    case 'chat':
      return 'Dự án có các kênh chat nhóm và tin nhắn trực tiếp. Bạn có thể tạo kênh mới từ giao diện Trò chuyện.';
    case 'general':
    default: {
      const lines = [
        `Xin chào! Tôi đang hỗ trợ dự án **${project.name}**.`,
        buildTasksSummary(tasks),
        buildProgressSummary(project, tasks),
        '',
        'Bạn có thể hỏi tôi về: nhiệm vụ, thành viên, deadline, tiến độ, kênh chat.',
      ];
      return lines.join('\n\n');
    }
  }
}

exports.chat = async (req, res, next) => {
  try {
    const { projectId, message } = req.body;

    if (!projectId || !message || !message.trim()) {
      throw errors.BadRequest('Thiếu projectId hoặc nội dung tin nhắn');
    }

    const response = await generateAIResponse(message.trim(), projectId, req.user.id);

    res.json({
      success: true,
      data: {
        content: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.generateProjectFromIdea = async (req, res, next) => {
  try {
    let GoogleGenerativeAI;
    try {
      ({ GoogleGenerativeAI } = require('@google/generative-ai'));
    } catch {
      return next(new AppError(503, 'AI_UNAVAILABLE', 'Tính năng AI chưa được cấu hình trên server này'));
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI] GEMINI_API_KEY is not configured');
      return next(new AppError(503, 'AI_NOT_CONFIGURED', 'Tính năng AI chưa được cấu hình'));
    }

    const { idea } = req.body;
    const genAI = new GoogleGenerativeAI(apiKey);

    let result;
    let lastGeminiErr;
    try {
      const prompt = buildGenerateProjectPrompt(idea);
      const modelNames = getGeminiModelNames();
      for (const modelName of modelNames) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          result = await model.generateContent(prompt);
          break;
        } catch (modelErr) {
          lastGeminiErr = modelErr;
          console.error('[AI] Gemini API error:', modelErr?.message);
          if (!canTryFallbackModel(modelErr) || modelName === modelNames[modelNames.length - 1]) {
            throw modelErr;
          }
          console.warn(`[AI] Gemini model ${modelName} failed, trying fallback model`);
        }
      }
    } catch (geminiErr) {
      return next(mapGeminiError(geminiErr || lastGeminiErr));
    }

    const raw = result?.response?.text?.() || '';
    let generated;
    try {
      generated = parseGeminiResponse(raw);
    } catch (parseErr) {
      console.error('[AI] Parse error:', parseErr?.message, '| Raw:', raw.slice(0, 200));
      return next(new AppError(502, 'AI_INVALID_RESPONSE', 'AI trả về dữ liệu không đúng định dạng'));
    }

    res.json({ success: true, data: generated });
  } catch (err) {
    next(err);
  }
};
