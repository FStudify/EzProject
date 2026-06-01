chức năng chat
thì nó phải telegram
- có xem số lượng thành viên ( ấn vào thì nó hiển thị các thành viên và nhóm trưởng có quyền kick ), có thể rời nhóm, nhóm general luôn xuất hiện và có ở trong kênh ( không hiển thị số lượng thành viên ở trong kênh)
nhóm trưởng ( người tạo group) có quyền khoá quyền mời thành viên, phong cấp quản trị nhóm, quản trị viên quyền tương đương nhóm trưởng nhưng không có quyền kcik nhóm trưởng, nhóm trưởng thì toàn quyền kể cả hạ cấp quản trị vien và kick quản trị viên 
vẽ ra
------------------------------------------------------------
| kênh               |                                                              |
| Genaral          |

Nếu muốn chức năng chat giống Telegram nhưng đơn giản hóa cho hệ thống quản lý dự án của bạn, mình đề xuất cấu trúc và quyền như sau:

1. Cấu trúc Chat
Workspace / Project
│
├── KÊNH (Channels)
│   ├── # General (mặc định)
│   ├── # Frontend
│   ├── # Backend
│   ├── # Meeting
│   └── ...
│
└── NHÓM CHAT (Groups)
    ├── Team Design
    ├── Team Dev
    ├── Team Marketing
    └── ...
2. Sidebar
------------------------------------------------------------
| Trò chuyện                                             + |
------------------------------------------------------------
| 🔍 Tìm cuộc trò chuyện...                               |
------------------------------------------------------------
| KÊNH                                                    |
|                                                         |
| # General                                               |
| # Frontend                                              |
| # Backend                                               |
| # Meeting                                               |
|                                                         |
------------------------------------------------------------
| NHÓM                                                    |
|                                                         |
| 👥 Team Dev (8)                                         |
| 👥 Team Design (5)                                      |
| 👥 Team Marketing (3)                                   |
|                                                         |
------------------------------------------------------------
| TIN NHẮN TRỰC TIẾP                                      |
|                                                         |
| 🟢 Nguyễn Văn A                                         |
| 🟢 Trần Văn B                                           |
------------------------------------------------------------
Quy tắc

✅ General luôn tồn tại

✅ General luôn nằm trong mục KÊNH

✅ Không hiển thị số thành viên của Kênh

✅ Nhóm Chat hiển thị số thành viên

3. Header nhóm

Ví dụ đang mở nhóm "Team Dev"

------------------------------------------------------------
| 👥 Team Dev                                     ▼       |
| 8 thành viên                                            |
------------------------------------------------------------

Click vào phần "8 thành viên":

--------------------------------------------------
| Thành viên nhóm                                |
--------------------------------------------------
| 👑 Nguyễn Văn A (Nhóm trưởng)                  |
| ⭐ Trần Văn B (Quản trị viên)                  |
| 👤 Lê Văn C                                    |
| 👤 Phạm Văn D                                  |
--------------------------------------------------
| [Rời nhóm]                                     |
--------------------------------------------------
4. Quyền hạn
Member

Có thể:

Chat
Xem thành viên
Rời nhóm

Không thể:

Kick người khác
Mời người khác khi bị khóa
Phong cấp
Admin

Có thể:

Chat
Mời thành viên
Kick Member
Phong cấp Member → Admin
Khóa/Mở quyền mời thành viên

Không thể:

Kick Owner
Hạ cấp Owner
Owner (Người tạo nhóm)

Có toàn quyền:

Kick Member
Kick Admin
Hạ cấp Admin
Nâng cấp Admin
Khóa quyền mời thành viên
Chuyển quyền Owner
Xóa nhóm
5. Menu quản lý nhóm

Chỉ Owner/Admin mới thấy

--------------------------------------------------
| Cài đặt nhóm                                   |
--------------------------------------------------
| Mời thành viên                                 |
| Danh sách thành viên                           |
|------------------------------------------------|
| [✓] Cho phép thành viên mời người khác         |
|------------------------------------------------|
| Phong quản trị viên                            |
| Hạ cấp quản trị viên                           |
|------------------------------------------------|
| Rời nhóm                                       |
--------------------------------------------------
6. Danh sách thành viên (Owner)
--------------------------------------------------
| Thành viên                                     |
--------------------------------------------------
| 👑 Nguyễn Văn A                                |
|                                                 |
| ⭐ Trần Văn B                     [Hạ cấp]      |
|                                                 |
| 👤 Lê Văn C                       [Kick]        |
| 👤 Phạm Văn D                     [Kick]        |
--------------------------------------------------