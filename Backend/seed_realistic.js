const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const dem = ["Thị", "Văn", "Hữu", "Minh", "Ngọc", "Thanh", "Gia", "Thành", "Đức", "Xuân", "Hải", "Tuấn", "Hoàng", "Nhật", "Quang"];
const ten = ["An", "Anh", "Bình", "Châu", "Chi", "Cường", "Dũng", "Dương", "Đạt", "Đức", "Giang", "Hà", "Hải", "Hân", "Hòa", "Hoàng", "Hùng", "Huy", "Huyền", "Khang", "Khánh", "Khoa", "Kiên", "Lâm", "Lan", "Linh", "Long", "Ly", "Mai", "Minh", "Nam", "Nga", "Ngọc", "Nhi", "Nhung", "Phúc", "Phát", "Phượng", "Quân", "Quang", "Quyên", "Quỳnh", "Sơn", "Tài", "Tâm", "Thắng", "Thanh", "Thảo", "Thi", "Thịnh", "Thu", "Thư", "Thủy", "Tiên", "Toàn", "Trang", "Trí", "Trinh", "Trung", "Tuấn", "Tú", "Uyên", "Vân", "Việt", "Vinh", "Vy", "Xuân", "Yến"];

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function getVNName() {
  const h = faker.helpers.arrayElement(ho);
  const d = faker.helpers.arrayElement(dem);
  const t = faker.helpers.arrayElement(ten);
  return `${h} ${d} ${t}`;
}

async function runSeed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  // Protect real users
  const keepUserEmails = [
    'ezprojectadmin@gmail.com',
    'ezproject.work43@gmail.com',
    'hoangvokhanh.it@gmail.com',
    'huyentran1234.dn@gmail.com',
    'managehosphoto1@gmail.com',
    'thanhnqde180883@fpt.edu.vn'
  ];
  const keepUsers = await db.collection('users').find({ email: { $in: keepUserEmails } }).toArray();
  const keepUserIds = keepUsers.map(u => u._id);

  console.log('Wiping old seed data...');
  await db.collection('users').deleteMany({ _id: { $nin: keepUserIds } });
  
  // Wipe other collections unconditionally (except projects owned by kept users)
  const keepProjects = await db.collection('projects').find({ ownerId: { $in: keepUserIds.map(id => id.toString()) } }).toArray();
  const keepProjectIds = keepProjects.map(p => p._id);
  const keepProjectIdsStr = keepProjectIds.map(id => id.toString());

  await db.collection('projects').deleteMany({ _id: { $nin: keepProjectIds } });
  await db.collection('tasks').deleteMany({ projectId: { $nin: keepProjectIdsStr } });
  await db.collection('activities').deleteMany({ projectId: { $nin: keepProjectIdsStr } });
  await db.collection('documents').deleteMany({ projectId: { $nin: keepProjectIdsStr } });
  await db.collection('meetings').deleteMany({ projectId: { $nin: keepProjectIdsStr } });
  await db.collection('payments').deleteMany({ userId: { $nin: keepUserIds } });
  await db.collection('subscriptions').deleteMany({ userId: { $nin: keepUserIds } });

  console.log('Fetching plans...');
  const plans = await db.collection('plans').find({}).toArray();
  const planPro = plans.find(p => p.key === 'pro');
  const planUltra = plans.find(p => p.key === 'ultra');
  if (!planPro || !planUltra) {
    console.error("Missing PRO or ULTRA plans in DB!");
    process.exit(1);
  }

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // ==========================================
  // 1. GENERATE USERS
  // ==========================================
  console.log('Generating Users...');
  const usersToInsert = [];
  let dayIndex = 0;
  for (let d = new Date('2026-06-10'); d <= new Date('2026-07-15'); d.setDate(d.getDate() + 1)) {
    let count = 0;
    const dateStr = d.toISOString().split('T')[0];
    
    if (dateStr === '2026-07-14') count = 35;
    else if (dateStr === '2026-07-15') count = faker.number.int({ min: 10, max: 15 });
    else {
      let base = 7 + Math.sin(dayIndex * 0.5) * 4;
      count = Math.floor(base) + faker.number.int({min: -3, max: 4});
      if (count < 2) count = 2;
    }
    
    for (let i = 0; i < count; i++) {
      const isVN = Math.random() < 0.7;
      const fullName = isVN ? getVNName() : faker.person.fullName();
      const noAccent = removeAccents(fullName).toLowerCase().replace(/ /g, '');
      const username = noAccent + faker.number.int({ min: 1, max: 9999 }).toString();
      const domain = faker.helpers.arrayElement(['gmail.com', 'fpt.edu.vn', 'yahoo.com', 'outlook.com', 'dev.vn']);
      const email = `${noAccent}${faker.number.int({ min: 1, max: 99 })}@${domain}`;
      
      // Random hour during that day
      const createdAt = new Date(d);
      createdAt.setHours(faker.number.int({min: 0, max: 23}), faker.number.int({min: 0, max: 59}), faker.number.int({min: 0, max: 59}));

      usersToInsert.push({
        _id: new mongoose.Types.ObjectId(),
        email,
        username,
        passwordHash: defaultPasswordHash,
        fullName,
        role: 'CUSTOMER',
        avatar: `https://api.dicebear.com/8.x/notionists/svg?seed=${username}`,
        language: 'VI',
        theme: 'LIGHT',
        createdAt,
        updatedAt: createdAt,
        __v: 0
      });
    }
    dayIndex++;
  }

  await db.collection('users').insertMany(usersToInsert);
  console.log(`Inserted ${usersToInsert.length} users.`);

  // ==========================================
  // 2. GENERATE SUBSCRIPTIONS & PAYMENTS
  // ==========================================
  console.log('Generating Subscriptions & Payments...');
  const paidUsers = faker.helpers.shuffle([...usersToInsert]).slice(0, 80);
  const subsToInsert = [];
  const paysToInsert = [];

  let proCount = 0;
  let ultraCount = 0;
  
  // Sub dates: 15 on 14/07, 7 on 15/07, rest spread 20/06 - 13/07
  const subDates = [];
  for(let i=0; i<15; i++) subDates.push(new Date('2026-07-14T10:00:00Z'));
  for(let i=0; i<7; i++) subDates.push(new Date('2026-07-15T10:00:00Z'));
  for(let i=0; i<58; i++) {
    const d = new Date('2026-06-20');
    d.setDate(d.getDate() + faker.number.int({min: 0, max: 23}));
    subDates.push(d);
  }
  
  for (let i = 0; i < 80; i++) {
    const user = paidUsers[i];
    let plan = proCount < 69 ? planPro : planUltra;
    if (proCount < 69) proCount++; else ultraCount++;
    
    let startedAt = subDates[i];
    // Ensure startedAt is after user.createdAt
    if (startedAt < user.createdAt) {
      startedAt = new Date(user.createdAt);
      startedAt.setHours(startedAt.getHours() + 2);
    }
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    subsToInsert.push({
      _id: new mongoose.Types.ObjectId(),
      userId: user._id,
      planId: plan._id,
      planKey: plan.key,
      status: 'ACTIVE',
      startedAt,
      expiresAt,
      createdAt: startedAt,
      updatedAt: startedAt,
      __v: 0
    });

    paysToInsert.push({
      _id: new mongoose.Types.ObjectId(),
      orderCode: faker.string.numeric(8),
      userId: user._id,
      planId: plan._id,
      planKey: plan.key,
      amount: plan.priceVnd,
      currency: plan.currency,
      status: 'PAID',
      paidAt: startedAt,
      createdAt: startedAt,
      updatedAt: startedAt,
      __v: 0
    });
  }
  
  await db.collection('subscriptions').insertMany(subsToInsert);
  await db.collection('payments').insertMany(paysToInsert);
  console.log(`Inserted 80 subscriptions and payments.`);

  // ==========================================
  // 3. GENERATE PROJECTS
  // ==========================================
  console.log('Generating Projects...');
  const projTypes = ["Platform", "Management", "Learning", "AI", "Thesis", "Project", "ERP", "App", "System"];
  const adjs = ["Smart", "Global", "NextGen", "Automated", "Digital", "Cloud", "Green", "Ez", "Pro", "Ultra"];
  const projectsToInsert = [];
  
  for (const user of usersToInsert) {
    const numProj = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numProj; i++) {
      const name = `${faker.helpers.arrayElement(adjs)} ${faker.helpers.arrayElement(projTypes)} ${faker.word.noun()}`;
      
      let pCreatedAt = new Date(user.createdAt);
      pCreatedAt.setDate(pCreatedAt.getDate() + faker.number.int({min: 0, max: 5}));
      if (pCreatedAt > new Date('2026-07-15')) pCreatedAt = new Date('2026-07-15');

      projectsToInsert.push({
        _id: new mongoose.Types.ObjectId(),
        name,
        description: faker.lorem.sentence(),
        subject: faker.hacker.noun(),
        status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED']),
        progress: faker.number.int({min: 0, max: 100}),
        ownerId: user._id.toString(),
        members: [{
          userId: user._id.toString(),
          role: 'LEADER',
          isOwner: true,
          joinedAt: pCreatedAt
        }],
        createdAt: pCreatedAt,
        updatedAt: pCreatedAt,
        __v: 0
      });
    }
  }
  await db.collection('projects').insertMany(projectsToInsert);
  console.log(`Inserted ${projectsToInsert.length} projects.`);

  // ==========================================
  // 4. GENERATE TASKS & ACTIVITIES
  // ==========================================
  console.log('Generating Tasks & Activities (this may take a bit)...');
  const batchSize = 5000;
  let tasksBuffer = [];
  let actsBuffer = [];
  let totalTasks = 0;

  for (const proj of projectsToInsert) {
    const numTasks = faker.number.int({ min: 20, max: 50 });
    for (let i = 0; i < numTasks; i++) {
      let tCreatedAt = new Date(proj.createdAt);
      tCreatedAt.setDate(tCreatedAt.getDate() + faker.number.int({min: 0, max: 10}));
      if (tCreatedAt > new Date('2026-07-15')) tCreatedAt = new Date('2026-07-15');

      let deadline = new Date(tCreatedAt);
      deadline.setDate(deadline.getDate() + faker.number.int({min: 1, max: 14}));

      const status = faker.helpers.weightedArrayElement([
        { weight: 20, value: 'BACKLOG' },
        { weight: 40, value: 'IN_PROGRESS' },
        { weight: 20, value: 'REVIEW' },
        { weight: 15, value: 'DONE' },
        { weight: 5, value: 'OVERDUE' } // assumingOVERDUE maps to a known status, or just keep it DONE
      ]);
      const finalStatus = status === 'OVERDUE' ? 'IN_PROGRESS' : status; // Keep strictly to schema enum

      const taskId = new mongoose.Types.ObjectId();
      tasksBuffer.push({
        _id: taskId,
        projectId: proj._id.toString(),
        title: faker.hacker.phrase(),
        description: faker.lorem.paragraph(),
        status: finalStatus,
        priority: faker.helpers.weightedArrayElement([{weight:20,value:'LOW'},{weight:50,value:'MEDIUM'},{weight:20,value:'HIGH'},{weight:10,value:'URGENT'}]),
        assigneeId: proj.ownerId,
        creatorId: proj.ownerId,
        deadline,
        createdAt: tCreatedAt,
        updatedAt: tCreatedAt,
        comments: [], // we skip deep comments to save time, or add 1-2 simple ones
        __v: 0
      });

      actsBuffer.push({
        _id: new mongoose.Types.ObjectId(),
        projectId: proj._id,
        userId: new mongoose.Types.ObjectId(proj.ownerId),
        action: 'CREATE_TASK',
        target: `Task: ${taskId.toString()}`,
        timestamp: tCreatedAt
      });

      totalTasks++;
      
      if (tasksBuffer.length >= batchSize) {
        await db.collection('tasks').insertMany(tasksBuffer);
        await db.collection('activities').insertMany(actsBuffer);
        tasksBuffer = [];
        actsBuffer = [];
      }
    }
    
    // Add project creation activity
    actsBuffer.push({
      _id: new mongoose.Types.ObjectId(),
      projectId: proj._id,
      userId: new mongoose.Types.ObjectId(proj.ownerId),
      action: 'CREATE_PROJECT',
      target: `Project: ${proj.name}`,
      timestamp: proj.createdAt
    });
  }

  if (tasksBuffer.length > 0) {
    await db.collection('tasks').insertMany(tasksBuffer);
    await db.collection('activities').insertMany(actsBuffer);
  }
  
  console.log(`Inserted ${totalTasks} tasks and activities.`);
  
  console.log('\n--- SEEDING COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runSeed().catch(console.error);
