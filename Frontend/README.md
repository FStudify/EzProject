# EZProject — Frontend

> React 19 + Vite 7 + TypeScript + Tailwind CSS

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS v4 |
| Routing | React Router 7 |
| Real-time | Socket.io Client 4.8 |
| Icons | lucide-react |
| PDF / DOCX | pdfjs-dist, docx-preview |
| Markdown | react-markdown + remark-gfm |
| Lint | ESLint 9 |

## Features

- **Authentication** — JWT login, Google OAuth, persistent sessions
- **Projects** — Create, manage, invite members, set roles (Leader, Vice-Leader, Supervisor, Member)
- **Tasks** — Kanban board, drag-drop columns, AI-generated suggestions, comments, hashtags, deadlines
- **Documents** — Upload PDF/DOCX/images, folder tree, preview in-page
- **Meetings** — Schedule with RSVP, attendee tracking, notes
- **Chat** — Per-project real-time rooms via Socket.io
- **Performance** — Multi-lens scoring (system / leader / supervisor / averages), ranking, heatmap
- **Notifications** — In-app feed
- **i18n** — Custom Vietnamese / English dictionary, language switcher

## Quick Start

```bash
# From the repo root — install all deps + start both services
npm run start:install
npm run dev
```

Or run the frontend alone:

```bash
cd Frontend
npm install
npm run dev       # http://localhost:5173
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | ESLint |

### Environment

Create `Frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

For production on Vercel, set `VITE_API_URL` to the deployed backend URL.

## Project Structure

```
Frontend/src/
├── api/                    # Centralized API layer — Axios config + per-feature *.api.ts
│   ├── index.ts            # Axios instance (base URL, interceptors, auth headers)
│   ├── auth.api.ts         # login, register, refresh, google callback
│   ├── project.api.ts      # CRUD projects, members, invitations
│   ├── task.api.ts         # CRUD tasks, subtasks, comments
│   ├── document.api.ts     # Upload, download, folder ops
│   ├── meeting.api.ts       # CRUD meetings, RSVP
│   ├── performance.api.ts   # Scores, evaluations, heatmap
│   └── notification.api.ts  # Fetch, mark read
│
├── components/
│   ├── ui/                 # Shared primitive components (Avatar, Badge, Button, Modal, ...)
│   │   ├── Avatar.tsx
│   │   ├── MemberAvatar.tsx
│   │   ├── ProjectMemberAvatar.tsx
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── index.ts        # Barrel export
│   │   └── ...
│   └── layout/             # App shell — Sidebar, Header, Layout
│
├── contexts/               # React contexts for global state
│   ├── AuthContext.tsx     # Current user, login/logout
│   ├── LanguageContext.tsx # VI / EN i18n
│   ├── ThemeContext.tsx    # Light / Dark mode
│   ├── ChatSocketContext.tsx  # Socket.io connection per project
│   └── SidebarContext.tsx  # Sidebar collapse state
│
├── features/               # Feature modules (each owns its own pages + sub-components)
│   ├── auth/               # Login, Register, OAuth callback
│   ├── dashboard/          # User's project list + quick stats
│   ├── projects/          # Project detail page
│   ├── tasks/             # Kanban board, task modal, AI suggestions
│   ├── documents/         # File explorer, viewer (PDF / DOCX)
│   ├── meetings/          # Meeting list + detail + scheduling modal
│   ├── chat/              # Real-time project chat
│   ├── performance/       # Performance analytics, rankings, evaluation forms
│   ├── members/           # Member management + invitations
│   ├── profile/           # User settings
│   ├── admin/             # Admin dashboard
│   └── landing/           # Public landing page
│
├── hooks/                  # Custom React hooks (useProjects, useTasks, ...)
├── services/               # Business-level service wrappers (projectService, taskService)
├── i18n/
│   └── dict.ts            # VI + EN translation dictionary
├── mocks/                  # Mock data for dev fallback (used when API is unavailable)
├── types/                  # Shared TypeScript type definitions
└── App.tsx                # Root component — router setup
```

## API Layer

All API calls go through a centralized Axios instance (`api/index.ts`) that:

- Sets `Authorization: Bearer <token>` on every request
- Attaches the current locale (`Accept-Language`)
- Handles 401 by refreshing the access token automatically
- Unpacks nested `data` response envelope

Base URL comes from `VITE_API_URL`.

## Deployment

Deployed to **Vercel**. The `vercel.json` rewrites all non-static routes to `index.html` for React Router.

```
vercel deploy                  # From the Frontend/ directory
```

Required environment variable on Vercel:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Deployed backend URL, e.g. `https://your-backend.onrender.com/api/v1` |

## i18n

Translations live in `src/i18n/dict.ts` as a flat key-value object. Switch languages via `LanguageContext`:

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { t, locale, setLocale } = useLanguage();
// t('key') returns the current-language string
// setLocale('en') or setLocale('vi')
```

## License

See root [`README.md`](../README.md).
