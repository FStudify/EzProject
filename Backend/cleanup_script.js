const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject')
  .then(async () => {
    const db = mongoose.connection.db;

    // The projects we want to KEEP
    const keepProjectIds = [
      '6a44c7e8318ef558b4a11011',
      '6a44c7e8318ef558b4a11026',
      '6a44ccd2098654a645b7fd09',
      '6a451077db9c096f5c821c73'
    ];
    const keepProjectIdsObj = keepProjectIds.map(id => new mongoose.Types.ObjectId(id));

    // Gather all members from these 4 projects
    const keptProjects = await db.collection('projects').find({
      $or: [
        { _id: { $in: keepProjectIdsObj } },
        { _id: { $in: keepProjectIds } }
      ]
    }).toArray();

    // Start with admin + customer ID
    const keepUserIdsSet = new Set(['6a40ea319f1906fb678b7925', '6a41ecfdba2491bec8005aca']);
    
    for (const p of keptProjects) {
      if (p.ownerId) keepUserIdsSet.add(p.ownerId.toString());
      if (p.members) {
        for (const m of p.members) {
          if (m.userId) keepUserIdsSet.add(m.userId.toString());
        }
      }
    }

    const keepUserIds = Array.from(keepUserIdsSet);
    const keepUserIdsObj = keepUserIds.map(id => new mongoose.Types.ObjectId(id));

    console.log(`Bắt đầu xoá dữ liệu rác. Sẽ giữ lại ${keepProjectIds.length} projects và ${keepUserIds.length} users.`);

    // 1. DELETE USERS
    const delUsers = await db.collection('users').deleteMany({
      $and: [
        { _id: { $nin: keepUserIdsObj } },
        { _id: { $nin: keepUserIds } }
      ]
    });
    console.log(`- Đã xóa ${delUsers.deletedCount} Users.`);

    // 2. DELETE PROJECTS
    const delProjects = await db.collection('projects').deleteMany({
      $and: [
        { _id: { $nin: keepProjectIdsObj } },
        { _id: { $nin: keepProjectIds } }
      ]
    });
    console.log(`- Đã xóa ${delProjects.deletedCount} Projects.`);

    // 3. DELETE TASKS
    const delTasks = await db.collection('tasks').deleteMany({
      $and: [
        { projectId: { $nin: keepProjectIdsObj } },
        { projectId: { $nin: keepProjectIds } }
      ]
    });
    console.log(`- Đã xóa ${delTasks.deletedCount} Tasks.`);

    // 4. DELETE OTHER PROJECT-RELATED RESOURCES
    const collectionsWithProjectId = ['activities', 'documents', 'meetings', 'chatrooms', 'invitations'];
    for (const col of collectionsWithProjectId) {
      try {
        const del = await db.collection(col).deleteMany({
          $and: [
            { projectId: { $nin: keepProjectIdsObj } },
            { projectId: { $nin: keepProjectIds } }
          ]
        });
        console.log(`- Đã xóa ${del.deletedCount} ${col}.`);
      } catch (err) {
        // ignore if collection doesn't exist
      }
    }

    // Delete chatmessages if their roomId was deleted (or just clear all chatmessages since chatrooms are cleaned)
    // Actually simpler: find remaining chatrooms and keep only their messages
    const remainingRooms = await db.collection('chatrooms').find({}).toArray();
    const remainingRoomIds = remainingRooms.map(r => r._id.toString());
    const remainingRoomIdsObj = remainingRoomIds.map(id => new mongoose.Types.ObjectId(id));
    
    const delChatMsgs = await db.collection('chatmessages').deleteMany({
      $and: [
        { roomId: { $nin: remainingRoomIdsObj } },
        { roomId: { $nin: remainingRoomIds } }
      ]
    });
    console.log(`- Đã xóa ${delChatMsgs.deletedCount} chatmessages.`);

    // 5. DELETE OTHER USER-RELATED RESOURCES
    const collectionsWithUserId = ['payments', 'subscriptions', 'refreshtokens', 'notifications'];
    for (const col of collectionsWithUserId) {
      try {
        const del = await db.collection(col).deleteMany({
          $and: [
            { userId: { $nin: keepUserIdsObj } },
            { userId: { $nin: keepUserIds } }
          ]
        });
        console.log(`- Đã xóa ${del.deletedCount} ${col}.`);
      } catch (err) {
        // ignore if collection doesn't exist
      }
    }

    console.log('\n--- KẾT THÚC DỌN DẸP ---');
    process.exit(0);
  });
