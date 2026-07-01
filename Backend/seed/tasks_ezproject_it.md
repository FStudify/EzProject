# EZProject — Development Tasks (IT)

Dự án: EZProject (`6a44ccd2098654a645b7fd09`)
Hashtag: **it**
Deadline: tùy task

---

## Backend & API

**assigneeId:** `6a41ecfdba2491bec8005aca` — Quốc Hiệu (LEADER)
**assigneeId:** `6a44c4bab6896738e7b06071` — Hoàng Võ Bảo Khánh (MEMBER)
**assigneeId:** `6a44d043098654a645b7ff1d` — Trân Huyền (MEMBER)

---

### IT-01
Name: Thiết kế và tối ưu Database Schema
Description: Rà soát lại toàn bộ database schema hiện tại (User, Project, Task, Meeting, Chat, Activity, Notification), chuẩn hóa index, áp dụng các best practice về MongoDB như aggregation pipeline, populate optimization và lookup thay vì nested populate nhiều cấp. Tạo ERD mới cho team.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-02
Name: Xây dựng REST API cho Dashboard & Analytics
Description: Phát triển các endpoint `/api/v1/dashboard/stats` trả về tổng hợp số liệu: tổng tasks theo status, tiến độ project, thống kê hoạt động user trong 7 ngày gần nhất, top contributors. Dùng aggregation pipeline để query hiệu quả.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-03
Name: Implement JWT Refresh Token & Session Management
Description: Bổ sung Refresh Token mechanism cho hệ thống auth hiện tại. Xử lý token rotation, revoke token khi logout, blacklist tokens khi đổi mật khẩu. Cài đặt token expiry ngắn cho access token (15 phút) và dài cho refresh token (7 ngày).
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-04
Name: Xây dựng WebSocket Real-time cho Notifications & Activity
Description: Tích hợp Socket.io vào backend để push real-time notifications khi có task mới, comment mới, meeting reminder, chat message. Viết event handlers cho JOIN_ROOM theo projectId, BROADCAST khi có thay đổi trong project. Frontend subscribe qua `socket.on('notification')`.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-05
Name: Implement Role-Based Access Control (RBAC) Middleware
Description: Viết middleware kiểm soát quyền truy cập chi tiết trên từng endpoint: chỉ OWNER được xóa project, LEADER/SUPERVISOR được assign task, MEMBER chỉ đọc. Middleware kiểm tra `userId` vs `member.userId` trong project trước khi cho phép thao tác.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-06
Name: Xây dựng API xử lý File Upload & Attachment
Description: Implement endpoint upload file đính kèm cho Task (ảnh, tài liệu PDF/Word) dùng Multer + Cloud Storage (AWS S3 hoặc Cloudinary). Tạo API `/api/v1/tasks/:id/attachments` — POST upload, GET list, DELETE. Giới hạn dung lượng 10MB, validate file type.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-07
Name: Tối ưu hóa Database Queries với Indexing & Pagination
Description: Rà soát các query chậm trong taskController, projectController, meetingController. Thêm compound indexes cho các truy vấn phổ biến (projectId + status, assigneeId + deadline). Implement cursor-based pagination thay vì offset cho các danh sách lớn, giảm server load.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-08
Name: Xây dựng API Export Report (CSV/Excel)
Description: Implement endpoint `/api/v1/projects/:id/export` cho phép export dữ liệu project dưới dạng CSV/Excel: danh sách tasks (theo status), thống kê meeting, thành viên. Dùng thư viện exceljs hoặc csv-writer để generate file, trả về download link có expiry.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-09
Name: Implement Email Notification Service
Description: Cài đặt hệ thống gửi email tự động qua Nodemailer/SendGrid khi: được assign task mới, deadline sắp đến (24h trước), meeting reminder (1h trước), invitation được chấp nhận. Viết email template responsive HTML cho các notification type.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-10
Name: Xây dựng Search API với Full-Text Search
Description: Implement endpoint `/api/v1/search` hỗ trợ tìm kiếm toàn diện trên tasks, projects, meetings, users dùng MongoDB Text Index. Kết quả phân loại theo type, highlight keyword matching, pagination. Tốc độ response < 200ms.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

---

## Frontend & UI/UX

### IT-11
Name: Redesign Task Board với Kanban View
Description: Cải tiến Task Board từ danh sách đơn giản sang Kanban với drag-and-drop columns (BACKLOG → IN_PROGRESS → REVIEW → DONE). Dùng thư viện @dnd-kit để implement drag-drop mượt. Thêm filter theo assignee, priority, hashtag và search inline.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-12
Name: Xây dựng Dashboard với Charts & KPI Widgets
Description: Thiết kế và implement Dashboard page với các widget: biểu đồ tasks theo status (donut chart), timeline tiến độ project (progress bar), hoạt động gần đây (activity feed), deadline sắp tới. Dùng Recharts hoặc Chart.js. Responsive trên mobile.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-13
Name: Implement Dark Mode Toggle
Description: Thêm tính năng chuyển đổi Dark/Light mode trong settings. Dùng CSS variables để quản lý theme, lưu preference vào localStorage và backend (User.theme field). Tất cả components phải support cả hai theme. Áp dụng smooth transition khi chuyển đổi.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-14
Name: Xây dựng Realtime Notification Bell & Toast
Description: Implement Notification Bell icon với badge count số thông báo chưa đọc. Dropdown hiển thị danh sách notifications với type icons (task, meeting, chat, invite). Toast notification popup góc phải màn hình khi có sự kiện real-time. Có nút "Mark all as read".
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-15
Name: Implement Skeleton Loading & Optimistic UI
Description: Thay thế tất cả loading spinner bằng skeleton screens đồng nhất. Implement optimistic UI cho các action: tạo task, update status (cập nhật ngay trên UI trước khi API trả về, rollback nếu thất bại). Cải thiện perceived performance.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-16
Name: Refactor Global State với Zustand
Description: Rà soát và refactor các context providers hiện tại (AuthContext, ProjectContext, etc.) sang Zustand stores để đơn giản hóa code, giảm re-renders. Tách stores theo domain: authStore, projectStore, taskStore, notificationStore. Dùng persist middleware.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-17
Name: Xây dựng Modal System & Reusable Component Library
Description: Xây dựng hệ thống Modal统一的 với các variants: confirmation, form, detail view, full-screen. Tạo component library gồm: Button, Input, Select, Badge, Avatar, Dropdown, Tabs, Pagination — đảm bảo consistency về spacing, colors, typography. Viết Storybook stories.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-18
Name: Implement Advanced Task Filtering & Sorting
Description: Bổ sung bộ lọc nâng cao cho task list: filter theo date range (created, deadline), filter theo multiple hashtags (AND/OR), filter theo requestType (review, pause), sort theo priority, sort theo assignee name. Filter state được lưu trong URL query params để share được.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

### IT-19
Name: Responsive Layout & Mobile Navigation
Description: Tối ưu toàn bộ layout cho mobile (< 768px). Implement hamburger menu, bottom navigation bar cho mobile. Đảm bảo task board, meeting list, chat đều sử dụng được trên điện thoại. Test trên iOS Safari và Android Chrome. Đạt Lighthouse Mobile score > 85.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-20
Name: Xây dựng Chat UI với Real-time Messaging
Description: Thiết kế và implement Chat interface với real-time messaging qua Socket.io. Hỗ trợ General room và Channels. Hiển thị message với avatar, timestamp, read receipts. Emoji picker, file attachment trong chat. Infinite scroll cho message history.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

---

## Testing & Quality Assurance

### IT-21
Name: Viết Unit Tests với Vitest cho Backend Controllers
Description: Thiết lập Vitest + Supertest cho backend. Viết unit tests cho các controllers quan trọng: taskController (CRUD, status transitions), authController (login, register, token), projectController (invite, remove member). Đạt coverage > 70% cho các controller này.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-22
Name: Viết Integration Tests cho API Endpoints
Description: Viết integration tests cho các flows chính: (1) Auth flow — register → login → refresh token, (2) Project flow — create → invite member → remove member, (3) Task flow — create → assign → update status → add comment → complete. Dùng test database riêng, seed data tự động.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-23
Name: Thiết lập E2E Testing với Playwright
Description: Cài đặt Playwright và viết E2E test cho các user journeys: (1) đăng nhập → tạo project → thêm task → assign, (2) tạo meeting → nhận notification, (3) chat trong project. Setup CI pipeline chạy E2E tests mỗi khi merge vào main branch.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-24
Name: Setup CI/CD với GitHub Actions
Description: Thiết lập GitHub Actions workflow cho: (1) lint + type-check mỗi PR, (2) unit + integration tests trên Node 18/20, (3) frontend build và deploy lên Vercel khi merge vào master, (4) backend deploy lên Railway/Render khi merge vào master. Thêm notification Slack khi deploy thất bại.
assigneeId: `6a41ecfdba2491bec8005aca`
hashtag: it

### IT-25
Name: Performance Audit & Optimization
Description: Chạy Lighthouse audit trên production, tối ưu: (1) bundle size — code-split routes, lazy load components, tree-shake unused imports, (2) API response time — profile slow endpoints, implement caching Redis cho các query thường xuyên, (3) frontend rendering — memo components, virtualize long lists > 50 items.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it

---

## Features & Enhancements

### IT-26
Name: Implement i18n Internationalization (VI/EN)
Description: Cài đặt i18next cho frontend hỗ trợ 2 ngôn ngữ: Tiếng Việt (mặc định) và English. Tách tất cả strings ra i18n dict files. Language preference được lưu trong User.language field. Tất cả date/time format phải localize theo ngôn ngữ người dùng chọn.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-27
Name: Xây dựng Activity Log & Audit Trail
Description: Ghi lại toàn bộ hoạt động trong project: ai tạo/sửa/xóa task, ai tham gia/ra khỏi project, ai thay đổi deadline. Tạo Activity timeline component hiển thị trong project detail. Cho phép filter activity theo user, action type, date range.
assigneeId: `6a44d043098654a645b7ff1d`
hashtag: it

### IT-28
Name: SEO & PWA Setup cho Website
Description: Implement PWA (Progressive Web App): Service Worker để cache static assets và API responses, Web App Manifest cho "Add to Home Screen", offline fallback page. Cải thiện SEO: meta tags, Open Graph, JSON-LD structured data cho project boards, sitemap.xml, robots.txt.
assigneeId: `6a44c4bab6896738e7b06071`
hashtag: it
