const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');
const Meeting = require('./models/Meeting');

require('dotenv').config();

const meetingsData = [
  { dateStr: '2026-04-15', title: 'Lên kế hoạch cho sản phẩm', desc: 'Họp kick-off dự án. Bàn bạc thống nhất hướng đi, phân tích đối tượng người dùng mục tiêu và đưa ra timeline sơ bộ cho các giai đoạn của sản phẩm.' },
  { dateStr: '2026-04-20', title: 'Tổng hợp tính năng cần thiết cho sản phẩm', desc: 'Liệt kê và chốt danh sách các tính năng cốt lõi (MVP). Phân loại mức độ ưu tiên của từng tính năng và giao việc cho các thành viên phụ trách.' },
  { dateStr: '2026-05-08', title: 'Deploy và review các module lần 1', desc: 'Đánh giá tiến độ hoàn thành các module đầu tiên. Triển khai thử nghiệm (deploy) lên môi trường staging để test các luồng cơ bản.' },
  { dateStr: '2026-05-31', title: 'Review module lần 2 và chuẩn bị gặp mentor lần 1', desc: 'Tổng duyệt lại toàn bộ các tính năng đã code. Chuẩn bị tài liệu, slide báo cáo, và danh sách câu hỏi khó khăn để trình bày với mentor.' },
  { dateStr: '2026-06-02', title: 'Chuẩn bị checkpoint 1', desc: 'Họp chuẩn bị cho buổi bảo vệ Checkpoint 1. Phân công người thuyết trình, người demo sản phẩm và thống nhất nội dung báo cáo.' },
  { dateStr: '2026-06-05', title: 'Gặp mentor lần 1', fixedTime: '19:50', desc: 'Buổi làm việc trực tiếp với mentor. Trình bày tiến độ dự án, nhận feedback về kiến trúc hệ thống và luồng nghiệp vụ.' },
  { dateStr: '2026-06-06', title: 'Bổ sung các tính năng theo gợi ý của mentor và xây dựng kế hoạch marketing', desc: 'Thống nhất lại danh sách việc cần sửa theo góp ý của mentor. Bắt đầu phác thảo kế hoạch truyền thông, marketing để tiếp cận người dùng sớm.' },
  { dateStr: '2026-06-23', title: 'Chuẩn bị checkpoint 2', desc: 'Rà soát lại tiến độ dự án chuẩn bị cho Checkpoint 2. Tập duyệt demo sản phẩm, chuẩn bị tài liệu giải trình các tính năng mới.' },
  { dateStr: '2026-06-25', title: 'Báo cáo kết quả marketing lần 2 và chuẩn bị cuộc họp mentor lần 2', desc: 'Phân tích số liệu từ các chiến dịch marketing. Xem xét mức độ hiệu quả và lên danh sách các vấn đề cần hỏi mentor trong buổi gặp tới.' },
  { dateStr: '2026-07-01', title: 'Gặp mentor lần 2', fixedTime: '19:50', desc: 'Buổi làm việc lần 2 với mentor. Báo cáo kết quả sửa chữa từ lần trước, cập nhật tình hình marketing và xin ý kiến về chiến lược ra mắt.' },
  { dateStr: '2026-07-15', title: 'Tổng hợp doanh thu chuẩn bị báo cáo', desc: 'Kiểm tra báo cáo tài chính, tổng hợp doanh thu và các chi phí liên quan. Hoàn thiện số liệu để làm báo cáo cuối kỳ.' },
  { dateStr: '2026-07-20', title: 'Chuẩn bị checkpoin 3', desc: 'Họp chuẩn bị cho Checkpoint 3 (Bảo vệ cuối kỳ). Review lại toàn bộ tài liệu, slide, và kịch bản demo sản phẩm hoàn thiện.' },
  { dateStr: '2026-07-23', title: 'Lên kế hoạch ăn mừng hoàn thành môn', desc: 'Chốt kèo ăn mừng kết thúc môn học thành công. Bàn địa điểm, thời gian và chia sẻ cảm nghĩ sau chặng đường làm dự án.' }
];

async function seedMeetings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const project = await Project.findOne({ name: 'EZProject' });
    if (!project) throw new Error('Project EZProject not found');

    // Clean up wrongly inserted meetings from "Xây dựng Landing Page cho EZProject"
    const wrongProject = await Project.findOne({ name: 'Xây dựng Landing Page cho EZProject' });
    if (wrongProject) {
      await Meeting.deleteMany({ projectId: wrongProject._id, meetingLink: 'https://meet.google.com/xuw-yspj-heb' });
      await Meeting.deleteMany({ projectId: wrongProject._id, meetingLink: 'https://meet.google.com/abc-xyz-def' });
    }

    const emails = [
      'ezproject.work43@gmail.com',
      'baokhanh652210@gmail.com',
      'huyentran1234.dn@gmail.com',
      'managehosphoto1@gmail.com',
      'quangthanh0825@gmail.com'
    ];

    const users = await User.find({ email: { $in: emails } });
    const userIds = users.map(u => u._id);

    if (userIds.length !== emails.length) {
      console.log('Found users:', users.map(u => u.email));
      console.warn('Warning: Not all users were found');
    }

    const attendees = userIds.map(id => ({
      userId: id,
      willAttend: true,
      respondedAt: new Date()
    }));

    // Delete existing generated meetings for clean insert
    await Meeting.deleteMany({ projectId: project._id, meetingLink: 'https://meet.google.com/xuw-yspj-heb' });
    await Meeting.deleteMany({ projectId: project._id, meetingLink: 'https://meet.google.com/abc-xyz-def' });

    const newMeetings = [];
    for (const m of meetingsData) {
      const [year, month, day] = m.dateStr.split('-');
      let hour, minute;
      if (m.fixedTime) {
        [hour, minute] = m.fixedTime.split(':').map(Number);
      } else {
        // Random 60% 20:30, 40% 20:00
        const rand = Math.random();
        hour = 20;
        minute = rand < 0.6 ? 30 : 0;
      }
      
      const startTime = new Date(Number(year), Number(month) - 1, Number(day), hour, minute, 0);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

      let status = 'SCHEDULED';
      if (endTime < new Date()) {
        status = 'COMPLETED'; // If in the past, assume completed
      }

      newMeetings.push({
        projectId: project._id,
        title: m.title,
        description: m.desc,
        type: 'ONLINE',
        startTime,
        endTime,
        meetingLink: 'https://meet.google.com/xuw-yspj-heb',
        timezone: 'Asia/Ho_Chi_Minh',
        status: status,
        attendees: attendees,
        organizerId: userIds[0],
        createdBy: userIds[0] // assign owner
      });
    }

    await Meeting.insertMany(newMeetings);
    console.log(`Inserted ${newMeetings.length} meetings successfully!`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seedMeetings();
