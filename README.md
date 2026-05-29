# EZProject

Unified workspace platform for student teams — tasks, documents, chat, meetings, and performance tracking in one collaborative app.

## Project Structure

```
EzProject/
├── Frontend/              # React 19 + Vite + TypeScript + Tailwind CSS 4
│   ├── src/
│   │   ├── api/           # Centralized API layer
│   │   ├── contexts/      # React contexts (Auth, Theme, Language)
│   │   ├── components/    # Shared UI components
│   │   ├── features/      # Feature modules (dashboard, projects, tasks, etc.)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── i18n/          # Internationalization
│   │   └── mocks/         # Mock data (dev only)
│   └── package.json
│
├── Backend/               # Express.js + TypeScript + Mongoose + MongoDB Atlas
│   ├── src/
│   │   ├── config/        # Environment config (typed)
│   │   ├── database/       # MongoDB Atlas connection
│   │   ├── models/         # Mongoose schemas (User, Project, Task, etc.)
│   │   ├── services/       # Business logic
│   │   ├── routes/         # Express route handlers
│   │   ├── validators/     # Zod validation schemas
│   │   └── main.ts         # Entry point
│   └── package.json
│
└── docs/                  # Project documentation
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

### Backend

```bash
cd Backend
cp .env.example .env
# Edit .env: set MONGO_URI from MongoDB Atlas

npm install
npm run dev
# Runs at http://localhost:3000
```

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
| 2 | SRS Functional Requirements | Module-by-module functional specs |
| 3 | Use Case / User Flow | Actors, use cases, activity diagrams |
| 4 | Database Design | PostgreSQL schema (reference), ERD |
| 5 | API Specification | 40+ endpoints, request/response examples |
| 6 | System Architecture | Frontend, backend, security, deployment |
| 7 | NFR Non-Functional | Performance, security, scalability |
| 8 | Tech Stack & Conventions | Stack, naming, Git flow, code style |
| 9 | UI/UX Design | Color palette, typography, components |
