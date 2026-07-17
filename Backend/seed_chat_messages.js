require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');
const { ChatRoom, ChatMessage } = require('./models/Chat');

// ------------------------------------------------------------
// Configuration
// ------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ezproject';
const PROJECT_NAME = 'EZProject';

const START_DATE = new Date('2026-06-10'); // inclusive
const END_DATE = new Date('2026-07-15');   // inclusive

// Message count range per day (will be overridden for deadline‑heavy days)
const MIN_PER_DAY = 50;
const MAX_PER_DAY = 300;

// Days that should have a higher volume (example deadlines / demo dates)
const deadlineBoost = {
  // date string -> extra range increase
  '2026-07-05': { min: 180, max: 250 },
  '2026-07-10': { min: 220, max: 280 },
  '2026-07-13': { min: 260, max: 300 },
  '2026-07-14': { min: 300, max: 350 },
};

// Activity distribution (percent of total messages)
const activityLevels = {
  heavy: 0.15,   // very active
  medium: 0.25,  // fairly active
  normal: 0.40, // average
  low: 0.20,    // rarely
};

// Tags and emojis for casual messages
const TAGS = ['#IT', '#BIZ', '#UX', '#DEV', '#MEETING', '#REVIEW'];
const EMOJIS = ['😀','😂','👍','🔥','🚀','💡','🤔','🙌','😅','🤷‍♂️'];

// Work‑related sentence pool (≈60%)
const WORK_SENTENCES = [
  'Ê API xong chưa?',
  'Task Payment ai làm?',
  'Render chết rồi.',
  'Backend lỗi.',
  'Deploy đi.',
  'Merge giúp tao.',
  'Conflict rồi.',
  'Fix socket đi.',
  'Review PR giúp.',
  'Payment History lỗi.',
  'Meeting tối nhé.',
  'Mai demo.',
  'README update chưa?',
  'Thêm loading đi.',
  'Responsive hơi lỗi.',
  'Push code chưa?',
  'Admin Dashboard đẹp rồi.',
  'M fix AI Summary nhé.',
  'Task này assign ai?',
  'Bug còn tồn tại?',
  'Kiểm tra unit test.',
];

// Casual talk pool (≈40%)
const CASUAL_SENTENCES = [
  'ok', 'ừ', 'r', 'kk', 'haha', ':))', '=))', 'đợi', 'xíu', 'oke', 'được', 'đỉnh',
  'đi cf không?', 'ê ăn chưa?', 'Mai ngủ tiếp', 'vl', 'đúng', 'hihi', 'tối nay ăn gì?',
  'có ai free không?', 'bạn nghĩ sao?', 'đúng rồi', 'có cái cc',
];

// Share‑task sentence templates (≈5%)
const SHARE_TEMPLATES = [
  '{giver} vừa giao cho {assignee} task {task}',
  '{assignee} vừa hoàn thành task {task}',
  '{giver} chuyển task {task} sang Review',
  'Task {task} vừa quá hạn',
  'Task {task} đã assign cho {assignee}',
];

// Simple task names for share‑task messages
const TASK_TITLES = [
  'Fix Payment', 'Dashboard', 'Login', 'API Auth', 'Deploy Frontend', 'UI Refactor',
  'Meeting Summary', 'Mobile UI', 'Payment History', 'Admin Dashboard', 'AI Summary',
];

// Placeholder media URLs (≈5‑10% of messages)
const MEDIA_URLS = [
  'https://example.com/files/UI.png',
  'https://example.com/files/ERD.drawio',
  'https://example.com/files/meeting.docx',
  'https://example.com/files/Demo.mp4',
  'https://example.com/files/specs.pdf',
];

// Helper: random integer inclusive
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: pick random element
function randItem(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// Helper: generate a random timestamp within a given day (no exact collisions)
function randomTimestamp(baseDate, existingSet) {
  // generate hour minute second ms
  const hour = randInt(0, 23);
  const minute = randInt(0, 59);
  const second = randInt(0, 59);
  const ms = randInt(0, 999);
  const ts = new Date(baseDate);
  ts.setHours(hour, minute, second, ms);
  const iso = ts.toISOString();
  // simple collision handling – if exists, add 1 ms until unique
  while (existingSet.has(iso)) {
    ts.setMilliseconds(ts.getMilliseconds() + 1);
    iso = ts.toISOString();
  }
  existingSet.add(iso);
  return ts;
}

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // 1️⃣ Load project, users, general chatroom
  const project = await Project.findOne({ name: PROJECT_NAME });
  if (!project) throw new Error('Project not found');

  const users = await User.find({});
  if (users.length === 0) throw new Error('No users found in the project');

  const generalRoom = await ChatRoom.findOne({ projectId: project._id, type: 'GENERAL' });
  if (!generalRoom) throw new Error('General chatroom not found (do not create a new one)');

  // 2️⃣ Wipe old messages for that room
  const del = await ChatMessage.deleteMany({ roomId: generalRoom._id });
  console.log(`🧹 Deleted ${del.deletedCount} old messages from GENERAL room`);

  // 3️⃣ Prepare activity weights for each user
  // Shuffle users then assign based on percentages (rounded)
  const shuffled = users.slice().sort(() => Math.random() - 0.5);
  const totalUsers = shuffled.length;
  const counts = {
    heavy: Math.round(totalUsers * activityLevels.heavy),
    medium: Math.round(totalUsers * activityLevels.medium),
    normal: Math.round(totalUsers * activityLevels.normal),
    low: Math.round(totalUsers * activityLevels.low),
  };
  // Adjust to match totalUsers
  const sumCounts = counts.heavy + counts.medium + counts.normal + counts.low;
  if (sumCounts !== totalUsers) {
    const diff = totalUsers - sumCounts;
    counts.low += diff; // adjust low tier
  }

  const activityMap = new Map(); // userId -> weight
  let idx = 0;
  shuffled.forEach(u => {
    let tier;
    if (idx < counts.heavy) tier = 'heavy';
    else if (idx < counts.heavy + counts.medium) tier = 'medium';
    else if (idx < counts.heavy + counts.medium + counts.normal) tier = 'normal';
    else tier = 'low';
    idx++;
    // assign weight multiplier (higher weight = more messages)
    const weight = tier === 'heavy' ? 4 : tier === 'medium' ? 2.5 : tier === 'normal' ? 1.2 : 0.5;
    activityMap.set(u._id.toString(), { user: u, weight });
  });

  // Helper to pick a user respecting weights
  const userPool = [];
  activityMap.forEach(({ user, weight }) => {
    const entries = Math.round(weight * 10); // scale factor
    for (let i = 0; i < entries; i++) userPool.push(user);
  });

  function pickRandomUser() {
    return randItem(userPool);
  }

  // 4️⃣ Generate messages per day
  let totalCreated = 0;
  const dailyStats = {};
  for (let d = new Date(START_DATE); d <= END_DATE; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().slice(0, 10);
    // Determine count for the day (apply boost if any)
    const boost = deadlineBoost[dayStr] || {};
    const dayMin = boost.min || MIN_PER_DAY;
    const dayMax = boost.max || MAX_PER_DAY;
    const countToday = randInt(dayMin, dayMax);
    dailyStats[dayStr] = countToday;

    const messages = [];
    const timestampsSet = new Set(); // ensure unique createdAt
    const idsForReplies = []; // store created message ids for reply linking

    for (let i = 0; i < countToday; i++) {
      const sender = pickRandomUser();
      const isWork = Math.random() < 0.6; // 60% work, 40% casual

      let content = '';
      // Decide if this message is a share‑task, mention, media, reply, etc.
      const rand = Math.random();
      if (rand < 0.05) { // share‑task ~5%
        const template = randItem(SHARE_TEMPLATES);
        const giver = randItem(users).firstName || randItem(users).email.split('@')[0];
        const assignee = randItem(users).firstName || randItem(users).email.split('@')[0];
        const task = randItem(TASK_TITLES);
        content = template.replace('{giver}', giver)
                         .replace('{assignee}', assignee)
                         .replace('{task}', task);
      } else if (rand < 0.15) { // mention ~10%
        const mentionUser = randItem(users);
        const mentionName = mentionUser.firstName || mentionUser.email.split('@')[0];
        const base = isWork ? randItem(WORK_SENTENCES) : randItem(CASUAL_SENTENCES);
        content = `@${mentionName} ${base}`;
      } else if (rand < 0.25) { // tag ~10%
        const tag = randItem(TAGS);
        const base = isWork ? randItem(WORK_SENTENCES) : randItem(CASUAL_SENTENCES);
        content = `${base} ${tag}`;
      } else if (rand < 0.35) { // media ~10%
        const mediaUrl = randItem(MEDIA_URLS);
        const base = isWork ? randItem(WORK_SENTENCES) : randItem(CASUAL_SENTENCES);
        content = `${base} ${mediaUrl}`;
      } else if (rand < 0.55) { // normal message
        content = isWork ? randItem(WORK_SENTENCES) : randItem(CASUAL_SENTENCES);
        // Occasionally add an emoji
        if (Math.random() < 0.2) content += ` ${randItem(EMOJIS)}`;
      } else {
        // Short filler message (very casual)
        content = randItem(CASUAL_SENTENCES);
      }

      // Occasionally make it a reply (≈20%)
      let replyToId = undefined;
      if (idsForReplies.length > 0 && Math.random() < 0.20) {
        replyToId = randItem(idsForReplies);
      }

      const createdAt = randomTimestamp(d, timestampsSet);

      const msg = {
        roomId: generalRoom._id,
        senderId: sender._id,
        content,
        channel: 'GROUP',
        timestamp: createdAt,
      };
      if (replyToId) msg.replyToId = replyToId; // note: schema may not have field, but adding doesn't break Mongo

      messages.push(msg);
    }

    // Insert batch for the day (ordered false for speed)
    const inserted = await ChatMessage.insertMany(messages, { ordered: false });
    // Store IDs for potential replies on later days (optional, we keep only today’s ids)
    idsForReplies.push(...inserted.map(m => m._id));
    totalCreated += inserted.length;
    console.log(`📅 ${dayStr} → ${inserted.length} msgs`);
  }

  console.log(`✅ Finished seeding. Total messages created: ${totalCreated}`);
  // Optional: write a summary JSON file for verification
  const fs = require('fs');
  fs.writeFileSync('chat_seed_summary.json', JSON.stringify(dailyStats, null, 2));
  process.exit(0);
})();
