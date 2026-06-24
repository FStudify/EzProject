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
    throw new Error(`${field} must be greater than 0`);
  }
  return Math.max(1, Math.round(num));
}

function parseTaskDeadlineDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 7;
  return Math.max(1, Math.round(num));
}

function buildGenerateProjectPrompt(idea) {
  return `You are a professional project manager. Analyze this project idea and return a complete project preview.

Project idea: "${idea}"

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

Requirements:
- Generate 5 to 15 useful tasks.
- priority must be one of LOW, MEDIUM, HIGH.
- status must always be BACKLOG.
- suggestedDeadlineDays must be a positive integer.
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
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
    throw new Error('tasks must be a non-empty array');
  }

  const projectDays = parsePositiveInteger(parsed.suggestedDeadlineDays, 'suggestedDeadlineDays');
  const tasks = parsed.tasks.map((task) => {
    if (!task || typeof task !== 'object' || !String(task.title || '').trim()) {
      throw new Error('Each task must have a title');
    }
    const taskDays = parseTaskDeadlineDays(task.suggestedDeadlineDays);
    const priority = VALID_PRIORITIES.has(task.priority) ? task.priority : 'MEDIUM';

    return {
      title: String(task.title).trim(),
      description: String(task.description || '').trim(),
      priority,
      status: 'BACKLOG',
      suggestedDeadlineDays: taskDays,
      deadline: daysFromToday(taskDays),
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
      'Tai khoan Gemini da het quota hoac credits. Vui long kiem tra billing/API key.',
    );
  }

  if (status === 400 || status === 401 || status === 403 || /api key/i.test(message)) {
    return new AppError(
      503,
      'AI_AUTH_FAILED',
      'GEMINI_API_KEY khong hop le hoac khong co quyen truy cap model',
    );
  }

  return new AppError(503, 'AI_SERVICE_UNAVAILABLE', 'Dich vu AI tam thoi khong kha dung');
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
  if (!dateStr) return 'chua co';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function classifyIntent(text) {
  const lower = text.toLowerCase();
  if (lower.includes('nhiem vu') || lower.includes('task') || lower.includes('cong viec')) return 'tasks';
  if (lower.includes('thanh vien') || lower.includes('member') || lower.includes('nguoi')) return 'members';
  if (lower.includes('deadline') || lower.includes('han chot') || lower.includes('ngay')) return 'deadline';
  if (lower.includes('tien do') || lower.includes('progress') || lower.includes('%')) return 'progress';
  if (lower.includes('kenh') || lower.includes('chat') || lower.includes('nhom')) return 'chat';
  return 'general';
}

function buildTasksSummary(tasks) {
  if (!tasks || tasks.length === 0) return 'Hien tai chua co nhien vu nao trong du an.';
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter((t) => t.status !== 'DONE' && t.deadline && new Date(t.deadline) < new Date()).length;
  return `Du an co **${tasks.length} nhien vu**: **${done}** hoan thanh, **${inProgress}** dang lam, **${overdue}** qua han.`;
}

function buildMembersSummary(members) {
  if (!members || members.length === 0) return 'Chua co thanh vien trong du an.';
  const roles = { LEADER: 0, SUPERVISOR: 0, MEMBER: 0 };
  for (const m of members) {
    const r = m.role || (m.userId && m.userId.role);
    if (r) roles[r] = (roles[r] || 0) + 1;
  }
  const lines = [`Du an co **${members.length} thanh vien**:`];
  if (roles.LEADER) lines.push(`- **LEADER**: ${roles.LEADER} nguoi`);
  if (roles.SUPERVISOR) lines.push(`- **SUPERVISOR**: ${roles.SUPERVISOR} nguoi`);
  if (roles.MEMBER) lines.push(`- **MEMBER**: ${roles.MEMBER} nguoi`);
  return lines.join('\n');
}

function buildDeadlinesSummary(tasks) {
  const upcoming = tasks
    .filter((t) => t.status !== 'DONE' && t.deadline && new Date(t.deadline) >= new Date())
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);
  if (upcoming.length === 0) return 'Khong co nhien vu nao co deadline sap toi.';
  const lines = ['**Cac nhien vu sap den han:**'];
  for (const t of upcoming) {
    const days = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const dayLabel = days === 0 ? 'Hom nay' : days === 1 ? 'Ngay mai' : `Con ${days} ngay`;
    lines.push(`- **${t.title}** (${dayLabel}, ${formatDate(t.deadline)})`);
  }
  return lines.join('\n');
}

function buildProgressSummary(project, tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const lines = [
    `Tien do du an: **${pct}%**`,
    `${done}/${total} nhien vu hoan thanh.`,
  ];
  if (project.status === 'ACTIVE') lines.push('Trang thai: **Dang hoat dong**');
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
    return 'Ban can dang nhap vao mot du an de toi co the ho tro ban.';
  }

  if (!project) {
    return 'Toi khong tim thay du an nay hoac ban khong co quyen truy cap.';
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
      return 'Du an co cac kenh chat nhom va tin nhan truc tiep. Ban co the tao kenh moi tu giao dien Chat.';
    case 'general':
    default: {
      const lines = [
        `Xin chao! Toi dang ho tro du an **${project.name}**.`,
        buildTasksSummary(tasks),
        buildProgressSummary(project, tasks),
        '',
        'Ban co the hoi toi ve: nhien vu, thanh vien, deadline, tien do, kenh chat.',
      ];
      return lines.join('\n\n');
    }
  }
}

exports.chat = async (req, res, next) => {
  try {
    const { projectId, message } = req.body;

    if (!projectId || !message || !message.trim()) {
      throw errors.BadRequest('projectId and message are required');
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
      return next(new AppError(503, 'AI_UNAVAILABLE', 'Tinh nang AI chua duoc cau hinh tren server nay'));
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[AI] GEMINI_API_KEY is not configured');
      return next(new AppError(503, 'AI_NOT_CONFIGURED', 'Tinh nang AI chua duoc cau hinh'));
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
      return next(new AppError(502, 'AI_INVALID_RESPONSE', 'AI tra ve du lieu khong dung dinh dang'));
    }

    res.json({ success: true, data: generated });
  } catch (err) {
    next(err);
  }
};
