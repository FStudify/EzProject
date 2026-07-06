# EZProject

> **Unified workspace platform for student teams** — manage projects, tasks, documents, meetings, chat, and member performance in a single collaborative app.

EZProject helps student teams run a project end-to-end: from planning tasks and assigning members, to chatting in real time, sharing documents, scheduling meetings, and tracking each member's performance. It's a full-stack monorepo with a React frontend, an Express + MongoDB backend, and a Socket.io real-time layer.

---

## Table of Contents

- [Highlights](#highlights)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Highlights

- **Authentication** — JWT (access + refresh), Google OAuth, role-based access (`admin`, `leader`, `vice-leader`, `member`).
- **Projects & Tasks** — Kanban-style task board, comments, hashtags, AI-generated task suggestions, vice-leader permissions.
- **Documents** — Upload files (PDF, DOCX, images) to Cloudinary, organize into folders.
- **Meetings** — Schedule meetings, RSVP, attendee tracking.
- **Real-time Chat** — Per-project chat rooms via Socket.io.
- **Performance Tracking** — Member evaluations per project.
- **Notifications** — Per-user notification feed and email (Resend).
- **i18n** — Custom Vietnamese / English dictionary.
- **Activity Feed** — Project-scoped activity log.
- **Security** — Helmet, CORS, rate limiting, Zod validation, file-type sniffing.

---

## Tech Stack

### Frontend (`Frontend/`)

| Layer            | Technology                             |
|------------------|----------------------------------------|
| Framework        | **React 19** + **Vite 7**              |
| Language         | **TypeScript 5.9**                     |
| Styling          | **Tailwind CSS 4**                     |
| Routing          | React Router 7                          |
| Real-time        | Socket.io Client 4.8                    |
| Markdown / Files | `react-markdown`, `remark-gfm`, `pdfjs-dist`, `docx-preview` |
| Icons            | `lucide-react`                          |
| Lint             | ESLint 9                               |

### Backend (`Backend/`)

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Runtime          | **Node.js 20**                      |
| Framework        | **Express 4.21**                    |
| Database         | **MongoDB Atlas** via Mongoose 8.9   |
| Real-time        | Socket.io 4.8                        |
| Auth             | JWT (`jsonwebtoken`), Passport + Google OAuth |
| Validation       | **Zod**                              |
| File Storage     | Cloudinary (`multer-storage-cloudinary`) |
| Email            | Resend                                |
| AI               | Google Generative AI                  |
| Security         | `helmet`, `express-rate-limit`, `bcrypt` |

### Infra

- **Frontend** deployed to **Vercel** (`Frontend/vercel.json`).
- **Backend** deployed to **Render** (`render.yaml`, Docker).
- **MongoDB** hosted on **MongoDB Atlas** (free M0 cluster).

---

## Repository Structure

```
EzProject/
├── Frontend/                       # React 19 + Vite + TS + Tailwind
│   ├── src/
│   │   ├── api/                    # Centralized API layer (config, endpoints, *.api.ts)
│   │   ├── contexts/               # Auth, Theme, Language, ChatSocket, Sidebar
│   │   ├── components/             # Shared UI (ui/) + layout (layout/)
│   │   ├── features/               # Feature modules (auth, dashboard, projects, tasks, chat, ...)
│   │   ├── i18n/                   # Custom VI/EN dictionary
│   │   ├── mocks/                  # Mock data fallback (dev only)
│   │   └── services/               # projectService, taskService
│   ├── public/                     # Static assets (logos, icons)
│   ├── vercel.json                 # Vercel routing config
│   └── package.json
│
├── Backend/                        # Express.js + Mongoose + Socket.io
│   ├── server.js                   # Entry: HTTP + Socket.io bootstrap
│   ├── app.js                      # Express config (middleware, routes)
│   ├── config/                     # index.js (env), database.js, upload.config.js
│   ├── models/                     # 11 Mongoose models
│   ├── controllers/                # Business logic handlers
│   ├── routes/                     # 14 route files
│   ├── middlewares/                # auth, errorHandler, rateLimit, upload
│   ├── services/                   # emailService
│   ├── socket.js                   # Socket.io server
│   ├── utils/                      # fileStorage
│   ├── validators/                 # Zod schemas
│   ├── seed/                       # seed.js, seedAdmin.js
│   ├── scripts/                    # migrate-document-size.js
│   └── package.json
│
├── docs/                           # Full project documentation
│   ├── 01_Project_Overview.md
│   ├── 02_System_Architecture.md
│   ├── 03_Technology_Stack.md
│   ├── 04_Functional_Requirements.md
│   ├── 05_Non_Functional_Requirements.md
│   ├── 06_User_Roles_Permissions.md
│   ├── 07_Business_Rules.md
│   ├── 08_Use_Case_Specification.md
│   ├── 09_API_Documentation.md
│   ├── 10_Database_Design.md
│   ├── 11_Realtime_Socket_Design.md
│   ├── 12_State_Flow_Diagram.md
│   ├── 13_Frontend_Architecture.md
│   ├── 14_Backend_Architecture.md
│   ├── 15_Deployment_Guide.md
│   ├── 16_Environment_Configuration.md
│   ├── 17_Testing_Strategy.md
│   ├── 18_Development_Guidelines.md
│   ├── 19_ENVIRONMENT_GUIDE.md
│   └── 20_DESIGN_SYSTEM.md
│
├── gundsetupdeploy.ps1             # Helper script for .env management
├── package.json                    # Root: concurrently runs both services
├── package-lock.json
├── render.yaml                     # Render infrastructure-as-code
└── README.md
```

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **MongoDB** — either a local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.
- **npm 10+**

### One-command dev (recommended)

From the repository root:

```bash
npm run start:install   # install deps for root + Backend + Frontend
npm run dev             # runs Backend (port 3000) + Frontend (port 5173) concurrently
```

Then open <http://localhost:5173>.

| Command                          | What it does                                              |
|----------------------------------|-----------------------------------------------------------|
| `npm run dev`                    | Run Backend + Frontend together                            |
| `npm run dev:backend-only`       | Run only Backend (port 3000)                               |
| `npm run dev:frontend-only`      | Run only Frontend (port 5173)                              |
| `npm run build`                  | Build Frontend for production                              |
| `npm run type-check`             | TypeScript check on Frontend                               |
| `npm run seed`                   | Seed demo data (5 users + 2 projects)                      |
| `npm run seed:admin`             | Seed an admin account                                      |
| `npm run start:install`          | Install deps for root + Backend + Frontend                 |

### Separate terminals (alternative)

```bash
# Terminal 1
cd Backend && npm install && npm run dev

# Terminal 2
cd Frontend && npm install && npm run dev
```

---

## Environment Configuration

The project uses **25 environment variables** (24 Backend + 1 Frontend). All example values are committed in `.env.example` — only secrets need to be generated.

### Initialize `.env` files (Windows / PowerShell)

```powershell
.\gundsetupdeploy.ps1 -Mode init       # copy .env.example -> .env for Backend + Frontend
.\gundsetupdeploy.ps1 -Mode validate   # verify required keys are set
```

Then edit:

- `Backend/.env` — fill `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL` (required). `CLOUDINARY_*` and `SMTP_*` can be empty if unused.
- `Frontend/.env` — set `VITE_API_URL=http://localhost:3000/api/v1`.

### Generate secrets

```bash
openssl rand -base64 32
```

### Required keys

| Service   | Variable             | Where to get it                                      |
|-----------|----------------------|------------------------------------------------------|
| Backend   | `MONGO_URI`          | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — free M0 cluster |
| Backend   | `JWT_SECRET`         | `openssl rand -base64 32` or Render "Generate Value" |
| Backend   | `JWT_REFRESH_SECRET` | same as above                                        |
| Backend   | `CORS_ORIGIN`        | Frontend URL (e.g. `http://localhost:5173`)          |
| Backend   | `FRONTEND_URL`       | Frontend URL                                         |
| Frontend  | `VITE_API_URL`       | Backend URL + `/api/v1`                              |

### Optional services

| Service     | Variables                                            | Notes                          |
|-------------|------------------------------------------------------|--------------------------------|
| Cloudinary  | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads (free 25 GB) |
| Resend SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`    | Transactional email (100/day free) |
| Google AI   | `GEMINI_API_KEY`                                     | AI task suggestion             |

> **Full details**, troubleshooting 8 common errors, and security checklist: see [`docs/16_Environment_Configuration.md`](docs/16_Environment_Configuration.md) and [`docs/19_ENVIRONMENT_GUIDE.md`](docs/19_ENVIRONMENT_GUIDE.md).

---

## Deployment

| Component | Platform | Config file          |
|-----------|----------|----------------------|
| Backend   | Render   | `render.yaml` (Docker) |
| Frontend  | Vercel   | `Frontend/vercel.json` |
| Database  | MongoDB Atlas | Atlas dashboard  |

Workflow:

1. Push to GitHub (`master` branch).
2. **Render** auto-detects `render.yaml` and builds the Backend Docker image. Set `MONGO_URI`, `CORS_ORIGIN`, `FRONTEND_URL` in the Render dashboard.
3. **Vercel** imports the `Frontend/` folder. Set `VITE_API_URL` to the Render backend URL.
4. Update `CORS_ORIGIN` and `FRONTEND_URL` on Render to match the Vercel URL.

> Step-by-step guide with screenshots: [`docs/15_Deployment_Guide.md`](docs/15_Deployment_Guide.md).

---

## Documentation

The full documentation set lives in [`docs/`](docs/). Start with the overview:

| #   | Document                                       | Contents                                  |
|-----|------------------------------------------------|-------------------------------------------|
| 01  | [Project Overview](docs/01_Project_Overview.md) | Team, problem, solution, scope, KPIs     |
| 02  | [System Architecture](docs/02_System_Architecture.md) | Frontend, Backend, MongoDB, Render + Vercel, Socket.io |
| 03  | [Technology Stack](docs/03_Technology_Stack.md) | Stack and versions                        |
| 04  | [Functional Requirements](docs/04_Functional_Requirements.md) | Module-by-module specs                    |
| 05  | [Non-Functional Requirements](docs/05_Non_Functional_Requirements.md) | Performance, security, rate limits       |
| 06  | [User Roles & Permissions](docs/06_User_Roles_Permissions.md) | `admin`, `leader`, `vice-leader`, `member` |
| 07  | [Business Rules](docs/07_Business_Rules.md)   | Invariants and validation rules           |
| 08  | [Use Case Specification](docs/08_Use_Case_Specification.md) | Actors and flows                          |
| 09  | [API Documentation](docs/09_API_Documentation.md) | 40+ endpoints, request/response, errors |
| 10  | [Database Design](docs/10_Database_Design.md) | MongoDB collections, ERD, TTL indexes    |
| 11  | [Realtime Socket Design](docs/11_Realtime_Socket_Design.md) | Socket.io rooms, events, auth            |
| 12  | [State Flow Diagram](docs/12_State_Flow_Diagram.md) | UI state machines                        |
| 13  | [Frontend Architecture](docs/13_Frontend_Architecture.md) | React app structure, contexts, API layer |
| 14  | [Backend Architecture](docs/14_Backend_Architecture.md) | Express layers, middleware, services     |
| 15  | [Deployment Guide](docs/15_Deployment_Guide.md) | MongoDB Atlas + Render + Vercel          |
| 16  | [Environment Configuration](docs/16_Environment_Configuration.md) | All env vars in detail                    |
| 17  | [Testing Strategy](docs/17_Testing_Strategy.md) | Test pyramid and tooling                  |
| 18  | [Development Guidelines](docs/18_Development_Guidelines.md) | Naming, Git flow, PR rules               |
| 19  | [Environment Guide](docs/19_ENVIRONMENT_GUIDE.md) | Troubleshooting + security checklist      |
| 20  | [Design System](docs/20_DESIGN_SYSTEM.md)     | Colors, typography, components            |

---

## API Overview

All endpoints are prefixed with `/api/v1`. Authentication uses `Authorization: Bearer <access_token>` (15-minute TTL, refresh via `/auth/refresh`).

| Module        | Base path                                  |
|---------------|--------------------------------------------|
| Auth          | `/api/v1/auth`                             |
| Users         | `/api/v1/users`                            |
| Projects      | `/api/v1/projects`                         |
| Tasks         | `/api/v1/projects/:id/tasks`               |
| Documents     | `/api/v1/projects/:id/documents`           |
| Meetings      | `/api/v1/projects/:id/meetings`            |
| Chat          | `/api/v1/projects/:id/chat`                |
| Members       | `/api/v1/projects/:id/members`             |
| Performance   | `/api/v1/projects/:id/performance`         |
| Activities    | `/api/v1/projects/:id/activities`          |

See [`docs/09_API_Documentation.md`](docs/09_API_Documentation.md) for the full reference.

---

## Contributing

1. Read [`docs/18_Development_Guidelines.md`](docs/18_Development_Guidelines.md) for the Git flow, branch naming, and PR conventions.
2. Use feature branches: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`.
3. Run `npm run type-check` and `npm run build` before opening a PR.
4. Make sure backend boots cleanly: `cd Backend && npm run dev`.

---

## License

This project is private / unlicensed. All rights reserved by the EZProject team.