'use strict';

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { ChatRoom } = require('../models/Chat');
const { errors } = require('../middlewares/errorHandler');

const ObjectId = mongoose.Types.ObjectId;

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
