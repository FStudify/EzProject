# REBUILD GROUP MANAGEMENT SYSTEM (OWNER / ADMIN / MEMBER)

## Mục tiêu

Xây dựng lại hoàn toàn chức năng quản lý nhóm theo mô hình Telegram/Discord.

Không sửa vá tạm thời.

Phải kiểm tra toàn bộ Backend, Frontend, API, Database Schema, Permissions, Query và Socket Events liên quan.

Nếu cấu trúc hiện tại không phù hợp thì được phép thiết kế lại model và migration dữ liệu.

---

# ROLE SYSTEM

Mỗi thành viên trong nhóm phải có role:

```ts
enum ChannelRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}
```

Quy tắc:

* OWNER: nhóm trưởng
* ADMIN: quản trị viên
* MEMBER: thành viên thường

---

# GROUP CREATION

Khi tạo nhóm:

Người tạo nhóm phải tự động:

```ts
role = OWNER
```

Ví dụ:

```text
Nguyễn Văn A tạo nhóm

=> A là OWNER
```

Không cần API riêng để set owner.

Thực hiện ngay lúc create channel.

---

# PERMISSIONS

## OWNER

OWNER có quyền:

* chỉnh sửa thông tin nhóm
* đổi tên nhóm
* đổi avatar nhóm
* mời thành viên
* kick thành viên
* bổ nhiệm ADMIN
* hạ quyền ADMIN
* chuyển quyền OWNER
* rời nhóm

---

## ADMIN

ADMIN có quyền:

* mời thành viên
* kick MEMBER

ADMIN KHÔNG được:

* kick OWNER
* kick ADMIN khác
* bổ nhiệm ADMIN
* hạ quyền ADMIN
* chuyển quyền OWNER

---

## MEMBER

MEMBER có quyền:

* xem nhóm
* chat
* gửi file
* rời nhóm

MEMBER không có quyền quản trị.

---

# DATABASE DESIGN

Thiết kế lại nếu cần.

Ví dụ:

```ts
Channel
{
  id
  name
  ownerId
  createdAt
  updatedAt
}
```

```ts
ChannelMember
{
  id
  channelId
  userId
  role
  joinedAt
}
```

ownerId phải luôn đồng bộ với member role OWNER.

Không được tồn tại 2 OWNER trong cùng 1 channel.

---

# LEAVE CHANNEL

Thiết kế lại hoàn toàn chức năng leave channel.

Hiện tại API đang báo thành công nhưng dữ liệu không thay đổi.

Phải tìm nguyên nhân và sửa triệt để.

---

## CASE 1

MEMBER rời nhóm

Ví dụ:

```text
Owner
Admin
Member A
```

Member A bấm Leave

Kết quả:

```text
DELETE channel_member
```

Sau đó:

* không còn trong danh sách nhóm
* không truy cập được channel
* không đọc được tin nhắn
* không gửi được tin nhắn
* không xuất hiện trong member list

---

## CASE 2

ADMIN rời nhóm

Thực hiện tương tự MEMBER.

---

## CASE 3

OWNER rời nhóm khi còn nhiều thành viên

Ví dụ:

```text
Owner
Admin
Member
```

Khi Owner bấm Leave:

KHÔNG rời ngay.

Hiển thị modal:

```text
Bạn là nhóm trưởng.

Vui lòng chọn người kế nhiệm trước khi rời nhóm.
```

Danh sách hiển thị:

```text
Admin
Member
```

Owner chọn 1 người.

Sau khi xác nhận:

```ts
oldOwner.role = MEMBER hoặc bị remove khỏi nhóm
newOwner.role = OWNER
channel.ownerId = newOwner.id
```

Sau đó mới thực hiện Leave.

Kết quả:

```text
Owner cũ biến mất khỏi nhóm.

Người được chọn trở thành OWNER.
```

---

## CASE 4

OWNER là thành viên duy nhất

Ví dụ:

```text
Owner
```

Khi bấm Leave:

Không hiển thị modal chọn owner.

Thực hiện:

```ts
DELETE channel
DELETE channel_members
DELETE channel_messages
DELETE attachments
```

Toàn bộ nhóm bị xoá khỏi database.

---

# TRANSFER OWNER

API mới:

```http
POST /channels/:id/transfer-owner
```

Body:

```json
{
  "newOwnerId": "..."
}
```

Validation:

* chỉ OWNER được gọi
* newOwner phải thuộc nhóm
* newOwner không được là chính OWNER hiện tại

Sau khi thành công:

```ts
oldOwner.role = ADMIN
newOwner.role = OWNER
channel.ownerId = newOwnerId
```

---

# KICK MEMBER

API:

```http
DELETE /channels/:id/members/:userId
```

Rule:

OWNER:

* kick ADMIN
* kick MEMBER

ADMIN:

* chỉ kick MEMBER

MEMBER:

* không được kick ai

---

# PROMOTE ADMIN

API:

```http
POST /channels/:id/promote
```

Body:

```json
{
  "userId": "..."
}
```

Chỉ OWNER được thực hiện.

Sau khi promote:

```ts
role = ADMIN
```

---

# DEMOTE ADMIN

API:

```http
POST /channels/:id/demote
```

Body:

```json
{
  "userId": "..."
}
```

Chỉ OWNER được thực hiện.

Sau khi demote:

```ts
role = MEMBER
```

---

# API SECURITY

Tất cả API phải validate:

```ts
isMember
isAdmin
isOwner
```

Không được tin dữ liệu frontend.

Mọi permission phải kiểm tra ở backend.

---

# SOCKET EVENTS

Khi:

* leave
* kick
* promote
* demote
* transfer owner

Phải emit socket event.

Ví dụ:

```ts
channel.member.left
channel.member.kicked
channel.owner.changed
channel.member.promoted
channel.member.demoted
```

Frontend phải cập nhật realtime.

---

# FRONTEND

Kiểm tra và sửa toàn bộ UI.

---

## Member List

Hiển thị badge:

```text
OWNER
ADMIN
MEMBER
```

---

## Context Menu

OWNER nhìn thấy:

```text
Promote Admin
Demote Admin
Transfer Ownership
Kick Member
```

ADMIN nhìn thấy:

```text
Kick Member
```

MEMBER:

```text
Không thấy action quản trị
```

---

## Leave Channel Modal

Nếu OWNER và còn thành viên khác:

Hiển thị modal chọn owner mới.

Nếu MEMBER hoặc ADMIN:

Hiển thị confirm đơn giản.

Nếu OWNER là người cuối cùng:

Hiển thị cảnh báo:

```text
Nhóm sẽ bị xoá vĩnh viễn.
```

---

# CHANNEL VISIBILITY

Sau khi leave hoặc bị kick:

Người dùng phải:

* mất channel khỏi sidebar
* mất channel khỏi danh sách joined groups
* không thể mở URL channel
* API trả 403 hoặc 404
* websocket bị remove khỏi room

---

# TESTING

Tạo test đầy đủ:

1. Member leave
2. Admin leave
3. Owner leave + transfer owner
4. Owner leave + delete channel
5. Promote admin
6. Demote admin
7. Kick member
8. Kick admin
9. Unauthorized actions
10. Sidebar refresh after leave
11. Socket sync
12. Database consistency

---

# EXPECTED RESULT

Sau khi hoàn thành:

* Chức năng leave hoạt động thật sự
* Database cập nhật chính xác
* Sidebar cập nhật chính xác
* Không còn nhóm ma
* Không còn thành viên ma
* Không còn trường hợp báo thành công nhưng dữ liệu không thay đổi
* Permission OWNER/ADMIN/MEMBER hoạt động đúng
* Code production-ready
* Không được để TODO, FIXME hoặc mock implementation
