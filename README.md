# 🚀 Fullstack Todo & REST Inspector (.NET 9 + Next.js + PostgreSQL)

[![.NET 9](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, production-structured fullstack application designed as a **learning bridge from TypeScript to C# and ASP.NET Core**. 

It demonstrates **all 5 primary HTTP REST operations** (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with an interactive **Live HTTP Inspector UI**, containerized into a turnkey **3-tier Docker Compose environment**.

---

## 🌟 Key Features

- **All 5 HTTP REST Methods**:
  - `GET /api/todos`: Fetch all tasks (supports query parameter filtering: `?isCompleted=true`)
  - `GET /api/todos/{id}`: Fetch single task by ID (returns `200 OK` or `404 Not Found`)
  - `POST /api/todos`: Create a new task (returns `201 Created` with `Location` header)
  - `PUT /api/todos/{id}`: Full update (replaces task title & status, returns `204 No Content`)
  - `PATCH /api/todos/{id}`: Partial update (toggles completion state without overwriting title)
  - `DELETE /api/todos/{id}`: Delete task from PostgreSQL (returns `204 No Content`)
- **Live HTTP Inspector**: Real-time telemetry log on the UI showing the HTTP method badge, status code, request body, and response payload for every action.
- **Auto-Database Migrations**: Entity Framework Core automatically detects and applies pending database migrations on startup when running in Docker.
- **Zero CORS Issues**: Next.js reverse proxy rewrites seamlessly route client requests to the ASP.NET Core container.
- **Multi-Stage Docker Builds**: Lean, optimized images using multi-stage builds (SDK compile stage ➔ lean runtime stage).

---

## 🏗️ System Architecture

```text
       ┌──────────────────────────────────────────┐
       │             User's Browser               │
       └────────────────────┬─────────────────────┘
                            │ http://localhost:3000
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                    │
│                                                              │
│  ┌────────────────────┐            ┌──────────────────────┐  │
│  │   Next.js 16 UI    │  rewrites  │ ASP.NET Core Web API │  │
│  │   (Port 3000)      ├───────────►│ (Internal Port 8080) │  │
│  │   [todo_frontend]  │            │ [todo_backend]       │  │
│  └────────────────────┘            └──────────┬───────────┘  │
│                                               │ EF Core      │
│                                               ▼              │
│                                    ┌──────────────────────┐  │
│                                    │  PostgreSQL 16 DB    │  │
│                                    │  (Port 5434:5432)    │  │
│                                    │  [todo_postgres]     │  │
│                                    └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/simple-fullstack-with-c.git
cd simple-fullstack-with-c
```

### 2. Launch the entire stack
Run this single command from the project root:

```bash
docker compose up -d --build
```

Docker will:
1. Spin up the PostgreSQL database container.
2. Build the multi-stage C# Web API image and apply database migrations automatically.
3. Build the Next.js standalone container.

### 3. Open the Application
- **Frontend & Live Inspector**: [http://localhost:3000](http://localhost:3000)
- **Direct Backend API**: [http://localhost:5000/api/todos](http://localhost:5000/api/todos)
- **PostgreSQL Database**: `localhost:5434` (User: `postgres`, Password: `postgrespassword`, DB: `tododb`)

### Stop the services
```bash
docker compose down
```
*(Add `-v` if you also want to erase the database volume: `docker compose down -v`)*

---

## 🧠 TypeScript to C# Developer's Guide

If you come from a TypeScript/Node/Express/NestJS/Prisma background, here is how the concepts map directly to C#/.NET:

| Concept | TypeScript / Node | C# / .NET 9 | How it Works |
| :--- | :--- | :--- | :--- |
| **Project Config** | `package.json` & `tsconfig.json` | `TodoApi.csproj` | Defines runtime version, dependencies (`<PackageReference>`), and compiler settings. |
| **Null Safety** | `string \| null` | `string?` | Enabled via `<Nullable>enable</Nullable>`. Non-nullable strings cannot be null. |
| **Data Types** | `type CreateDto = { title: string }` | `public record CreateTodoDto(string Title);` | C# `record` types are lightweight, immutable data containers with built-in value equality. |
| **App Entrypoint** | `server.ts` or `app.ts` | `Program.cs` | Registers services into the Dependency Injection container and configures middleware. |
| **ORM** | Prisma / TypeORM | Entity Framework Core (EF Core) | Code-First database modeling with migrations and LINQ query syntax. |
| **DB Session** | `prisma.todo.findMany()` | `await context.Todos.ToListAsync()` | Managed through an `AppDbContext` with a **Scoped** lifecycle (per-request). |
| **Decorators / Routing** | NestJS `@Controller()`, `@Get()` | Attributes `[ApiController]`, `[HttpGet]` | C# attributes declare routing and HTTP semantics. |
| **Responses** | `res.status(201).json(data)` | `CreatedAtAction(...)` | Strongly-typed `ActionResult` return types with standard HTTP status helpers. |

---

## 📡 REST API Reference

All routes are prefixed with `/api/todos`:

| Method | Endpoint | Description | Request Body | Success Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/todos` | List all todos | _None_ | `200 OK` |
| `GET` | `/api/todos?isCompleted=true` | Filter by completion status | _None_ | `200 OK` |
| `GET` | `/api/todos/{id}` | Get single todo by ID | _None_ | `200 OK` (or `404`) |
| `POST` | `/api/todos` | Create a new todo | `{"title": "Task name"}` | `201 Created` |
| `PUT` | `/api/todos/{id}` | Replace/Update whole todo | `{"title": "Updated", "isCompleted": true}` | `204 No Content` |
| `PATCH`| `/api/todos/{id}` | Partial update (toggle status) | `{"isCompleted": true}` | `200 OK` |
| `DELETE`| `/api/todos/{id}` | Delete a todo | _None_ | `204 No Content` |

### Testing with `.http` File
A preconfigured [TodoApi.http](file:///c:/Users/callo/Documents/project/simple-fullstack-with-c#/backend/TodoApi.http) file is included in `backend/`. If you use Visual Studio Code with the REST Client extension or Visual Studio / Antigravity IDE, you can click "Send Request" to test any endpoint directly.

---

## 📂 Project Structure

```text
simple-fullstack-with-c#/
├── docker-compose.yml          # Orchestrates PostgreSQL, C# Backend, and Next.js Frontend
├── .gitignore                  # Excludes build artifacts, .next, node_modules, and bin/obj
├── README.md                   # This documentation
│
├── backend/                    # ASP.NET Core 9 Web API
│   ├── Controllers/
│   │   └── TodosController.cs  # All 5 HTTP methods (GET, POST, PUT, PATCH, DELETE)
│   ├── Data/
│   │   └── AppDbContext.cs     # EF Core DbContext connecting to PostgreSQL
│   ├── DTOs/
│   │   └── TodoDtos.cs         # C# record DTOs for request/response payloads
│   ├── Migrations/             # EF Core Code-First database migrations
│   ├── Models/
│   │   └── Todo.cs             # Todo Entity model
│   ├── Dockerfile              # Multi-stage build (SDK -> ASP.NET Runtime)
│   ├── Program.cs              # DI configuration, CORS, and auto-migration on boot
│   ├── TodoApi.csproj          # NuGet dependencies and project metadata
│   ├── TodoApi.http            # HTTP request test collection
│   └── appsettings.json        # Database connection strings and logging config
│
└── frontend/                   # Next.js 16 App Router (TypeScript)
    ├── src/app/
    │   ├── page.tsx            # Interactive Todo UI + Live HTTP Inspector Console
    │   ├── layout.tsx          # Root layout
    │   └── globals.css         # Tailwind CSS styling
    ├── Dockerfile              # Multi-stage Next.js standalone runner
    ├── next.config.ts          # Rewrites proxying /api/* to the C# backend container
    ├── package.json            # Node dependencies
    └── tsconfig.json           # TypeScript configuration
```

---

## 🛠️ Local Development (Without Docker)

If you prefer running services directly on your host machine:

### 1. Start PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Run C# Backend
```bash
cd backend
dotnet run
```
*API runs at `http://localhost:5000` (or `https://localhost:5001`).*

### 3. Run Next.js Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*App runs at `http://localhost:3000`.*

---

## 🤝 Contributing & Feedback
Contributions, issues, and feature requests are welcome! Feel free to check the issues page or share this template with fellow developers transitioning between TypeScript and C#.
