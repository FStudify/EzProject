# EZProject Backend

Express.js + MongoDB (Mongoose) API server.

## Quick Start

```bash
# 1. Copy env
cp .env.example .env
# Edit .env: set MONGO_URI from MongoDB Atlas

# 2. Install
npm install

# 3. Run
npm start        # production
npm run dev      # dev (with --watch)
```

## Project Structure

```
Backend/
├── app.js               # Express app setup
├── server.js            # Bootstrap — connect DB, start server
├── config/
│   ├── index.js         # Environment variables
│   └── database.js      # MongoDB connection
├── models/              # Mongoose schemas
│   ├── User.js
│   ├── Project.js
│   ├── Task.js
│   ├── Meeting.js
│   ├── Chat.js
│   ├── Document.js
│   └── Activity.js
├── middlewares/         # Custom middleware
│   ├── auth.js          # JWT verification
│   ├── errorHandler.js  # Global error handling
│   └── rateLimit.js     # Rate limiting
├── validators/          # Zod schemas
│   └── index.js
├── controllers/         # Request/Response logic
│   ├── authController.js
│   ├── userController.js
│   ├── projectController.js
│   ├── taskController.js
│   └── ...
├── routes/              # Route definitions
│   ├── auth.js
│   ├── user.js
│   ├── project.js
│   └── ...
├── public/              # Static files
├── uploads/            # Uploaded files
├── docker-compose.yml   # Local MongoDB
├── .env.example
└── package.json
```

## API Endpoints

All prefixed with `/api/v1/`.

| Module | Base Path |
|---|---|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Projects | `/api/v1/projects` |
| Tasks | `/api/v1/projects/:id/tasks` |
| Documents | `/api/v1/projects/:id/documents` |
| Meetings | `/api/v1/projects/:id/meetings` |
| Chat | `/api/v1/projects/:id/chat` |
| Members | `/api/v1/projects/:id/members` |
| Performance | `/api/v1/projects/:id/performance` |
| Activities | `/api/v1/projects/:id/activities` |

## Authentication

Protected routes require:
```
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Use `POST /api/v1/auth/refresh` with a refresh token to get a new pair.

## Environment Variables

```bash
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/ezproject
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000
CORS_ORIGIN=http://localhost:5173
```
