const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

async function restore() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 1. Restore Users
  const usersToRestore = [
    {
      _id: new mongoose.Types.ObjectId('6a44c4bab6896738e7b06071'),
      email: 'hoangvokhanh.it@gmail.com',
      username: 'hoangvokhanh',
      fullName: 'Hoàng Võ Bảo Khánh',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      language: 'VI',
      theme: 'LIGHT',
      createdAt: new Date('2026-06-25T00:00:00Z'),
      updatedAt: new Date('2026-06-25T00:00:00Z'),
      __v: 0
    },
    {
      _id: new mongoose.Types.ObjectId('6a44d043098654a645b7ff1d'),
      email: 'huyentran1234.dn@gmail.com',
      username: 'huyentran',
      fullName: 'Trân Huyền',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      language: 'VI',
      theme: 'LIGHT',
      createdAt: new Date('2026-06-26T00:00:00Z'),
      updatedAt: new Date('2026-06-26T00:00:00Z'),
      __v: 0
    },
    {
      _id: new mongoose.Types.ObjectId('6a44c4a2b6896738e7b06034'),
      email: 'managehosphoto1@gmail.com',
      username: 'hosyhung',
      fullName: 'Ho Sy Hung (K18 DN)',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      language: 'VI',
      theme: 'LIGHT',
      createdAt: new Date('2026-06-27T00:00:00Z'),
      updatedAt: new Date('2026-06-27T00:00:00Z'),
      __v: 0
    },
    {
      _id: new mongoose.Types.ObjectId('6a450fdfdb9c096f5c821bdc'),
      email: 'thanhnqde180883@fpt.edu.vn',
      username: 'nguyenquangthanh',
      fullName: 'Nguyen Quang Thanh (K18 DN)',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      language: 'VI',
      theme: 'LIGHT',
      createdAt: new Date('2026-06-28T00:00:00Z'),
      updatedAt: new Date('2026-06-28T00:00:00Z'),
      __v: 0
    }
  ];

  for (const u of usersToRestore) {
    await db.collection('users').updateOne({ _id: u._id }, { $set: u }, { upsert: true });
  }

  // 2. Restore Projects
  const quocHieuId = '6a41ecfdba2491bec8005aca';
  const projectsToRestore = [
    {
      _id: new mongoose.Types.ObjectId('6a44c7e8318ef558b4a11011'),
      name: 'Hệ thống booking Food cho dịch vụ Rapid',
      description: 'Dự án booking',
      subject: 'Booking',
      status: 'ACTIVE',
      progress: 10,
      ownerId: quocHieuId,
      members: [
        {
          userId: quocHieuId,
          role: 'LEADER',
          isOwner: true,
          joinedAt: new Date('2026-07-01T00:00:00Z')
        }
      ],
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
      __v: 0
    },
    {
      _id: new mongoose.Types.ObjectId('6a44c7e8318ef558b4a11026'),
      name: 'Cổng thông tin Giới cho cộng đồng Auto',
      description: 'Cộng đồng Auto',
      subject: 'IT',
      status: 'ACTIVE',
      progress: 20,
      ownerId: quocHieuId,
      members: [
        {
          userId: quocHieuId,
          role: 'LEADER',
          isOwner: true,
          joinedAt: new Date('2026-07-01T00:00:00Z')
        }
      ],
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
      __v: 0
    },
    {
      _id: new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09'),
      name: 'EZProject',
      description: 'Dự án khởi nghiệp EZProject',
      subject: 'Trải nghiệm khởi nghiệp',
      status: 'ACTIVE',
      progress: 5,
      ownerId: quocHieuId,
      members: [
        {
          userId: quocHieuId,
          role: "LEADER",
          isOwner: true,
          joinedAt: new Date("2026-07-01T08:16:18.211Z")
        },
        {
          userId: "6a44c4bab6896738e7b06071",
          role: "VICE_LEADER",
          isOwner: false,
          joinedAt: new Date("2026-07-01T08:28:55.397Z")
        },
        {
          userId: "6a44d043098654a645b7ff1d",
          role: "MEMBER",
          isOwner: false,
          joinedAt: new Date("2026-07-01T08:41:39.419Z")
        },
        {
          userId: "6a44c4a2b6896738e7b06034",
          role: "MEMBER",
          isOwner: false,
          joinedAt: new Date("2026-07-04T06:31:18.296Z")
        },
        {
          userId: "6a450fdfdb9c096f5c821bdc",
          role: "MEMBER",
          isOwner: false,
          joinedAt: new Date("2026-07-04T07:11:09.579Z")
        }
      ],
      deadline: new Date("2026-07-22T00:00:00.000Z"),
      createdAt: new Date("2026-07-01T08:16:18.215Z"),
      updatedAt: new Date("2026-07-13T06:00:10.187Z"),
      __v: 4
    },
    {
      _id: new mongoose.Types.ObjectId('6a451077db9c096f5c821c73'),
      name: 'Xây dựng Landing Page cho EZProject',
      description: 'Landing Page',
      subject: 'Web',
      status: 'ACTIVE',
      progress: 50,
      ownerId: quocHieuId,
      members: [
        {
          userId: quocHieuId,
          role: 'LEADER',
          isOwner: true,
          joinedAt: new Date('2026-07-01T00:00:00Z')
        }
      ],
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
      __v: 0
    }
  ];

  for (const p of projectsToRestore) {
    await db.collection('projects').updateOne({ _id: p._id }, { $set: p }, { upsert: true });
  }

  console.log('Restored 4 users and 4 projects successfully!');
  process.exit(0);
}

restore();
