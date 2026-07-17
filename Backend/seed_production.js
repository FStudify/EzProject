const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

// Names (Vietnamese only)
const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Trương", "Đoàn"];
const dem = ["Thị", "Văn", "Hữu", "Minh", "Ngọc", "Thanh", "Gia", "Thành", "Đức", "Xuân", "Hải", "Tuấn", "Hoàng", "Nhật", "Quang", "Phúc", "Diệu", "Khánh"];
const ten = ["An", "Anh", "Bình", "Châu", "Chi", "Cường", "Dũng", "Dương", "Đạt", "Đức", "Giang", "Hà", "Hải", "Hân", "Hòa", "Hoàng", "Hùng", "Huy", "Huyền", "Khang", "Khánh", "Khoa", "Kiên", "Lâm", "Lan", "Linh", "Long", "Ly", "Mai", "Minh", "Nam", "Nga", "Ngọc", "Nhi", "Nhung", "Phúc", "Phát", "Phượng", "Quân", "Quang", "Quyên", "Quỳnh", "Sơn", "Tài", "Tâm", "Thắng", "Thanh", "Thảo", "Thi", "Thịnh", "Thu", "Thư", "Thủy", "Tiên", "Toàn", "Trang", "Trí", "Trinh", "Trung", "Tuấn", "Tú", "Uyên", "Vân", "Việt", "Vinh", "Vy", "Xuân", "Yến", "Lực", "Bảo", "Tùng"];

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

  const keepProjectIds = [
    new mongoose.Types.ObjectId('6a44c7e8318ef558b4a11011'),
    new mongoose.Types.ObjectId('6a44c7e8318ef558b4a11026'),
    new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09'),
    new mongoose.Types.ObjectId('6a451077db9c096f5c821c73')
  ];

  const keepUserEmails = [
    'ezprojectadmin@gmail.com',
    'ezproject.work43@gmail.com',
    'hoangvokhanh.it@gmail.com',
    'huyentran1234.dn@gmail.com',
    'managehosphoto1@gmail.com',
    'thanhnqde180883@fpt.edu.vn'
  ];

  const keepUsers = await db.collection('users').find({ email: { $in: keepUserEmails } }).toArray();
  const keepUserIdsObj = keepUsers.map(u => u._id);

  console.log('Wiping old seed data...');
  await db.collection('users').deleteMany({ _id: { $nin: keepUserIdsObj } });
  await db.collection('projects').deleteMany({ _id: { $nin: keepProjectIds } });
  
  // Wipe all tasks, activities, etc that don't belong to the 4 projects
  await db.collection('tasks').deleteMany({ projectId: { $nin: keepProjectIds } });
  await db.collection('activities').deleteMany({ projectId: { $nin: keepProjectIds } });
  await db.collection('documents').deleteMany({ projectId: { $nin: keepProjectIds } });
  await db.collection('meetings').deleteMany({ projectId: { $nin: keepProjectIds } });
  await db.collection('payments').deleteMany({ userId: { $nin: keepUserIdsObj } });
  await db.collection('subscriptions').deleteMany({ userId: { $nin: keepUserIdsObj } });

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
  const distribution = [5,6,8,7,9,8,10,12,9,11,12,6,8,12,12,10,3,5,9,13,10,16,11,11,8,5,7,12,14,9,11,6,4,7,35,12]; // Total: 331
  const usersToInsert = [];
  
  let dayIndex = 0;
  for (let d = new Date('2026-06-10'); d <= new Date('2026-07-15'); d.setDate(d.getDate() + 1)) {
    const count = distribution[dayIndex];
    for (let i = 0; i < count; i++) {
      const fullName = getVNName();
      const parts = removeAccents(fullName).toLowerCase().split(' ');
      const baseUser = parts[parts.length - 1] + parts.slice(0, parts.length - 1).map(p => p.charAt(0)).join('');
      
      const username = baseUser + i + faker.number.int({ min: 1000, max: 9999 }).toString();
      const domainRand = Math.random();
      let domain = 'gmail.com';
      if (domainRand > 0.98) domain = faker.helpers.arrayElement(['gmail.dev', 'faker.edu.vn', 'startup.vn']);
      else if (domainRand > 0.95) domain = 'hotmail.com';
      else if (domainRand > 0.90) domain = 'outlook.com';
      else if (domainRand > 0.75) domain = 'fpt.edu.vn';
      
      const email = `${username}${i}${faker.number.int({min:1000, max:9999})}@${domain}`;
      
      const createdAt = new Date(d);
      createdAt.setHours(faker.number.int({min: 0, max: 23}), faker.number.int({min: 0, max: 59}));

      usersToInsert.push({
        _id: new mongoose.Types.ObjectId(),
        email,
        username,
        passwordHash: defaultPasswordHash,
        fullName,
        role: 'CUSTOMER',
        avatar: null, // NO AVATAR
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
  // 2. SUBSCRIPTIONS & PAYMENTS
  // ==========================================
  console.log('Generating Subscriptions & Payments...');
  const subsToInsert = [];
  const paysToInsert = [];
  
  let proCount = 0;
  let ultraCount = 0;
  
  // Payment dates logic
  // 80 payments. 15 on 14/07. 7 on 15/07. Rest distributed.
  const paymentDates = [];
  for(let i=0; i<15; i++) paymentDates.push(new Date('2026-07-14T10:00:00Z'));
  for(let i=0; i<7; i++) paymentDates.push(new Date('2026-07-15T10:00:00Z'));
  
  for(let i=0; i<58; i++) {
     let d = new Date('2026-06-20');
     d.setDate(d.getDate() + faker.number.int({min: 0, max: 23})); // up to 13/07
     d.setHours(faker.number.int({min: 0, max: 23}), faker.number.int({min: 0, max: 59}));
     paymentDates.push(d);
  }
  
  // We need to match each paymentDate to a user who created their account BEFORE that date.
  // We'll sort users by createdAt. Sort paymentDates by date.
  paymentDates.sort((a,b) => a - b);
  const eligibleUsers = [...usersToInsert].sort((a,b) => a.createdAt - b.createdAt);
  
  let userIdx = 0;
  for (let i = 0; i < 80; i++) {
    const payDate = paymentDates[i];
    // Find a user who registered before payDate + delay logic
    const possibleUsers = eligibleUsers.filter(u => u.createdAt <= payDate && !subsToInsert.some(s => s.userId === u._id));
    if (possibleUsers.length === 0) continue;
    
    // Pick user based on logic: 20% same day, etc... 
    // It's easier to just pick a random possible user since payDate is already distributed correctly.
    // To respect the delay logic perfectly, we should just assign the startedAt = user.createdAt + delay.
    // Wait, the prompt says: "Ngày 14/07/2026 là ngày bán nhiều nhất. Khoảng 15 người mua."
    // So the payDate is fixed! We just need to pick a user that satisfies the delay.
    let user;
    let delayDays;
    const r = Math.random();
    if (r < 0.20) delayDays = 0;
    else if (r < 0.60) delayDays = faker.number.int({min:1, max:3});
    else if (r < 0.90) delayDays = faker.number.int({min:4, max:7});
    else delayDays = faker.number.int({min:8, max:15});
    
    const targetRegDate = new Date(payDate);
    targetRegDate.setDate(targetRegDate.getDate() - delayDays);
    
    // Find closest user to targetRegDate
    const closestUser = possibleUsers.reduce((prev, curr) => 
       Math.abs(curr.createdAt - targetRegDate) < Math.abs(prev.createdAt - targetRegDate) ? curr : prev
    );
    user = closestUser;
    
    // Safety check
    let startedAt = new Date(payDate);
    if (startedAt <= user.createdAt) {
       startedAt = new Date(user.createdAt);
       startedAt.setHours(startedAt.getHours() + 1);
    }
    
    let plan = proCount < 69 ? planPro : planUltra;
    if (proCount < 69) proCount++; else ultraCount++;
    
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
  console.log(`Inserted ${subsToInsert.length} subscriptions and payments.`);

  // ==========================================
  // 3. PROJECTS & TASKS & ACTIVITIES
  // ==========================================
  console.log('Generating Projects & Tasks (Batch Insert)...');
  const projectNames = ["AI Debate Platform", "Smart Parking", "Hospital Management", "English Learning", "Graduation Thesis", "Startup ERP", "Research AI", "Capstone Project", "Task Manager", "Learning Platform", "E-Commerce Website", "Restaurant Management", "Clinic System", "Book Store", "Travel Planner", "CRM System", "HR Management", "Fintech Wallet", "Blockchain Voting"];
  
  const projectsToInsert = [];
  let tasksBuffer = [];
  let actsBuffer = [];
  let commentsBuffer = [];
  let totalTasks = 0;

  for (const user of usersToInsert) {
    if (Math.random() > 0.85) continue; // 15% users have no projects
    
    const numProj = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < numProj; i++) {
      const name = faker.helpers.arrayElement(projectNames) + (Math.random() < 0.3 ? ` ${faker.word.adjective()}` : '');
      
      let pCreatedAt = new Date(user.createdAt);
      pCreatedAt.setDate(pCreatedAt.getDate() + faker.number.int({min: 0, max: 3}));
      if (pCreatedAt > new Date('2026-07-15')) pCreatedAt = new Date('2026-07-15');

      const projId = new mongoose.Types.ObjectId();
      projectsToInsert.push({
        _id: projId,
        name,
        description: faker.lorem.sentence(),
        subject: faker.hacker.noun(),
        status: faker.helpers.weightedArrayElement([{weight:70,value:'ACTIVE'}, {weight:30,value:'COMPLETED'}]),
        progress: faker.number.int({min: 0, max: 100}),
        ownerId: user._id, // Store as ObjectId!
        members: [{
          userId: user._id, // Store as ObjectId!
          role: 'LEADER',
          isOwner: true,
          joinedAt: pCreatedAt
        }],
        createdAt: pCreatedAt,
        updatedAt: pCreatedAt,
        __v: 0
      });

      // Activities: Create Project
      actsBuffer.push({
        _id: new mongoose.Types.ObjectId(),
        projectId: projId,
        userId: user._id,
        action: 'CREATE_PROJECT',
        target: `Project: ${name}`,
        timestamp: pCreatedAt
      });

      // Tasks
      const numTasks = faker.number.int({ min: 20, max: 50 });
      for (let j = 0; j < numTasks; j++) {
        let tCreatedAt = new Date(pCreatedAt);
        tCreatedAt.setDate(tCreatedAt.getDate() + faker.number.int({min: 0, max: 10}));
        if (tCreatedAt > new Date('2026-07-15')) tCreatedAt = new Date('2026-07-15');

        let deadline = new Date(tCreatedAt);
        deadline.setDate(deadline.getDate() + faker.number.int({min: 2, max: 14}));

        const status = faker.helpers.weightedArrayElement([
          { weight: 25, value: 'BACKLOG' },
          { weight: 40, value: 'IN_PROGRESS' },
          { weight: 20, value: 'REVIEW' },
          { weight: 15, value: 'DONE' }
        ]);

        const taskId = new mongoose.Types.ObjectId();
        tasksBuffer.push({
          _id: taskId,
          projectId: projId, // Schema might want ObjectId, let's keep ObjectId
          title: faker.hacker.phrase(),
          description: faker.lorem.paragraph(),
          status,
          priority: faker.helpers.weightedArrayElement([{weight:20,value:'LOW'},{weight:50,value:'MEDIUM'},{weight:20,value:'HIGH'},{weight:10,value:'URGENT'}]),
          assigneeId: user._id,
          creatorId: user._id,
          deadline,
          createdAt: tCreatedAt,
          updatedAt: tCreatedAt,
          __v: 0
        });

        actsBuffer.push({
          _id: new mongoose.Types.ObjectId(),
          projectId: projId,
          userId: user._id,
          action: 'CREATE_TASK',
          target: `Task: ${taskId.toString()}`,
          timestamp: tCreatedAt
        });
        
        // Comments
        if (Math.random() < 0.4) {
           const numComments = faker.number.int({min: 2, max: 10});
           let taskComments = [];
           for(let c=0; c<numComments; c++) {
              let cCreatedAt = new Date(tCreatedAt);
              cCreatedAt.setHours(cCreatedAt.getHours() + c + 1);
              taskComments.push({
                 _id: new mongoose.Types.ObjectId(),
                 userId: user._id,
                 content: faker.lorem.sentence(),
                 createdAt: cCreatedAt
              });
              actsBuffer.push({
                _id: new mongoose.Types.ObjectId(),
                projectId: projId,
                userId: user._id,
                action: 'COMMENT_TASK',
                target: `Task: ${taskId.toString()}`,
                timestamp: cCreatedAt
              });
           }
           tasksBuffer[tasksBuffer.length - 1].comments = taskComments;
        }

        totalTasks++;
        
        if (tasksBuffer.length >= 5000) {
          await db.collection('tasks').insertMany(tasksBuffer);
          await db.collection('activities').insertMany(actsBuffer);
          tasksBuffer = [];
          actsBuffer = [];
        }
      }
    }
  }

  await db.collection('projects').insertMany(projectsToInsert);
  if (tasksBuffer.length > 0) {
    await db.collection('tasks').insertMany(tasksBuffer);
    await db.collection('activities').insertMany(actsBuffer);
  }
  
  console.log(`Inserted ${projectsToInsert.length} projects, ${totalTasks} tasks and activities.`);
  
  console.log('\n--- SEEDING COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runSeed().catch(console.error);
