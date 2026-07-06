# EZProject — Backend

> Express.js 4 + MongoDB (Mongoose) + Socket.io REST API

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4.21 |
| Database | MongoDB Atlas via Mongoose 8.9 |
| Real-time | Socket.io 4.8 |
| Auth | JWT (access + refresh) + Passport Google OAuth |
| Validation | Zod |
| File storage | Cloudinary (`multer-storage-cloudinary`) |
| Email | Resend (nodemailer transport) |
| AI | Google Generative AI (Gemini) |
| Security | Helmet, express-rate-limit, bcrypt |

## Features

- **Auth** — Register / login (JWT), Google OAuth, token refresh, logout
- **Projects** — Full CRUD, member roles (Leader, Vice-Leader, Supervisor, Member), invitations
- **Tasks** — CRUD with subtasks, comments, hashtags, deadlines, AI-generated suggestions
- **Documents** — Upload PDF/DOCX/images to Cloudinary, folder tree, download
- **Meetings** — Schedule, RSVP, attendee tracking
- **Chat** — Per-project real-time rooms via Socket.io
- **Performance** — System scores, leader/supervisor evaluations, multi-lens averages
- **Notifications** — Per-user feed
- **Activities** — Project-scoped activity log with TTL index

## Quick Start

### 1. Install dependencies

```bash
# From repo root
npm run start:install

# Or just Backend
cd Backend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `Backend/.env` — at minimum set:

```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ezproject
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

See [docs/16_Environment_Configuration.md](../docs/16_Environment_Configuration.md) for all variables.

### 3. Run

```bash
# Dev — auto-restarts on file changes
npm run dev

# Production
npm start
```

Server listens on `PORT` (default `3000`).

### 4. Seed demo data (optional)

```bash
npm run seed        # 5 demo users + 2 projects
npm run seed:admin  # create admin account
```

## Project Structure

```
Backend/
├── server.js                 # Bootstrap: DB connect → HTTP + Socket.io
├── app.js                    # Express app — middleware + route mounting
│
├── config/
│   ├── index.js             # Loads .env, exports typed env vars
│   └── database.js           # Mongoose connection + event handlers
│
├── models/                   # Mongoose schemas
│   ├── User.js              # id, name, email, password, avatar, role
│   ├── Project.js           # name, description, members[], timestamps
│   ├── Task.js              # title, status, assignee, deadline, comments[]
│   ├── SubTask.js
│   ├── Document.js          # title, url, folderId, uploadedBy
│   ├── Folder.js            # name, parentId, projectId
│   ├── Meeting.js           # title, startTime, endTime, attendees[]
│   ├── Invitation.js        # projectId, inviteeId, role, status
│   ├── Notification.js       # userId, message, read, createdAt (TTL)
│   ├── Performance.js        # memberId, projectId, score breakdown
│   ├── Evaluation.js         # evaluatorId, evaluateeId, totalScore, criteria
│   ├── Message.js           # projectId, senderId, content, attachments[]
│   └── Activity.js          # projectId, actorId, action, metadata, createdAt (TTL)
│
├── controllers/             # Request handlers — business logic lives here
│   ├── authController.js
│   ├── projectController.js
│   ├── taskController.js
│   ├── documentController.js
│   ├── meetingController.js
│   ├── memberController.js
│   ├── invitationController.js
│   ├── performanceController.js
│   ├── evaluationController.js
│   ├── notificationController.js
│   ├── activityController.js
│   └── chatController.js
│
├── routes/                  # Express routers (one file per resource)
│   ├── auth.js
│   ├── projects.js
│   ├── tasks.js
│   ├── documents.js
│   ├── meetings.js
│   ├── members.js
│   ├── invitations.js
│   ├── performance.js
│   ├── notifications.js
│   ├── activities.js
│   └── chat.js
│
├── middlewares/
│   ├── auth.js              # JWT verify + role guard
│   ├── errorHandler.js      # Global error wrapper
│   ├── rateLimit.js         # Per-route rate limiters
│   └── upload.js            # Multer + Cloudinary storage
│
├── validators/              # Zod schemas for request validation
│   ├── auth.validator.js
│   ├── project.validator.js
│   ├── task.validator.js
│   └── ...
│
├── services/
│   └── emailService.js      # Resend / nodemailer transactional email
│
├── socket.js                # Socket.io — rooms, auth, event handlers
│
├── utils/
│   └── fileStorage.js        # Cloudinary upload helpers
│
├── seed/
│   ├── seed.js              # Demo data (users + projects)
│   └── seedAdmin.js         # Admin account seeder
│
├── scripts/
│   └── migrate-document-size.js
│
└── package.json
```

## API Reference

All routes are prefixed with `/api/v1`. Protected routes require:

```
Authorization: Bearer <access_token>
```

Access tokens expire after **15 minutes**. Refresh via `POST /api/v1/auth/refresh`.

### Endpoints

| Module | Base path |
|---|---|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Projects | `/api/v1/projects` |
| Tasks | `/api/v1/projects/:id/tasks` |
| Documents | `/api/v1/projects/:id/documents` |
| Meetings | `/api/v1/projects/:id/meetings` |
| Members | `/api/v1/projects/:id/members` |
| Invitations | `/api/v1/projects/:id/invitations` |
| Performance | `/api/v1/projects/:id/performance` |
| Notifications | `/api/v1/notifications` |
| Activities | `/api/v1/projects/:id/activities` |
| Chat | `/api/v1/projects/:id/chat` |

Full reference: [docs/09_API_Documentation.md](../docs/09_API_Documentation.md).

## Socket.io Events

See [docs/11_Realtime_Socket_Design.md](../docs/11_Realtime_Socket_Design.md).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `CORS_ORIGIN` | Yes | Allowed frontend origin |
| `FRONTEND_URL` | Yes | Used in email links |
| `PORT` | No | HTTP port (default `3000`) |
| `NODE_ENV` | No | `development` / `production` |
| `CLOUDINARY_CLOUD_NAME` | No | Cloud upload |
| `CLOUDINARY_API_KEY` | No | Cloud upload |
| `CLOUDINARY_API_SECRET` | No | Cloud upload |
| `SMTP_HOST` | No | Email sending |
| `SMTP_PORT` | No | Email sending |
| `SMTP_USER` | No | Email sending |
| `SMTP_PASS` | No | Email sending |
| `GEMINI_API_KEY` | No | AI task suggestions |

Full details: [docs/16_Environment_Configuration.md](../docs/16_Environment_Configuration.md).

## Deployment

Configured via [`render.yaml`](../render.yaml) in the repo root. Render detects the Dockerfile and builds automatically on push to `master`.

Required secrets on Render dashboard:

- `MONGO_URI`
- `CORS_ORIGIN` (set to the Vercel frontend URL after deployment)
- `FRONTEND_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

See [docs/15_Deployment_Guide.md](../docs/15_Deployment_Guide.md) for step-by-step instructions.

## License

See root [`README.md`](../README.md).
