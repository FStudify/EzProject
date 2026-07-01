'use strict';

/**
 * ============================================================
 * Seed IT Development Tasks — EZProject
 * Assign all to: Hoàng Võ Bảo Khánh (6a44c4bab6896738e7b06071)
 * Deadline: 01/06 → 28/06/2026
 * Start date: deadline - 7 days
 * Run: node Backend/seed/seedITTasks.js
 * ============================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');

const PROJECT_ID = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');
const ASSIGNEE_ID = new mongoose.Types.ObjectId('6a44c4bab6896738e7b06071');
const CREATOR_ID = new mongoose.Types.ObjectId('6a41ecfdba2491bec8005aca');

const DAY = 24 * 60 * 60 * 1000;

function dateOfJune(day) {
  return new Date(Date.UTC(2026, 5, day, 7, 0, 0));
}

const TASKS = [
  // Backend & API
  {
    title: 'Thiết kế và tối ưu Database Schema',
    description:
      'Rà soát lại toàn bộ database schema hiện tại (User, Project, Task, Meeting, Chat, Activity, Notification), chuẩn hóa index, áp dụng các best practice về MongoDB như aggregation pipeline, populate optimization và lookup thay vì nested populate nhiều cấp. Tạo ERD mới cho team.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    day: 1,
  },
  {
    title: 'Xây dựng REST API cho Dashboard & Analytics',
    description:
      'Phát triển các endpoint /api/v1/dashboard/stats trả về tổng hợp số liệu: tổng tasks theo status, tiến độ project, thống kê hoạt động user trong 7 ngày gần nhất, top contributors. Dùng aggregation pipeline để query hiệu quả.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    day: 2,
  },
  {
    title: 'Implement JWT Refresh Token & Session Management',
    description:
      'Bổ sung Refresh Token mechanism cho hệ thống auth hiện tại. Xử lý token rotation, revoke token khi logout, blacklist tokens khi đổi mật khẩu. Cài đặt token expiry ngắn cho access token (15 phút) và dài cho refresh token (7 ngày).',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 3,
  },
  {
    title: 'Xây dựng WebSocket Real-time cho Notifications & Activity',
    description:
      'Tích hợp Socket.io vào backend để push real-time notifications khi có task mới, comment mới, meeting reminder, chat message. Viết event handlers cho JOIN_ROOM theo projectId, BROADCAST khi có thay đổi trong project. Frontend subscribe qua socket.on(notification).',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 4,
  },
  {
    title: 'Implement Role-Based Access Control (RBAC) Middleware',
    description:
      'Viết middleware kiểm soát quyền truy cập chi tiết trên từng endpoint: chỉ OWNER được xóa project, LEADER/SUPERVISOR được assign task, MEMBER chỉ đọc. Middleware kiểm tra userId vs member.userId trong project trước khi cho phép thao tác.',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 5,
  },
  {
    title: 'Xây dựng API xử lý File Upload & Attachment',
    description:
      'Implement endpoint upload file đính kèm cho Task (ảnh, tài liệu PDF/Word) dùng Multer + Cloud Storage (AWS S3 hoặc Cloudinary). Tạo API /api/v1/tasks/:id/attachments — POST upload, GET list, DELETE. Giới hạn dung lượng 10MB, validate file type.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 6,
  },
  {
    title: 'Tối ưu hóa Database Queries với Indexing & Pagination',
    description:
      'Rà soát các query chậm trong taskController, projectController, meetingController. Thêm compound indexes cho các truy vấn phổ biến (projectId + status, assigneeId + deadline). Implement cursor-based pagination thay vì offset cho các danh sách lớn, giảm server load.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 7,
  },
  {
    title: 'Xây dựng API Export Report (CSV/Excel)',
    description:
      'Implement endpoint /api/v1/projects/:id/export cho phép export dữ liệu project dưới dạng CSV/Excel: danh sách tasks (theo status), thống kê meeting, thành viên. Dùng thư viện exceljs hoặc csv-writer để generate file, trả về download link có expiry.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 8,
  },
  {
    title: 'Implement Email Notification Service',
    description:
      'Cài đặt hệ thống gửi email tự động qua Nodemailer/SendGrid khi: được assign task mới, deadline sắp đến (24h trước), meeting reminder (1h trước), invitation được chấp nhận. Viết email template responsive HTML cho các notification type.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 9,
  },
  {
    title: 'Xây dựng Search API với Full-Text Search',
    description:
      'Implement endpoint /api/v1/search hỗ trợ tìm kiếm toàn diện trên tasks, projects, meetings, users dùng MongoDB Text Index. Kết quả phân loại theo type, highlight keyword matching, pagination. Tốc độ response < 200ms.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 10,
  },
  // Frontend & UI/UX
  {
    title: 'Redesign Task Board với Kanban View',
    description:
      'Cải tiến Task Board từ danh sách đơn giản sang Kanban với drag-and-drop columns (BACKLOG → IN_PROGRESS → REVIEW → DONE). Dùng thư viện @dnd-kit để implement drag-drop mượt. Thêm filter theo assignee, priority, hashtag và search inline.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    day: 11,
  },
  {
    title: 'Xây dựng Dashboard với Charts & KPI Widgets',
    description:
      'Thiết kế và implement Dashboard page với các widget: biểu đồ tasks theo status (donut chart), timeline tiến độ project (progress bar), hoạt động gần đây (activity feed), deadline sắp tới. Dùng Recharts hoặc Chart.js. Responsive trên mobile.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    day: 12,
  },
  {
    title: 'Implement Dark Mode Toggle',
    description:
      'Thêm tính năng chuyển đổi Dark/Light mode trong settings. Dùng CSS variables để quản lý theme, lưu preference vào localStorage và backend (User.theme field). Tất cả components phải support cả hai theme. Áp dụng smooth transition khi chuyển đổi.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 13,
  },
  {
    title: 'Xây dựng Realtime Notification Bell & Toast',
    description:
      'Implement Notification Bell icon với badge count số thông báo chưa đọc. Dropdown hiển thị danh sách notifications với type icons (task, meeting, chat, invite). Toast notification popup góc phải màn hình khi có sự kiện real-time. Có nút Mark all as read.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 14,
  },
  {
    title: 'Implement Skeleton Loading & Optimistic UI',
    description:
      'Thay thế tất cả loading spinner bằng skeleton screens đồng nhất. Implement optimistic UI cho các action: tạo task, update status (cập nhật ngay trên UI trước khi API trả về, rollback nếu thất bại). Cải thiện perceived performance.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 15,
  },
  {
    title: 'Refactor Global State với Zustand',
    description:
      'Rà soát và refactor các context providers hiện tại (AuthContext, ProjectContext, etc.) sang Zustand stores để đơn giản hóa code, giảm re-renders. Tách stores theo domain: authStore, projectStore, taskStore, notificationStore. Dùng persist middleware.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 16,
  },
  {
    title: 'Xây dựng Modal System & Reusable Component Library',
    description:
      'Xây dựng hệ thống Modal thống nhất với các variants: confirmation, form, detail view, full-screen. Tạo component library gồm: Button, Input, Select, Badge, Avatar, Dropdown, Tabs, Pagination — đảm bảo consistency về spacing, colors, typography. Viết Storybook stories.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 17,
  },
  {
    title: 'Implement Advanced Task Filtering & Sorting',
    description:
      'Bổ sung bộ lọc nâng cao cho task list: filter theo date range (created, deadline), filter theo multiple hashtags (AND/OR), filter theo requestType (review, pause), sort theo priority, sort theo assignee name. Filter state được lưu trong URL query params để share được.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 18,
  },
  {
    title: 'Responsive Layout & Mobile Navigation',
    description:
      'Tối ưu toàn bộ layout cho mobile (< 768px). Implement hamburger menu, bottom navigation bar cho mobile. Đảm bảo task board, meeting list, chat đều sử dụng được trên điện thoại. Test trên iOS Safari và Android Chrome. Đạt Lighthouse Mobile score > 85.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 19,
  },
  {
    title: 'Xây dựng Chat UI với Real-time Messaging',
    description:
      'Thiết kế và implement Chat interface với real-time messaging qua Socket.io. Hỗ trợ General room và Channels. Hiển thị message với avatar, timestamp, read receipts. Emoji picker, file attachment trong chat. Infinite scroll cho message history.',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 20,
  },
  // Testing & QA
  {
    title: 'Viết Unit Tests với Vitest cho Backend Controllers',
    description:
      'Thiết lập Vitest + Supertest cho backend. Viết unit tests cho các controllers quan trọng: taskController (CRUD, status transitions), authController (login, register, token), projectController (invite, remove member). Đạt coverage > 70% cho các controller này.',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 21,
  },
  {
    title: 'Viết Integration Tests cho API Endpoints',
    description:
      'Viết integration tests cho các flows chính: (1) Auth flow — register → login → refresh token, (2) Project flow — create → invite member → remove member, (3) Task flow — create → assign → update status → add comment → complete. Dùng test database riêng, seed data tự động.',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 22,
  },
  {
    title: 'Thiết lập E2E Testing với Playwright',
    description:
      'Cài đặt Playwright và viết E2E test cho các user journeys: (1) đăng nhập → tạo project → thêm task → assign, (2) tạo meeting → nhận notification, (3) chat trong project. Setup CI pipeline chạy E2E tests mỗi khi merge vào main branch.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 23,
  },
  {
    title: 'Setup CI/CD với GitHub Actions',
    description:
      'Thiết lập GitHub Actions workflow cho: (1) lint + type-check mỗi PR, (2) unit + integration tests trên Node 18/20, (3) frontend build và deploy lên Vercel khi merge vào master, (4) backend deploy lên Railway/Render khi merge vào master. Thêm notification Slack khi deploy thất bại.',
    status: 'BACKLOG',
    priority: 'HIGH',
    day: 24,
  },
  {
    title: 'Performance Audit & Optimization',
    description:
      'Chạy Lighthouse audit trên production, tối ưu: (1) bundle size — code-split routes, lazy load components, tree-shake unused imports, (2) API response time — profile slow endpoints, implement caching Redis cho các query thường xuyên, (3) frontend rendering — memo components, virtualize long lists > 50 items.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 25,
  },
  // Features & Enhancements
  {
    title: 'Implement i18n Internationalization (VI/EN)',
    description:
      'Cài đặt i18next cho frontend hỗ trợ 2 ngôn ngữ: Tiếng Việt (mặc định) và English. Tách tất cả strings ra i18n dict files. Language preference được lưu trong User.language field. Tất cả date/time format phải localize theo ngôn ngữ người dùng chọn.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 26,
  },
  {
    title: 'Xây dựng Activity Log & Audit Trail',
    description:
      'Ghi lại toàn bộ hoạt động trong project: ai tạo/sửa/xóa task, ai tham gia/ra khỏi project, ai thay đổi deadline. Tạo Activity timeline component hiển thị trong project detail. Cho phép filter activity theo user, action type, date range.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 27,
  },
  {
    title: 'SEO & PWA Setup cho Website',
    description:
      'Implement PWA (Progressive Web App): Service Worker để cache static assets và API responses, Web App Manifest cho Add to Home Screen, offline fallback page. Cải thiện SEO: meta tags, Open Graph, JSON-LD structured data cho project boards, sitemap.xml, robots.txt.',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    day: 28,
  },
];

async function main() {
  try {
    console.log('\n========================================');
    console.log('  EZProject — Seed IT Tasks');
    console.log('========================================\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MongoDB] Connected');

    const project = await Project.findById(PROJECT_ID);
    if (!project) {
      console.error('[Error] Project not found:', PROJECT_ID);
      process.exit(1);
    }
    console.log('[Project] Found:', project.name);

    const deleted = await Task.deleteMany({ projectId: PROJECT_ID, hashtags: 'it' });
    console.log(`[Seed] Cleared ${deleted.deletedCount} existing IT tasks`);

    const tasksToInsert = TASKS.map((t) => {
      const deadline = dateOfJune(t.day);
      const startDate = new Date(deadline.getTime() - 7 * DAY);
      return {
        projectId: PROJECT_ID,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        creatorId: CREATOR_ID,
        assigneeId: ASSIGNEE_ID,
        deadline,
        startDate,
        hashtags: ['it'],
        comments: [],
      };
    });

    const inserted = await Task.insertMany(tasksToInsert);
    console.log(`[Seed] Inserted ${inserted.length} IT tasks\n`);

    inserted.forEach((task) => {
      const deadline = task.deadline;
      const d = `0${deadline.getUTCDate()}/0${deadline.getUTCMonth() + 1}/2026`;
      console.log(`  [${task.status.padEnd(12)}] ${task.title} | deadline: ${d}`);
    });

    console.log('\n========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================\n');
  } catch (err) {
    console.error('[Seed] Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
