# EZProject

Unified workspace platform for student teams — tasks, documents, chat, meetings, and performance tracking in one collaborative app.

## Project Structure

```
EzProject/
├── Frontend/              # React 19 + Vite + TypeScript + Tailwind CSS 4
│   ├── src/
│   │   ├── api/           # Centralized API layer (config, endpoints, *.api.ts)
│   │   ├── contexts/      # Auth, Theme, Language, ChatSocket, Sidebar
│   │   ├── components/    # Shared UI (ui/) + Layout (layout/)
│   │   ├── features/      # Feature modules (auth, dashboard, projects, tasks, ...)
│   │   ├── i18n/          # Custom VI/EN dictionary
│   │   ├── mocks/         # Mock data fallback (dev only)
│   │   └── services/      # projectService, taskService
│   ├── package.json
│   └── vercel.json
│
├── Backend/               # Express.js (CommonJS) + Mongoose + MongoDB Atlas
│   ├── server.js          # Entry: start HTTP + Socket.io
│   ├── app.js             # Express config (middleware, routes)
│   ├── config/            # index.js (env-based), database.js, upload.config.js
│   ├── models/            # 11 Mongoose models (User, Project, Task, Chat, Document, Meeting, ...)
│   ├── controllers/       # 12 business logic handlers
│   ├── routes/            # 14 route files
│   ├── middlewares/       # auth, errorHandler, rateLimit, upload, documentUploadRateLimiter
│   ├── services/          # emailService
│   ├── socket.js          # Socket.io server logic
│   ├── utils/             # fileStorage
│   ├── validators/        # Zod schemas
│   ├── seed/              # seed.js (5 users), seedAdmin.js
│   ├── scripts/           # migrate-document-size.js
│   └── package.json
│
├── docs/                  # Project documentation
│   ├── 1-BRD-Project-Overview.md
│   ├── 2-SRS-Functional-Requirements.md
│   ├── 3-UseCase-User-Flow.md
│   ├── 4-Database-Design.md
│   ├── 5-API-Specification.md
│   ├── 6-System-Architecture.md
│   ├── 7-NFR-Non-Functional-Requirements.md
│   ├── 8-TechStack-Coding-Conventions.md
│   ├── 9-UIUX-Design.md
│   └── deployment/DEPLOY_GUIDE.md
│
├── render.yaml            # Render infra-as-code
└── gundsetupdeploy.ps1    # Helper script for .env management
```

---

## Quick Start

### Frontend

```bash
cd Frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

> Frontend gọi Backend ở `VITE_API_URL` (mặc định `http://localhost:3000`).

### Backend

```powershell
# Ở root repo, tự động copy .env.example -> .env (hỏi trước khi ghi đè)
.\gundsetupdeploy.ps1 -Mode init

# Hoặc thủ công:
cd Backend
copy .env.example .env
# Sửa .env: set MONGO_URI, JWT_SECRET, ...

npm install
npm run dev   # = node --watch server.js
# Runs at http://localhost:3000
```

### Seed demo data (optional)

```bash
cd Backend
npm run seed
# Tạo 5 user test (admin/leader1/member1/member2/supervisor1, password 123456)
# + 2 project mẫu + 7 tasks + 3 meetings + chat/activities/notifications
```

> `seed.js` xóa data cũ trước khi insert. Chỉ dùng cho dev/demo.

---

## Environment Setup

Dự án có **25 biến môi trường** (24 Backend + 1 Frontend). File `.env.example` ở cả `Backend/` và `Frontend/` chỉ chứa placeholder, mọi key đều được phép commit lên repo.

### Workflow nhanh

```powershell
# 1. Khoi tao .env tu .env.example
.\gundsetupdeploy.ps1 -Mode init

# 2. Mo Backend\.env, dien 5 gia tri bat buoc:
#    MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, FRONTEND_URL
#    (CLOUDINARY_* va SMTP_* co the de trong neu khong dung)

# 3. Mo Frontend\.env, dien:
#    VITE_API_URL=http://localhost:3000

# 4. Validate da du keys chua
.\gundsetupdeploy.ps1 -Mode validate

# 5. Chay app
cd Backend && npm run seed && npm run dev
# Terminal khac:
cd Frontend && npm run dev
```

### Lay gia tri o dau?

| Bien | Lay tu |
|------|--------|
| `MONGO_URI` | https://www.mongodb.com/cloud/atlas (cluster free M0) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -base64 32` hoac Render "Generate Value" |
| `CLOUDINARY_*` | https://cloudinary.com (free 25GB, optional) |
| `SMTP_*` | https://resend.com (free 100 email/ngay, optional) |

### Deploy production

| Nền tảng | File config | Bien can paste |
|----------|------------|-----------------|
| **Render** (Backend) | `render.yaml` (auto-detect) | `MONGO_URI`, `CORS_ORIGIN`, `FRONTEND_URL` + (optional) Cloudinary, SMTP |
| **Vercel** (Frontend) | `vercel.json` | `VITE_API_URL` = URL Render |

Helper script cung cấp lệnh `export-render` và `export-vercel` để xuất keys ra clipboard.

> **Chi tiết đầy đủ** từng bước: xem **[docs/19_ENVIRONMENT_GUIDE.md](docs/19_ENVIRONMENT_GUIDE.md)** (hướng dẫn lấy từng giá trị, troubleshooting 8 lỗi thường gặp, security checklist).

---

## Frontend — API Layer

The frontend uses a **centralized API layer** pattern at `src/api/`:

| File | Purpose |
|---|---|
| `config.ts` | Fetch wrapper — JWT injection, timeout, retry, error normalization, token refresh |
| `errors.ts` | Typed error classes (ApiError, UnauthorizedError, NetworkError) |
| `types.ts` | TypeScript types matching backend API responses |
| `endpoints.ts` | Centralized URL management — no hardcoded URLs |
| `auth.api.ts` | Login, register, logout, refresh |
| `user.api.ts` | Profile, preferences, password, notifications |
| `project.api.ts` | CRUD + pagination + filter |
| `task.api.ts` | CRUD + comments |
| `document.api.ts` | File/folder operations |
| `meeting.api.ts` | CRUD + RSVP |
| `chat.api.ts` | Rooms + messages |
| `member.api.ts` | Members, roles, invite links |
| `index.ts` | Barrel export |

### Environment Variables (Frontend)

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

---

## Backend — MongoDB + Mongoose

### Models

| Model | Collection | Description |
|---|---|---|
| `User` | `users` | User accounts with auth |
| `RefreshToken` | `refresh_tokens` | JWT refresh tokens (TTL auto-delete) |
| `Project` | `projects` | Projects with embedded members array |
| `Task` | `tasks` | Tasks with embedded comments array |
| `Folder` | `folders` | Document folders |
| `Document` | `documents` | Uploaded files metadata |
| `Meeting` | `meetings` | Meetings with embedded attendees |
| `ChatRoom` | `chat_rooms` | Chat rooms |
| `ChatMessage` | `chat_messages` | Chat messages |
| `Activity` | `activities` | Project activity feed |
| `Notification` | `notifications` | User notifications |
| `MemberEvaluation` | `member_evaluations` | Performance evaluations |

### API Endpoints

All endpoints prefixed with `/api/v1/`.

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout` |
| **Users** | `GET /users/me`, `PUT /users/me`, `PUT /users/me/preferences`, `PUT /users/me/password`, `GET /users/me/notifications` |
| **Projects** | `GET /projects`, `POST /projects`, `GET /projects/:id`, `PUT /projects/:id`, `DELETE /projects/:id` |
| **Tasks** | `GET /projects/:pid/tasks`, `POST /projects/:pid/tasks`, `PUT /projects/:pid/tasks/:id`, `DELETE /projects/:pid/tasks/:id`, `PUT /projects/:pid/tasks/:id/comments` |
| **Documents** | `GET /projects/:pid/documents`, `POST /projects/:pid/documents`, `PUT /projects/:pid/documents/:id`, `DELETE /projects/:pid/documents/:id` |
| **Meetings** | `GET /projects/:pid/meetings`, `POST /projects/:pid/meetings`, `PUT /projects/:pid/meetings/:id`, `DELETE /projects/:pid/meetings/:id`, `PUT /projects/:pid/meetings/:id/rsvp` |
| **Chat** | `GET /projects/:pid/chat/rooms`, `POST /projects/:pid/chat/rooms`, `GET /projects/:pid/chat/rooms/:id/messages` |
| **Members** | `GET /projects/:pid/members`, `PUT /projects/:pid/members/:uid/role`, `DELETE /projects/:pid/members/:uid`, `POST /projects/:pid/members/invite` |
| **Performance** | `GET /projects/:pid/performance`, `POST /projects/:pid/performance/evaluate` |
| **Activities** | `GET /projects/:pid/activities` |

### Authentication

All protected routes require:
```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Use `/api/v1/auth/refresh` to get a new pair.

### Environment Variables (Backend)

```bash
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ezproject
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## Documentation

| # | Document | Contents |
|---|---|---|
| 1 | BRD Project Overview | Team, problems, solution, scope, KPIs |
| 2 | SRS Functional Requirements | Module-by-module functional specs (Auth, Projects, Tasks, Docs, Members, Meetings, Chat, Performance, Profile) |
| 3 | Use Case / User Flow | Actors (Customer/Admin/Leader/Supervisor/Member), 14 use cases, flows |
| 4 | Database Design | **MongoDB + Mongoose** — 11 collections, ERD, business rules, TTL indexes |
| 5 | API Specification | 40+ endpoints, request/response, Socket.io events, error codes |
| 6 | System Architecture | Frontend, Backend, MongoDB Atlas, Render + Vercel, real-time Socket.io |
| 7 | NFR Non-Functional | Performance, security, rate limits, env vars |
| 8 | Tech Stack & Conventions | Stack (React 19, Express 4.21, Mongoose 8.9), naming, Git flow |
| 9 | UI/UX Design | Color palette, typography, components |
| 19 | [Environment Guide](docs/19_ENVIRONMENT_GUIDE.md) | 25 env vars, cách lấy từng giá trị, deploy Render + Vercel |
| — | [Deployment Guide](docs/deployment/DEPLOY_GUIDE.md) | Step-by-step: MongoDB Atlas + Render + Vercel |
