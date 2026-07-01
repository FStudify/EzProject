'use strict';

/**
 * ============================================================
 * Seed Marketing Tasks — EZProject MVP
 * Run: node seed/seedMarketingTasks.js
 * ============================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');

const PROJECT_ID = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');
const OWNER_ID = new mongoose.Types.ObjectId('6a41ecfdba2491bec8005aca');

const ASSIGNEES = [
  new mongoose.Types.ObjectId('6a44d043098654a645b7ff1d'), // Trân Huyền
  new mongoose.Types.ObjectId('6a41ecfdba2491bec8005aca'), // Quốc Hiệu
];

const randAssignee = () => ASSIGNEES[Math.floor(Math.random() * ASSIGNEES.length)];

const MARKETING_TASKS = [
  {
    title: 'Build Marketing Strategy Q3/2026',
    description:
      'Xây dựng Marketing Plan tổng thể cho giai đoạn MVP, bao gồm Brand Positioning, Customer Journey, Content Strategy, KPI và kế hoạch triển khai trong 3 tháng tới.',
    hashtags: ['biz'],
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    deadlineDaysFromNow: 45,
  },
  {
    title: 'Develop Social Media Content Calendar',
    description:
      'Lập lịch đăng bài trên Facebook và TikTok trong 4 tuần, phân bổ theo từng Content Pillar (Pain Points, Storytelling, Productivity Tips, Community, Product Education) nhằm đảm bảo tính nhất quán và tần suất đăng tải.',
    hashtags: ['biz'],
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    deadlineDaysFromNow: 28,
  },
  {
    title: 'Produce AI Video Series - Student Pain Points',
    description:
      'Xây dựng kịch bản, storyboard và sản xuất chuỗi video AI về những vấn đề phổ biến của sinh viên khi làm việc nhóm (deadline, giao tiếp, quản lý tài liệu...) để tăng nhận diện thương hiệu và tạo sự đồng cảm.',
    hashtags: ['biz'],
    status: 'BACKLOG',
    priority: 'HIGH',
    deadlineDaysFromNow: 60,
  },
  {
    title: 'Launch Facebook Community Campaign',
    description:
      'Triển khai các hoạt động tăng tương tác trên Fanpage như đặt câu hỏi, khảo sát, mini discussion và seeding nhằm xây dựng cộng đồng sinh viên quan tâm đến học tập và làm việc nhóm hiệu quả.',
    hashtags: ['biz'],
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    deadlineDaysFromNow: 21,
  },
  {
    title: 'Collect & Analyze User Feedback',
    description:
      'Thu thập phản hồi từ những người dùng đầu tiên sau khi trải nghiệm EZProject, phân loại theo nhóm Pain Points, Bugs, Feature Requests và đề xuất cải tiến gửi sang Business Analyst và Team Tech.',
    hashtags: ['biz'],
    status: 'DONE',
    priority: 'HIGH',
    deadlineDaysFromNow: -7,
  },
  {
    title: 'Prepare Product Launch Campaign',
    description:
      'Chuẩn bị toàn bộ tài nguyên truyền thông cho giai đoạn ra mắt sản phẩm, bao gồm Landing Page, teaser, demo video, poster, social media assets và kế hoạch truyền thông đa kênh.',
    hashtags: ['biz'],
    status: 'BACKLOG',
    priority: 'HIGH',
    deadlineDaysFromNow: 75,
  },
  {
    title: 'Build Campus Ambassador Program',
    description:
      'Thiết kế chương trình tuyển chọn sinh viên đại diện tại các trường đại học nhằm lan tỏa thương hiệu EZProject thông qua hoạt động truyền thông, workshop và giới thiệu sản phẩm tới cộng đồng sinh viên.',
    hashtags: ['biz'],
    status: 'BACKLOG',
    priority: 'MEDIUM',
    deadlineDaysFromNow: 90,
  },
  {
    title: 'Organize Offline Workshop & Product Demo',
    description:
      'Lên kế hoạch tổ chức workshop tại Đại học FPT Đà Nẵng để giới thiệu sản phẩm, demo trực tiếp và thu thập phản hồi từ sinh viên, đồng thời tạo nguồn nội dung truyền thông cho các kênh social.',
    hashtags: ['biz'],
    status: 'BACKLOG',
    priority: 'MEDIUM',
    deadlineDaysFromNow: 56,
  },
  {
    title: 'Track Marketing Performance & KPI',
    description:
      'Theo dõi các chỉ số Marketing hàng tuần (Reach, Engagement, Followers, Website Clicks, Beta Sign-ups...) và lập báo cáo đánh giá hiệu quả chiến dịch để tối ưu hoạt động trong các tuần tiếp theo.',
    hashtags: ['biz'],
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    deadlineDaysFromNow: 14,
  },
  {
    title: 'Research Competitors & Market Trends',
    description:
      'Phân tích các đối thủ như Notion, ClickUp, Trello và các công cụ dành cho sinh viên để cập nhật xu hướng, tìm cơ hội khác biệt hóa sản phẩm và đề xuất ý tưởng nội dung mới.',
    hashtags: ['biz'],
    status: 'DONE',
    priority: 'HIGH',
    deadlineDaysFromNow: -14,
  },
];

async function main() {
  try {
    console.log('\n========================================');
    console.log('  EZProject — Seed Marketing Tasks');
    console.log('========================================\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MongoDB] Connected');

    // Verify project exists
    const project = await Project.findById(PROJECT_ID);
    if (!project) {
      console.error('[Error] Project not found:', PROJECT_ID);
      process.exit(1);
    }
    console.log('[Project] Found:', project.name);

    // Verify owner exists
    const owner = await User.findById(OWNER_ID);
    if (!owner) {
      console.error('[Error] Owner user not found:', OWNER_ID);
      process.exit(1);
    }
    console.log('[Owner] Found:', owner.fullName);

    // Clear existing marketing tasks in this project
    const deleted = await Task.deleteMany({ projectId: PROJECT_ID, hashtags: 'biz' });
    console.log(`[Seed] Cleared ${deleted.deletedCount} existing marketing tasks`);

    // Insert new tasks
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const tasksToInsert = MARKETING_TASKS.map((t) => ({
      projectId: PROJECT_ID,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      creatorId: OWNER_ID,
      assigneeId: randAssignee(),
      deadline: new Date(now + t.deadlineDaysFromNow * day),
      hashtags: t.hashtags,
      comments: [],
    }));

    const inserted = await Task.insertMany(tasksToInsert);
    console.log(`[Seed] Inserted ${inserted.length} marketing tasks\n`);

    inserted.forEach((task) => {
      console.log(`  - [${task.status}] ${task.title}`);
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
