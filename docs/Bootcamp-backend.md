# Bootcamp Backend — Design Spec
**Date:** 2026-06-18
**Stack:** NestJS + TypeScript + Prisma + PostgreSQL + JWT

---

## Overview

A REST API backend for the `mosikkaa/Bootcamp` Next.js frontend. The frontend is already live on Vercel (`bootcamp-fawn-psi.vercel.app`). The backend runs locally on `http://localhost:8000/api` for now. The API contract is defined in `BACKEND_REBUILD.md` — that document is the source of truth for all endpoint shapes.

---

## Stack

| Concern | Choice |
|---|---|
| Language | TypeScript (Node.js 20+) |
| Framework | NestJS |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (`@nestjs/jwt` + Passport) |
| Validation | `class-validator` + custom 422 filter |
| File uploads | Multer (`FileInterceptor`) |
| Passwords | bcrypt |

---

## Project Layout

```
bootcamp-api/
  src/
    main.ts                             # bootstrap, CORS, ValidationPipe, static assets
    app.module.ts
    prisma/
      prisma.service.ts                 # injectable PrismaClient wrapper (global module)
    common/
      validation-exception.filter.ts   # 422 { errors: { field: [msg] } }
      serialize-user.ts                 # shared serializeUser() helper
    auth/
      auth.module.ts
      auth.controller.ts                # POST /register /login /logout  GET /me
      auth.service.ts
      jwt.strategy.ts
      jwt-auth.guard.ts
      optional-jwt-auth.guard.ts        # for GET /courses/:id (guest-ok)
      dto/register.dto.ts
      dto/login.dto.ts
    users/
      users.module.ts
      users.controller.ts               # PUT /profile
      users.service.ts
      dto/update-profile.dto.ts
    catalog/
      catalog.module.ts
      catalog.controller.ts             # GET /categories /topics /instructors
      catalog.service.ts
    courses/
      courses.module.ts
      courses.controller.ts             # GET /courses /courses/featured /courses/:id
                                        # GET /courses/:id/weekly-schedules /time-slots /session-types
                                        # POST /courses/:id/reviews
      courses.service.ts
      dto/course-filters.dto.ts
      dto/create-review.dto.ts
    enrollments/
      enrollments.module.ts
      enrollments.controller.ts         # POST /enrollments  GET /enrollments
                                        # PATCH /enrollments/:id/complete  DELETE /enrollments/:id
      enrollments.service.ts
      dto/create-enrollment.dto.ts
  prisma/
    schema.prisma
    seed.ts                             # triple-rich dataset
  uploads/                              # avatar storage (gitignored)
  .env
```

---

## Response Envelope Strategy (Approach B — Manual)

No global interceptor. Each controller method returns the exact shape the frontend expects, explicitly. This makes every route immediately auditable against the contract.

| Route group | Shape |
|---|---|
| `/categories`, `/topics`, `/instructors`, `/courses/featured` | bare array `[...]` |
| `/courses` | `{ data: [...], meta: { currentPage, lastPage, total } }` |
| `/logout`, `DELETE /enrollments/:id`, `POST /courses/:id/reviews` | `{ message: "..." }` |
| Everything else | `{ data: ... }` |

---

## Database Schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db   { provider = "postgresql"; url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }

model User {
  id           Int          @id @default(autoincrement())
  username     String       @unique
  email        String       @unique
  password     String
  fullName     String?
  mobileNumber String?      // stored with +995 prefix
  age          Int?
  avatar       String?      // absolute URL
  enrollments  Enrollment[]
  reviews      Review[]
  createdAt    DateTime     @default(now())
}

model Category {
  id      Int      @id @default(autoincrement())
  name    String
  icon    String   // slug: development|design|business|marketing|data-science
  topics  Topic[]
  courses Course[]
}

model Topic {
  id         Int      @id @default(autoincrement())
  name       String
  categoryId Int
  category   Category @relation(fields: [categoryId], references: [id])
}

model Instructor {
  id      Int      @id @default(autoincrement())
  name    String
  avatar  String
  courses Course[]
}

model Course {
  id            Int              @id @default(autoincrement())
  title         String
  description   String
  image         String?
  basePrice     Decimal          @db.Decimal(8,2)
  durationWeeks Int
  hours         Int
  isFeatured    Boolean          @default(false)
  categoryId    Int
  instructorId  Int
  category      Category         @relation(fields: [categoryId], references: [id])
  instructor    Instructor       @relation(fields: [instructorId], references: [id])
  schedules     CourseSchedule[]
  reviews       Review[]
  createdAt     DateTime         @default(now())
}

enum SessionType { online in_person hybrid }

model CourseSchedule {
  id               Int         @id @default(autoincrement())
  courseId         Int
  weeklyScheduleId Int         // 1=Mon-Wed 2=Tue-Thu 3=Fri-Sat 4=Weekend
  timeSlotId       Int         // 1=Morning 2=Afternoon 3=Evening
  sessionType      SessionType
  priceModifier    Decimal     @db.Decimal(8,2) @default(0)
  totalSeats       Int
  location         String?
  course           Course      @relation(fields: [courseId], references: [id])
  enrollments      Enrollment[]
}

model Enrollment {
  id               Int            @id @default(autoincrement())
  userId           Int
  courseId         Int
  courseScheduleId Int
  progress         Int            @default(0)
  completedAt      DateTime?
  user             User           @relation(fields: [userId], references: [id])
  schedule         CourseSchedule @relation(fields: [courseScheduleId], references: [id])
  createdAt        DateTime       @default(now())
}

model Review {
  id       Int    @id @default(autoincrement())
  userId   Int
  courseId Int
  rating   Int
  user     User   @relation(fields: [userId], references: [id])
  course   Course @relation(fields: [courseId], references: [id])
  @@unique([userId, courseId])
}
```

---

## Fixed Lookup Maps (baked into service code, never stored in DB)

```ts
const WEEKLY_SCHEDULE_MAP = {
  1: { label: 'Mon - Wed',  days: ['Monday',   'Wednesday'] },
  2: { label: 'Tue - Thu',  days: ['Tuesday',  'Thursday']  },
  3: { label: 'Fri - Sat',  days: ['Friday',   'Saturday']  },
  4: { label: 'Sat - Sun',  days: ['Saturday', 'Sunday']    },
};

const TIME_SLOT_MAP = {
  1: { label: '(9:00 AM - 11:00 AM)',  startTime: '09:00', endTime: '11:00', display12h: '9:00 AM - 11:00 AM'  },
  2: { label: '(2:00 PM - 4:00 PM)',   startTime: '14:00', endTime: '16:00', display12h: '2:00 PM - 4:00 PM'   },
  3: { label: '(6:00 PM - 8:00 PM)',   startTime: '18:00', endTime: '20:00', display12h: '6:00 PM - 8:00 PM'   },
};
```

---

## Seed Dataset (Triple-Rich)

| Entity | Count | Notes |
|---|---|---|
| Categories | 5 | Exact icon slugs required |
| Topics | 30 | ~6 per category |
| Instructors | 12 | Avatar URLs via `ui-avatars.com` |
| Courses | 30 | 6 per category, 12 `isFeatured`, prices $99–$899 |
| CourseSchedules | ~120 | 3–5 per course across weekly/time/session combos |
| Near-zero seats | 3 courses | `totalSeats = 2` to trigger "Only 2 seats remaining" |

---

## Auth

- **Register:** `multipart/form-data` → validate → bcrypt hash → save user → save avatar → sign JWT → `{ data: { token, user } }`
- **Login:** JSON → find by email → bcrypt compare → sign JWT → `{ data: { token, user } }`
- **Logout:** stateless → `{ message: 'Logged out' }`
- **Me:** `JwtAuthGuard` → `{ data: serializeUser(user) }`
- JWT payload: `{ sub: userId }`. Secret + expiry from `.env`.

**serializeUser shape:**
```ts
{
  id, username, email, fullName, mobileNumber, age, avatar,
  profileComplete: Boolean(fullName && mobileNumber && age)
}
```

---

## Error Handling

| Scenario | HTTP | Body |
|---|---|---|
| Validation failure | 422 | `{ errors: { field: ["msg"] } }` |
| Bad credentials | 401 | `{ message: "Invalid credentials" }` |
| Schedule conflict | 409 | `{ message: "Schedule conflict", conflicts: [...] }` |
| Fully booked | 400 | `{ message: "No seats available" }` |
| Not found | 404 | `{ message: "Not found" }` |
| Unauthorized | 401 | Passport default |

---

## Enrollment Business Logic

```
POST /enrollments (force = false):
  1. Find CourseSchedule → 404 if missing
  2. availableSeats = totalSeats − count(enrollments for this schedule)
     → 400 if availableSeats <= 0
  3. Conflict check: user's other enrollments with same weeklyScheduleId + timeSlotId
     → 409 with conflicts array if any found
  4. Create enrollment → { data: serializeEnrollment(enrollment) }

POST /enrollments (force = true):
  Skip step 3 → seat check → create
```

Conflict message format: `"Monday - Wednesday at (9:00 AM - 11:00 AM)"`

---

## Enrollment Response Shape

```ts
{
  id, progress, completedAt,
  course: { id, title, image, avgRating, instructor: { name } },
  schedule: {
    weeklySchedule: { label: "Mon - Wed" },
    timeSlot: { label: "(9:00 AM - 11:00 AM)" },
    sessionType: { name: "in_person" },
    location: "Tbilisi Hub" | null
  }
}
```

Assembled by `EnrollmentsService.serializeEnrollment()` using the lookup maps.

---

## Courses

- **List:** page size 9, `avgRating`/`reviewCount` via Prisma `_avg`/`_count`, sort by `newest|price_asc|price_desc|rating`, multi-filter via Prisma `where`
- **Featured:** `isFeatured = true`, bare array
- **Detail:** `OptionalJwtAuthGuard` — reads user if token present, null for guests. Includes `isRated`, `enrollment`, `reviews: [{ rating }]`

---

## Scheduling Sub-Routes

- `GET /courses/:id/weekly-schedules` → distinct `weeklyScheduleId`s → `{ data: [{ id }] }`
- `GET /courses/:id/time-slots?weekly_schedule_id=N` → distinct `timeSlotId`s → `{ data: [{ id, startTime, endTime }] }`
- `GET /courses/:id/session-types?weekly_schedule_id=N&time_slot_id=M` → matching schedules → `{ data: [{ courseScheduleId, name, priceModifier, availableSeats, location }] }`

---

## Profile

- `PUT /profile`: `multipart/form-data`, fields `full_name`, `mobile_number`, `age`, `avatar?`
- `mobile_number` arrives as local digits, stored as `+995{digits}`
- `full_name`: 3–50 chars, letters/spaces only
- Avatar: jpeg/png/webp only, saved to `uploads/avatars/`, returned as absolute URL

---

## Environment

```env
DATABASE_URL="postgresql://postgres:<your-password>@db.<your-project-ref>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<your-password>@db.<your-project-ref>.supabase.co:5432/postgres"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=8000
APP_URL="http://localhost:8000"
FRONTEND_ORIGINS="http://localhost:3000,https://bootcamp-fawn-psi.vercel.app"
```

Database is Supabase hosted PostgreSQL. `DATABASE_URL` and `DIRECT_URL` both point to the direct connection (port 5432) — sufficient for local dev. Any `@` characters in the password must be URL-encoded as `%40`. Keep real credentials in `.env` only — never commit them.

---

## Build Order

1. Scaffold NestJS project + Prisma schema + migrate + global setup (CORS, ValidationPipe, filter)
2. Auth module (register/login/logout/me + JWT guard + optional guard) + serializeUser
3. Catalog module + seed data → verify Browse filters render
4. Courses module (list/featured/detail) → verify cards, home page, course page
5. Scheduling sub-routes → verify 3-step picker
6. Enrollments module (create + conflict + seats + list + complete + delete)
7. Reviews (`POST /courses/:id/reviews`) + Users profile (`PUT /profile`)
