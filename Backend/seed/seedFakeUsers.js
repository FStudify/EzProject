'use strict';

/**
 * ============================================================
 * Seed Fake Users — Tao 100 user gia voi project va task
 * Run: node seed/seedFakeUsers.js
 * ============================================================
 */

require('dotenv/config');
const mongoose = require('mongoose');

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

// ── DATA POOLS ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'An', 'Bảo', 'Khánh', 'Minh', 'Nam', 'Việt', 'Hùng', 'Tuấn', 'Phong', 'Thành',
  'Huy', 'Lâm', 'Trung', 'Dũng', 'Hoàng', 'Quang', 'Đức', 'Anh', 'Thắng', 'Khôi',
  'Hiếu', 'Toàn', 'Thịnh', 'Đạt', 'Nghĩa', 'Phú', 'Tùng', 'Sơn', 'Cường', 'Bình',
  'Gia', 'Tiến', 'Văn', 'Thanh', 'Khang', 'Long', 'Quân', 'Kiên', 'Vũ', 'Lộc',
  'Duy', 'Thiện', 'Phát', 'Đăng', 'Chí', 'Tân', 'Hải', 'Thọ', 'Bách', 'Minh',
];

const MIDDLE_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Vũ', 'Đặng', 'Bùi',
  'Ngô', 'Đỗ', 'Hồ', 'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh',
  'Vũ', 'Đặng',
];

const LAST_NAMES = [
  'An', 'Bảo', 'Khánh', 'Minh', 'Nam', 'Việt', 'Hùng', 'Tuấn', 'Phong', 'Thành',
  'Huy', 'Lâm', 'Trung', 'Dũng', 'Hoàng', 'Quang', 'Đức', 'Anh', 'Thắng', 'Khôi',
  'Hiếu', 'Toàn', 'Thịnh', 'Đạt', 'Nghĩa', 'Phú', 'Tùng', 'Sơn', 'Cường', 'Bình',
  'Gia', 'Tiến', 'Văn', 'Thanh', 'Khang', 'Long', 'Quân', 'Kiên', 'Vũ', 'Lộc',
  'Duy', 'Thiện', 'Phát', 'Đăng', 'Chí', 'Tân', 'Hải', 'Thọ', 'Bách', 'Minh',
];

const NICKNAMES = [
  'cute', 'dev', 'pro', 'z', 'kute', 'cuti', 'ngoc', 'bach', 'khoi', 'huy',
  'prodev', 'devpro', 'web', 'code', 'app', 'tech', 'data', 'cloud', 'ai', 'game',
  'meo', 'ga', 'cho', 'vang', 'den', 'xanh', 'do', 'tim', 'cam', 'huong',
  'anh', 'em', 'chi', 'bu', 'ong', 'ba', 'co', 'chu', 'bac', 'tre',
  'hot', 'cool', 'nice', 'vip', 'star', 'king', 'queen', 'hero', 'ace', 'boss',
  'admin', 'mod', 'user', 'master', 'guru', 'wizard', 'ninja', 'samurai', 'dragon', 'phoenix',
  'lion', 'tiger', 'eagle', 'wolf', 'bear', 'shark', 'snake', 'monkey', 'fox', 'cat',
];

const SUBJECTS = [
  'Công nghệ phần mềm', 'Marketing số', 'Thiết kế đồ họa', 'Kinh doanh số',
  'Khoa học dữ liệu', 'Trí tuệ nhân tạo', 'An ninh mạng', 'Kinh tế số',
  'Quản trị kinh doanh', 'Luật kinh tế', 'Tài chính ngân hàng', 'Kế toán doanh nghiệp',
  'Nhật kỹ thuật', 'Hàn kỹ thuật', 'Điện tử viễn thông', 'Cơ khí chế tạo',
  'Công nghệ thông tin', 'Quản lý dự án', 'Logistics', 'Thương mại điện tử',
  'Khởi nghiệp', 'Giải pháp số', 'Chuyển đổi số', 'IoT và tự động hóa',
];

const PROJECT_TEMPLATES = [
  {
    name: 'Xây dựng website thương mại điện tử cho cửa hàng {adj} {noun}',
    desc: 'Thiết kế và phát triển website bán hàng trực tuyến với ReactJS, NodeJS, MongoDB. Tích hợp thanh toán MoMo, VNPay.',
  },
  {
    name: 'Ứng dụng di động {adj} cho {noun}',
    desc: 'Phát triển ứng dụng mobile app bằng React Native. Hỗ trợ iOS và Android. Push notification và lịch sử hoạt động.',
  },
  {
    name: 'Hệ thống quản lý {adj} cho doanh nghiệp {noun}',
    desc: 'Xây dựng ERP system với ExpressJS, PostgreSQL. Quản lý nhân sự, tài chính, kho bãi tập trung.',
  },
  {
    name: 'Nền tảng học trực tuyến {adj}',
    desc: 'Phát triển LMS platform với NextJS, Socket.io cho livestream. Tích hợp Zoom API, chấm điểm tự động.',
  },
  {
    name: 'Chiến dịch marketing số cho sản phẩm {noun}',
    desc: 'Lập kế hoạch marketing đa kênh. SEO, Google Ads, Facebook Ads. Mục tiêu tăng 200% traffic trong 3 tháng.',
  },
  {
    name: 'Chatbot AI hỗ trợ {adj} khách hàng',
    desc: 'Xây dựng chatbot sử dụng GPT-4 API tích hợp vào fanpage và website. Tự động trả lời, cá nhân hóa theo người dùng.',
  },
  {
    name: 'Dashboard phân tích dữ liệu {adj} cho {noun}',
    desc: 'Visualization dữ liệu bằng D3.js, ChartJS. Kết nối API Google Analytics, Facebook Insights. Báo cáo tự động hàng ngày.',
  },
  {
    name: 'Thiết kế UI/UX cho app {adj}',
    desc: 'Nghiên cứu UX, wireframe, mockup, prototype trên Figma. Design system hoàn chỉnh. 10+ màn hình responsive.',
  },
  {
    name: 'Game mobile {adj} {noun}',
    desc: 'Phát triển game 2D/3D trên Unity. Multiplayer qua Photon. Hệ thống IAP, quảng cáo AdMob. Dự kiến 50k download.',
  },
  {
    name: 'Hệ thống IoT giám sát {adj}',
    desc: 'Thu thập dữ liệu cảm biến bằng ESP32, truyền lên MQTT broker. Dashboard real-time trên React. Cảnh báo tự động qua Telegram.',
  },
  {
    name: 'Nền tảng thương mại điện tử B2B cho {noun}',
    desc: 'Sàn thương mại B2B kết nối nhà cung cấp và doanh nghiệp. Thanh toán LC, T/T. Quản lý đơn hàng và vận chuyển.',
  },
  {
    name: 'Cổng thông tin {adj} cho cộng đồng {noun}',
    desc: 'Portal tin tức, sự kiện cộng đồng. CMS quản trị bằng Strapi. Tích hợp Google Maps, lịch sự kiện.',
  },
  {
    name: 'Tool automation {adj} cho {noun}',
    desc: 'Viết script Python tự động hóa quy trình. Crawl dữ liệu, xử lý Excel, gửi email tự động. Tiết kiệm 10h/tuần.',
  },
  {
    name: 'App đặt lịch khám {adj} cho phòng khám',
    desc: 'Ứng dụng đặt lịch online, nhắc lịch tự động qua SMS/email. Quản lý bệnh nhân, hồ sơ y tế.',
  },
  {
    name: 'Website chăm sóc thú cưng {adj}',
    desc: 'Nền tảng quản lý thú cưng: lịch tiêm phòng, dịch vụ spa, giao thức ăn. Tích hợp video streaming.',
  },
  {
    name: 'AR/VR cho trải nghiệm {adj}',
    desc: 'Ứng dụng thực tế tăng cường cho bất động sản, nội thất. Quét phòng, đặt nội thất ảo, xem trước kết quả.',
  },
  {
    name: 'Mạng xã hội {adj} cho nhóm {noun}',
    desc: 'Nền tảng SNS cho cộng đồng ngách. Chia sẻ video, livestream, marketplace nhỏ. Mô hình freemium.',
  },
  {
    name: 'E-commerce {adj} cho sản phẩm handmade {noun}',
    desc: 'Marketplace cho sản phẩm thủ công, handmade. Live shopping, đấu giá, cá nhân hóa theo người bán.',
  },
  {
    name: 'Phần mềm quản lý {adj} cho trường học {noun}',
    desc: 'Hệ thống quản lý học sinh, điểm thi, lịch giảng, phụ huynh. Mobile app cho giáo viên và phụ huynh.',
  },
  {
    name: 'Hệ thống booking {adj} cho dịch vụ {noun}',
    desc: 'Đặt lịch online cho spa, salon, phòng gym. Membership, loyalty points, review. Tích hợp thanh toán QR.',
  },
];

const ADJECTIVES = [
  'Shop', 'Store', 'Mart', 'Giới', 'Hàng', 'Cửa', 'Siêu', 'Nhanh', 'Mới', 'Pro',
  'Mini', 'Max', 'Plus', 'Go', 'Up', 'In', 'Live', 'Smart', 'Easy', 'Auto',
  'Super', 'Mega', 'Ultra', 'Hyper', 'Turbo', 'Prime', 'Cloud', 'Net', 'Web', 'App',
  'Pet', 'Food', 'Health', 'Edu', 'Learn', 'Study', 'Game', 'Play', 'Fun', 'Happy',
  'Green', 'Eco', 'Clean', 'Fresh', 'Pure', 'Safe', 'Fast', 'Quick', 'Speed', 'Rapid',
];

const NOUNS = [
  'Shop', 'Store', 'Mart', 'Giới', 'Hàng', 'Cửa', 'Siêu', 'Nhanh', 'Mới', 'Pro',
  'Mini', 'Max', 'Plus', 'Go', 'Up', 'In', 'Live', 'Smart', 'Easy', 'Auto',
  'Super', 'Mega', 'Ultra', 'Hyper', 'Turbo', 'Prime', 'Cloud', 'Net', 'Web', 'App',
  'Pet', 'Food', 'Health', 'Edu', 'Learn', 'Study', 'Game', 'Play', 'Fun', 'Happy',
  'Green', 'Eco', 'Clean', 'Fresh', 'Pure', 'Safe', 'Fast', 'Quick', 'Speed', 'Rapid',
];

const TASK_TEMPLATES = [
  { title: 'Phân tích yêu cầu và viết SPEC', priority: 'HIGH', status: 'DONE' },
  { title: 'Thiết kế database schema', priority: 'HIGH', status: 'DONE' },
  { title: 'Thiết kế UI/UX wireframe', priority: 'HIGH', status: 'DONE' },
  { title: 'Setup môi trường development', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Implement authentication system', priority: 'HIGH', status: 'DONE' },
  { title: 'Build REST API cho module chính', priority: 'HIGH', status: 'DONE' },
  { title: 'Tạo component library chuẩn', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Implement responsive layout', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Viết unit test cho core modules', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Setup CI/CD pipeline', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Design logo và brand identity', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Tạo landing page', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Implement search và filter', priority: 'HIGH', status: 'IN_PROGRESS' },
  { title: 'Build notification system', priority: 'MEDIUM', status: 'IN_PROGRESS' },
  { title: 'Implement real-time chat', priority: 'HIGH', status: 'IN_PROGRESS' },
  { title: 'Tối ưu performance và SEO', priority: 'MEDIUM', status: 'IN_PROGRESS' },
  { title: 'Implement payment integration', priority: 'HIGH', status: 'IN_PROGRESS' },
  { title: 'Build admin dashboard', priority: 'MEDIUM', status: 'IN_PROGRESS' },
  { title: 'Write API documentation', priority: 'LOW', status: 'IN_PROGRESS' },
  { title: 'Implement email automation', priority: 'MEDIUM', status: 'IN_PROGRESS' },
  { title: 'Build reporting module', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Implement file upload system', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Build analytics dashboard', priority: 'LOW', status: 'BACKLOG' },
  { title: 'Implement social login (Google/Facebook)', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Mobile app — màn hình đăng nhập', priority: 'HIGH', status: 'BACKLOG' },
  { title: 'Mobile app — màn hình chính', priority: 'HIGH', status: 'BACKLOG' },
  { title: 'Mobile app — notification center', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Setup staging server', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Security audit và penetration testing', priority: 'HIGH', status: 'BACKLOG' },
  { title: 'Performance testing với kaggle load', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Lập kế hoạch marketing đa kênh', priority: 'HIGH', status: 'DONE' },
  { title: 'Thiết kế content calendar', priority: 'MEDIUM', status: 'DONE' },
  { title: 'Chạy chiến dịch quảng cáo Facebook Ads', priority: 'HIGH', status: 'IN_PROGRESS' },
  { title: 'Tối ưu Google Ads campaign', priority: 'MEDIUM', status: 'IN_PROGRESS' },
  { title: 'SEO on-page và off-page', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Influencer marketing outreach', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Thiết kế email marketing template', priority: 'LOW', status: 'BACKLOG' },
  { title: 'A/B testing landing page', priority: 'MEDIUM', status: 'BACKLOG' },
  { title: 'Viết bài blog SEO 2000+ từ', priority: 'LOW', status: 'BACKLOG' },
  { title: 'Thiết kế banner quảng cáo', priority: 'MEDIUM', status: 'BACKLOG' },
];

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ON_HOLD'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

// ── HELPERS ─────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function randDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function makeFullName() {
  const firstName = pick(FIRST_NAMES);
  const middleName = pick(MIDDLE_NAMES);
  const lastName = pick(LAST_NAMES);
  return `${firstName} ${middleName} ${lastName}`;
}

function makeEmail(fullName) {
  const parts = fullName.split(' ');
  const firstLetter = parts[0][0].toLowerCase();
  const middleLetter = parts.length > 2 ? parts[1][0].toLowerCase() : parts[parts.length - 1][0].toLowerCase();
  const lastLetter = parts[parts.length - 1][0].toLowerCase();
  const number = String(rand(4, 8)).padStart(2, '0');
  return `${firstLetter}${middleLetter}${lastLetter}${number}@gmail.com`;
}

function makeUsername(fullName) {
  const parts = fullName.split(' ');
  const first = parts[0].toLowerCase();
  const nickname = pick(NICKNAMES);
  const number = rand(0, 99);
  return `${first}${nickname}${number}`;
}

function fillProjectTemplate(template) {
  const adj = pick(ADJECTIVES);
  const noun = pick(NOUNS);
  const name = template.name.replace('{adj}', adj).replace('{noun}', noun);
  const subject = pick(SUBJECTS);
  const status = pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
  const progress = status === 'COMPLETED' ? 100 : rand(0, 80);
  const deadline = status === 'ARCHIVED' ? null : new Date(Date.now() + rand(7, 90) * 86400000);
  return {
    name,
    description: template.desc,
    subject,
    status,
    progress,
    deadline,
  };
}

function pickTasks(project, creatorId, count) {
  const shuffled = [...TASK_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, TASK_TEMPLATES.length));

  return selected.map((t) => {
    const statusRoll = Math.random();
    let status;
    if (t.status === 'DONE') {
      status = Math.random() < 0.8 ? 'DONE' : pick(['REVIEW', 'ON_HOLD']);
    } else if (t.status === 'IN_PROGRESS') {
      status = Math.random() < 0.7 ? 'IN_PROGRESS' : pick(['REVIEW', 'BACKLOG']);
    } else {
      status = t.status;
    }
    return {
      title: t.title,
      description: `Chi tiết: ${t.title}. Cần hoàn thành đúng deadline.`,
      status,
      priority: t.priority,
      creatorId,
      assigneeId: Math.random() < 0.7 ? creatorId : null,
      deadline: new Date(Date.now() + rand(1, 30) * 86400000),
    };
  });
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('\n========================================');
    console.log('  EZProject — Seed Fake Users (100)');
    console.log('========================================\n');

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ezproject');
    console.log('[MongoDB] Connected');

    // Date range: June 3, 2026 → July 1, 2026
    const startDate = new Date(2026, 5, 3);  // June 3
    const endDate   = new Date(2026, 6, 1);  // July 1
    const totalDays = Math.ceil((endDate - startDate) / 86400000); // 29 days

    // ── Fixed distribution: exact 100 users across 29 days ─────────────────────
    // Jun 3→25: exponential growth | Jun 26→28: reduced | Jun 29→Jul 1: boosted
    const expWeights = Array.from({ length: 26 }, (_, i) => Math.exp(i * 0.10));
    const expSum = expWeights.reduce((s, w) => s + w, 0);
    const rawPerDay = expWeights.map((w) => Math.max(1, Math.round((100 * w) / expSum)));

    const dayCounts = new Array(29).fill(0);
    for (let i = 0; i < 26; i++) {
      dayCounts[i] = rawPerDay[i];
    }
    // Jun 26-28: reduced
    dayCounts[23] = 3;   // Jun 26
    dayCounts[24] = 4;   // Jun 27
    dayCounts[25] = 4;   // Jun 28
    // Jun 29 → Jul 1: boosted
    dayCounts[26] = 9;   // Jun 29
    dayCounts[27] = 10;  // Jun 30
    dayCounts[28] = 11;  // Jul 1

    // Distribute 10 remaining users across mid-early days (Jun 15-20)
    for (let i = 0; i < 5; i++) {
      dayCounts[12 + i] += 2;
    }

    console.log('[Seed] Fetching 100 existing CUSTOMER users...');
    const existingUsers = await User.find({ role: 'CUSTOMER' }).limit(100).lean();
    if (existingUsers.length < 100) {
      console.error(`[Seed] ERROR: Only ${existingUsers.length} CUSTOMER users found. Run seedFakeUsers.js first.`);
      process.exit(1);
    }
    console.log(`[Seed] Found ${existingUsers.length} users — reassigning createdAt with growth curve`);

    // Assign createdAt based on growth curve
    const updates = [];
    let userIdx = 0;
    for (let day = 0; day < totalDays; day++) {
      const count = dayCounts[day];
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + day);
      dayStart.setHours(0, 0, 0, 0);

      for (let i = 0; i < count && userIdx < existingUsers.length; i++) {
        const user = existingUsers[userIdx++];
        const offset = Math.random() * 86400000;
        const createdAt = new Date(dayStart.getTime() + offset);

        updates.push({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                createdAt,
                updatedAt: createdAt,
              },
            },
          },
        });
      }
    }

    console.log('[Seed] Bulk updating user timestamps...');
    await User.bulkWrite(updates);
    console.log(`[Seed] ✓ Updated ${updates.length} user timestamps`);

    // ── Rebuild projects + tasks for each user ───────────────────────────────
    console.log('[Seed] Clearing old projects and tasks...');
    await Promise.all([Project.deleteMany({}), Task.deleteMany({})]);

    console.log('[Seed] Generating projects and tasks...');
    let totalProjects = 0;
    let totalTasks = 0;

    const allUsers = await User.find({ role: 'CUSTOMER' }).sort({ createdAt: 1 });
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      const projectCount = rand(1, 2);

      for (let j = 0; j < projectCount; j++) {
        const template = pick(PROJECT_TEMPLATES);
        const projectData = fillProjectTemplate(template);

        const project = await Project.create({
          ...projectData,
          ownerId: user._id,
          createdAt: user.createdAt,
          updatedAt: user.createdAt,
          members: [{ userId: user._id, role: 'LEADER', isOwner: true, joinedAt: user.createdAt }],
        });

        totalProjects++;

        const taskCount = rand(10, 30);
        const tasks = pickTasks(project, user._id, taskCount).map((t) => ({
          ...t,
          projectId: project._id,
          createdAt: user.createdAt,
          updatedAt: user.createdAt,
        }));

        if (tasks.length > 0) {
          await Task.insertMany(tasks);
          totalTasks += tasks.length;
        }
      }

      if ((i + 1) % 20 === 0) console.log(`  ... ${i + 1}/100 users processed`);
    }

    console.log(`\n[Seed] ✓ Created ${totalProjects} projects`);
    console.log(`[Seed] ✓ Created ${totalTasks} tasks`);

    // Print per-day summary
    console.log('\n[Seed] Daily user distribution:');
    const header = new Date(startDate);
    for (let d = 0; d < totalDays; d++) {
      const dt = new Date(header);
      dt.setDate(dt.getDate() + d);
      const label = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
      const bar = '█'.repeat(dayCounts[d] / 2);
      console.log(`  ${label} (${dayCounts[d].toString().padStart(3)} users) ${bar}`);
    }

    console.log('\n========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`  Users    : ${allUsers.length}`);
    console.log(`  Projects : ${totalProjects}`);
    console.log(`  Tasks    : ${totalTasks}`);
    console.log(`  Password : 123456 (all accounts)`);
    console.log('\n========================================\n');
  } catch (err) {
    console.error('[Seed] Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
