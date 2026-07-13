# Bootcamp API

Backend REST API for the Bootcamp platform, built with NestJS, Prisma 7, and PostgreSQL (Supabase).

## Tech Stack

- **NestJS** — server framework
- **Prisma 7** — ORM and migrations
- **PostgreSQL** — database (Supabase)
- **JWT** — authentication
- **bcrypt** — password hashing

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project (free tier works)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd bootcamp-api
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set the following:

```env
# Direct connection — used for migrations (Session Mode, port 5432)
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"

# Pooled connection — used by the app at runtime (Transaction Mode, port 6543)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"

JWT_SECRET="your-random-secret"
JWT_EXPIRES_IN="7d"
PORT=8000
APP_URL="http://localhost:8000"
FRONTEND_ORIGINS="http://localhost:3000"
```

You can find both connection strings in your Supabase dashboard under **Project Settings → Database → Connection string**.

or use sqlLite

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Seed the database

```bash
npx prisma db seed
```

This creates:
- 5 categories, 10 topics, 12 instructors
- 30 courses with schedules
- A demo user: `demo@bootcamp.dev` / `Demo1234!`

### 5. Start the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:8000/api`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Start compiled build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npx prisma migrate dev` | Apply schema migrations |
| `npx prisma db seed` | Seed the database |
| `npx prisma studio` | Open Prisma Studio (DB browser) |

## Project Structure

```
src/
├── auth/          # JWT authentication (register, login)
├── catalog/       # Categories and topics
├── courses/       # Courses, schedules, reviews
├── enrollments/   # User enrollments
├── users/         # User profile
├── prisma/        # PrismaService
└── common/        # Shared filters and utilities
prisma/
├── schema.prisma  # Database schema
├── seed.ts        # Database seeder
└── migrations/    # Migration history
```

## Authentication

The API uses JWT Bearer tokens. After registering or logging in, include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```
