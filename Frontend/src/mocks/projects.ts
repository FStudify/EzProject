import type { Project } from '../types';
import { mockMembers } from './members';
import { daysFromNow } from './helpers';

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Đồ án môn Lập trình Web',
    description:
      'Xây dựng ứng dụng quản lý sinh viên full-stack với React và Node.js',
    subject: 'Lập trình Web',
    status: 'ACTIVE',
    progress: 58,
    members: [
      { member: mockMembers[0], isOwner: true, role: 'LEADER' },
      { member: mockMembers[1], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[2], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[3], isOwner: false, role: 'MEMBER' },
    ],
    createdAt: '2025-09-05T00:00:00Z',
    deadline: daysFromNow(18),
    totalTasks: 15,
    completedTasks: 7,
  },
  {
    id: 'proj-2',
    name: 'Tiểu luận Triết học Mác-Lênin',
    description:
      'Phân tích mối quan hệ giữa vật chất và ý thức trong bối cảnh hiện đại',
    subject: 'Triết học Mác-Lênin',
    status: 'ACTIVE',
    progress: 42,
    members: [
      { member: mockMembers[0], isOwner: true, role: 'LEADER' },
      { member: mockMembers[1], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[4], isOwner: false, role: 'MEMBER' },
    ],
    createdAt: '2025-10-01T00:00:00Z',
    deadline: daysFromNow(5),
    totalTasks: 8,
    completedTasks: 3,
  },
  {
    id: 'proj-3',
    name: 'Bài tập nhóm Marketing',
    description:
      'Xây dựng chiến lược marketing cho sản phẩm nước uống đóng chai mới',
    subject: 'Marketing căn bản',
    status: 'ACTIVE',
    progress: 35,
    members: [
      { member: mockMembers[1], isOwner: true, role: 'LEADER' },
      { member: mockMembers[0], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[2], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[3], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[4], isOwner: false, role: 'MEMBER' },
    ],
    createdAt: '2025-10-10T00:00:00Z',
    deadline: daysFromNow(30),
    totalTasks: 12,
    completedTasks: 4,
  },
  {
    id: 'proj-4',
    name: 'Nghiên cứu Kinh tế vi mô',
    description:
      'Phân tích thị trường xe máy tại Việt Nam — cung cầu và điểm cân bằng',
    subject: 'Kinh tế vi mô',
    status: 'COMPLETED',
    progress: 100,
    members: [
      { member: mockMembers[0], isOwner: false, role: 'MEMBER' },
      { member: mockMembers[2], isOwner: true, role: 'LEADER' },
    ],
    createdAt: '2025-08-15T00:00:00Z',
    deadline: daysFromNow(-10),
    totalTasks: 10,
    completedTasks: 10,
  },
];
