const mongoose = require('mongoose');

const URI = 'mongodb+srv://EzProject:FstudifyEzProject204@ezproject.12ddmyt.mongodb.net/?appName=EzProject';

const conversations = [
  // Work discussions
  [
    "Ê làm API chưa?", "Chưa m ơi, đang fix db", "Lẹ lên", "Ok ok xíu làm", "Push lẹ t ghép front end"
  ],
  [
    "Pull code đi.", "Đợi xíu", "Merge giúp tao với.", "Conflict rồi.", "Đcm lại conflict à", "Để t resolve cho"
  ],
  [
    "Deploy chưa?", "Rồi, lên vercel rồi", "Check thử", "Vào đc r nè", "Đỉnh vl", "Ngon"
  ],
  [
    "Server chết à?", "Đang restart", "Hèn gì quay đều", "Up lại r đó m", "ok"
  ],
  [
    "Check giúp t payment.", "PayOS chạy chưa?", "Mới fix xong", "Để tao test thử", "Thẻ demo chạy ok ko?", "Đang test, đợi xíu", "Ngon r, pass hết"
  ],
  [
    "Mai demo đó.", "Má run vl", "Đã chuẩn bị slide chưa?", "Rồi m", "Tối nhớ rehearsal nha", "Ok 8h tối lên Google Meet", "Oke"
  ],
  [
    "Backend xong chưa?", "Còn thiếu 1 api", "Lẹ m", "Ok", "Tối nay phải xong để mai ghép nha"
  ],
  [
    "Socket đang lỗi.", "Timer bị lệch à", "Đúng r, lệch vài giây", "Fix được chưa?", "Đang fix, chắc do timezone", "Check lại hàm moment() xem"
  ],
  [
    "AI Summary đang lỗi.", "Nó trả về tiếng Anh ko à", "M set prompt sang tiếng Việt đi", "Đã set mà nó dở chứng", "Thêm câu 'Translate to Vietnamese' vào cuối", "Để thử"
  ],
  [
    "M nhớ update README.", "ok", "Đừng để trống thầy chửi đó", "rồi rồi", "nhớ update file .env.example luôn"
  ],
  [
    "Có ai test mobile chưa?", "Chưa, mới test trên web", "Giao diện trên đt vỡ hết r kìa", "Đệt", "M fix responsive đi", "Chiều nay t fix"
  ],
  [
    "Admin dashboard đẹp rồi.", "Chỉnh lại màu tí là perfect", "Ừ", "Màu này ổn r", "Thêm cái animation lúc load data vô"
  ],
  [
    "Payment History vẫn lỗi.", "Chỗ nào?", "Lúc lọc theo ngày nó sai bét", "À do chưa format date, để t sửa", "ok lẹ lẹ"
  ],
  [
    "Theo tụi m nên để giá Pro bao nhiêu?", "Chắc 99k thôi", "Rẻ vậy?", "Sinh viên mà, giá đó mới có ng mua", "Hợp lý", "Duyệt 99k"
  ],
  [
    "Ultra có nên thêm AI không?", "Có chứ, gói đắt nhất mà", "Voucher áp dụng cả Pro lẫn Ultra nhé.", "Ok", "Hay giới hạn AI theo ngày?", "Hợp lý, 1 ngày 50 requests thôi"
  ],
  [
    "Dashboard nhìn ổn chưa?", "Hơi trống", "Landing Page hơi trống.", "Animation thêm tí đi.", "Kệ đi, focus vào tính năng trước", "Ừ cũng đc"
  ],

  // Casual discussions
  [
    "Ê bây làm xong chưa?", "Chưa.", ":)", "Hahaha.", "Cái ni hề."
  ],
  [
    "Tối đi ăn không?", "Đang code sml", "Nghỉ tay tí đi", "Cafe không?", "Cũng đc", "Ra quán cũ nha"
  ],
  [
    "Ngủ chưa?", "Đói vl.", "Mệt ghê.", "Mới 2h sáng mà m", "Làm nốt api này rồi ngủ", "Cố lên"
  ],
  [
    "Mai học mấy giờ?", "7h30", "Dậy ko nổi", "Nhờ gọi t với", "Éo", ":))", "Năn nỉ"
  ],
  [
    "Ê thầy chấm kiểu chi bây?", "Không biết.", "Hy vọng pass.", "Chắc ổn.", "T sợ hỏi xoáy", "Hỏi code thì tự tin trả lời là đc"
  ],
  [
    "M nghĩ thu gói bao nhiêu thì hợp lý?", "Không biết nữa.", "Tiền vô tài khoản t thì ngon.", "Có cái cc.", "Mi khôn thế.", ":))", "=))"
  ],
  [
    "Vl.", "Đỉnh.", "Thôi làm tiếp.", "Ừ", "Sắp xong r", "Cố lên"
  ],
  [
    "Má đói quá", "Nấu mì ăn", "Hết mì r", "Đặt ShopeeFood đi", "Mới đặt", "Ok"
  ],
  [
    "Task này ai làm?", "T làm cho", "Ok tks m", "Không có chi", "Làm lẹ tối chơi game", "Kkk"
  ],
  [
    "Push code lên main r đó", "Để t check", "Review giúp nha", "Thấy ổn r", "Merge lun nha", "Merge đi"
  ]
];

const shortMessages = ["ok", "ừ", "ừm", "r", "kk", "haha", "oke", "đợi", "được", "xíu", "để coi", "ừ đúng", "đúng rồi", "đỉnh", "vl", "haha =))"];

async function seedChat() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const projId = new mongoose.Types.ObjectId('6a44ccd2098654a645b7fd09');
  const proj = await db.collection('projects').findOne({ _id: projId });

  if (!proj) {
    console.error('EZProject not found!');
    process.exit(1);
  }

  // Get members
  const memberIds = proj.members.map(m => m.userId);
  if (memberIds.length === 0) {
    console.error('Project has no members!');
    process.exit(1);
  }

  // Find or Create GENERAL chatroom
  let chatroom = await db.collection('chatrooms').findOne({ projectId: projId, type: 'GENERAL' });
  if (!chatroom) {
    console.log('Creating GENERAL chatroom...');
    const roomId = new mongoose.Types.ObjectId();
    const newRoom = {
      _id: roomId,
      projectId: projId,
      name: 'General',
      type: 'GENERAL',
      members: memberIds,
      createdBy: memberIds[0],
      chatAdmins: [],
      memberRoles: memberIds.map(uid => ({
        userId: uid,
        role: uid.toString() === memberIds[0].toString() ? 'OWNER' : 'MEMBER',
        joinedAt: new Date(),
        lastRead: new Date()
      })),
      createdAt: new Date('2026-06-11T00:00:00.000Z'),
      updatedAt: new Date('2026-06-11T00:00:00.000Z')
    };
    await db.collection('chatrooms').insertOne(newRoom);
    chatroom = newRoom;
  }

  const roomId = chatroom._id;

  // Generate timeline
  const startDate = new Date('2026-06-11T08:00:00.000Z');
  const endDate = new Date('2026-07-14T23:59:59.000Z');
  const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  const messagesToInsert = [];
  let currentTime = new Date(startDate);

  // Generate ~800 messages
  const totalMessagesTarget = 850;
  const messagesPerDayBase = totalMessagesTarget / daysDiff;

  for (let d = 0; d <= daysDiff; d++) {
    // Some days few, some days lot
    let msgsThisDay = Math.floor(messagesPerDayBase * (Math.random() * 1.5 + 0.5));
    
    // Near deadline (July 12-14), spike up messages
    if (d > daysDiff - 3) {
      msgsThisDay += 50;
    }

    // Start time of the day (morning)
    currentTime.setHours(8 + Math.floor(Math.random() * 3));
    currentTime.setMinutes(Math.floor(Math.random() * 60));

    let messagesCount = 0;
    
    while (messagesCount < msgsThisDay) {
      const convo = conversations[Math.floor(Math.random() * conversations.length)];
      
      let lastSender = null;
      for (const text of convo) {
        // Pick a sender that is not the same as the last one if possible
        let sender = memberIds[Math.floor(Math.random() * memberIds.length)];
        if (sender === lastSender && memberIds.length > 1) {
          while(sender === lastSender) {
            sender = memberIds[Math.floor(Math.random() * memberIds.length)];
          }
        }
        lastSender = sender;

        const objectId = mongoose.Types.ObjectId.createFromTime(Math.floor(currentTime.getTime() / 1000));
        messagesToInsert.push({
          _id: objectId,
          roomId: roomId,
          senderId: sender,
          content: text,
          channel: 'GROUP',
          timestamp: new Date(currentTime)
        });

        // Advance time by 30 seconds to 5 minutes
        currentTime = new Date(currentTime.getTime() + Math.floor(Math.random() * 5 * 60 * 1000) + 30000);
        messagesCount++;

        // Sometimes insert a short random message
        if (Math.random() < 0.2) {
          let randomSender = memberIds[Math.floor(Math.random() * memberIds.length)];
          const shortObjectId = mongoose.Types.ObjectId.createFromTime(Math.floor(currentTime.getTime() / 1000));
          messagesToInsert.push({
            _id: shortObjectId,
            roomId: roomId,
            senderId: randomSender,
            content: shortMessages[Math.floor(Math.random() * shortMessages.length)],
            channel: 'GROUP',
            timestamp: new Date(currentTime)
          });
          currentTime = new Date(currentTime.getTime() + Math.floor(Math.random() * 60 * 1000) + 10000);
          messagesCount++;
        }
      }
      
      // After a convo, wait 1 to 5 hours for the next one
      currentTime = new Date(currentTime.getTime() + Math.floor(Math.random() * 4 * 60 * 60 * 1000) + 3600000);
      // If time exceeds 2 AM next day, clamp it and move to next day logic properly
      if (currentTime.getHours() > 2 && currentTime.getHours() < 7) {
         currentTime.setHours(8); // Reset to next morning
      }
    }
    
    currentTime.setDate(currentTime.getDate() + 1);
  }

  console.log(`Prepared ${messagesToInsert.length} messages.`);
  
  // Wipe old messages if they exist for this room
  await db.collection('chatmessages').deleteMany({ roomId: roomId });

  if (messagesToInsert.length > 0) {
    await db.collection('chatmessages').insertMany(messagesToInsert);
  }

  console.log('Seed chat completed successfully!');
  process.exit(0);
}

seedChat().catch(console.error);
