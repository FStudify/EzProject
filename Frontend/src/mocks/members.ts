import type { Member } from '../types';

/** Người dùng hiện tại (map với demo login mem-1 / nhóm trưởng) */
export const CURRENT_MEMBER_ID = 'mem-1';

export const mockMembers: Member[] = [
  {
    id: 'mem-1',
    name: 'Nguyễn Minh Khoa',
    email: 'khoa@demo.com',
    avatar: 'https://ui-avatars.com/api/?name=Nguyen+Minh+Khoa&background=2563EB&color=fff',
    role: 'leader',
  },
  {
    id: 'mem-2',
    name: 'Trần Thị Linh',
    email: 'linh@demo.com',
    avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+Linh&background=6366F1&color=fff',
  },
  {
    id: 'mem-3',
    name: 'Lê Hoàng Huy',
    email: 'huy@demo.com',
    avatar: 'https://ui-avatars.com/api/?name=Le+Hoang+Huy&background=0EA5E9&color=fff',
  },
  {
    id: 'mem-4',
    name: 'Phạm Thảo Nguyên',
    email: 'nguyen@demo.com',
    avatar: 'https://ui-avatars.com/api/?name=Pham+Thao+Nguyen&background=16A34A&color=fff',
  },
  {
    id: 'mem-5',
    name: 'Vũ Minh Châu',
    email: 'chau@demo.com',
    avatar: 'https://ui-avatars.com/api/?name=Vu+Minh+Chau&background=D97706&color=fff',
  },
];
