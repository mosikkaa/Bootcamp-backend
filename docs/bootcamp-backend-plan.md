# Bootcamp Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete NestJS REST API backend that fulfills the API contract expected by the mosikkaa/Bootcamp Next.js frontend, connected to a Supabase PostgreSQL database.

**Architecture:** NestJS modular architecture (auth, users, catalog, courses, enrollments) with Prisma ORM on Supabase PostgreSQL. Each controller returns response envelopes explicitly — no global interceptor — to match the frontend's exact expectations per-route. JWT via Passport. File uploads via Multer to local `uploads/` directory served as static assets.

**Tech Stack:** NestJS 10, TypeScript, Prisma 5, PostgreSQL (Supabase), @nestjs/jwt, @nestjs/passport, passport-jwt, bcrypt, Multer, class-validator, class-transformer, Jest, Supertest

---

## File Map

All paths are relative to `bootcamp-api/` — the NestJS project root created in Task 1 inside the repo root.

| File | Purpose |
|---|---|
| `src/main.ts` | Bootstrap: CORS, global prefix, pipes, filter, static assets |
| `src/app.module.ts` | Root module wiring all feature modules |
| `src/prisma/prisma.service.ts` | Injectable PrismaClient (global) |
| `src/prisma/prisma.module.ts` | Global module exporting PrismaService |
| `src/common/validation-exception.filter.ts` | 422 `{ errors: { field: [msg] } }` response format |
| `src/common/serialize-user.ts` | `serializeUser()` shared helper |
| `src/common/lookup-maps.ts` | `WEEKLY_SCHEDULE_MAP` and `TIME_SLOT_MAP` constants |
| `src/auth/dto/register.dto.ts` | Register field validation |
| `src/auth/dto/login.dto.ts` | Login field validation |
| `src/auth/jwt.strategy.ts` | Passport JWT strategy |
| `src/auth/jwt-auth.guard.ts` | Required JWT guard |
| `src/auth/optional-jwt-auth.guard.ts` | Optional JWT guard (guests allowed) |
| `src/auth/auth.service.ts` | register, login, me business logic |
| `src/auth/auth.controller.ts` | POST /register /login /logout  GET /me |
| `src/auth/auth.module.ts` | Auth module wiring |
| `src/users/dto/update-profile.dto.ts` | Profile update validation |
| `src/users/users.service.ts` | Profile update logic |
| `src/users/users.controller.ts` | PUT /profile |
| `src/users/users.module.ts` | Users module wiring |
| `src/catalog/catalog.service.ts` | Categories, topics, instructors DB queries |
| `src/catalog/catalog.controller.ts` | GET /categories /topics /instructors |
| `src/catalog/catalog.module.ts` | Catalog module wiring |
| `src/courses/dto/create-review.dto.ts` | Review rating validation |
| `src/courses/courses.service.ts` | Course list/featured/detail, scheduling sub-routes, review upsert |
| `src/courses/courses.controller.ts` | GET /courses /featured /:id and nested routes, POST /:id/reviews |
| `src/courses/courses.module.ts` | Courses module wiring |
| `src/enrollments/dto/create-enrollment.dto.ts` | Enrollment request validation |
| `src/enrollments/enrollments.service.ts` | Create (conflict/seat check), list, complete, delete + serialize |
| `src/enrollments/enrollments.controller.ts` | POST/GET/PATCH/DELETE /enrollments |
| `src/enrollments/enrollments.module.ts` | Enrollments module wiring |
| `prisma/schema.prisma` | Full Prisma schema (PostgreSQL + Supabase directUrl) |
| `prisma/seed.ts` | Triple-rich seed: 5 categories, 30 topics, 12 instructors, 30 courses, ~144 schedules |
| `.env` | Real credentials (gitignored) |
| `.env.example` | Placeholder template (committed) |
| `.gitignore` | Excludes .env, uploads/, node_modules/, dist/ |
| `test/helpers.ts` | Shared app factory + auth helpers for e2e tests |
| `test/auth.e2e-spec.ts` | E2E: register, login, logout, me, 422 errors |
| `test/catalog.e2e-spec.ts` | E2E: categories, filtered topics, instructors |
| `test/courses.e2e-spec.ts` | E2E: list pagination/sort/filter, featured, detail, scheduling picker |
| `test/enrollments.e2e-spec.ts` | E2E: enroll, conflict 409, force, complete, delete, reviews |

---

## Task 1: Scaffold NestJS project & install dependencies

**Files:**
- Create: `bootcamp-api/` (via Nest CLI)
- Create: `bootcamp-api/.env`
- Create: `bootcamp-api/.env.example`
- Modify: `bootcamp-api/.gitignore`
- Modify: `bootcamp-api/package.json` (add prisma seed script)

- [ ] **Step 1: Create the NestJS project**

Run from the repo root (`Bootcamp-backend/`):
```bash
npx @nestjs/cli new bootcamp-api --package-manager npm --skip-git
cd bootcamp-api
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @nestjs/config class-validator class-transformer
npm install @prisma/client multer
npm install --save-dev prisma @types/passport-jwt @types/bcrypt @types/multer ts-node
```

- [ ] **Step 3: Delete the generated boilerplate files**

```bash
rm src/app.controller.ts src/app.controller.spec.ts src/app.service.ts
```

- [ ] **Step 4: Create `.env`**

Create `bootcamp-api/.env`:
```
DATABASE_URL="postgresql://postgres:<your-password>@db.<your-project-ref>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<your-password>@db.<your-project-ref>.supabase.co:5432/postgres"
JWT_SECRET="bootcamp-super-secret-jwt-key-change-in-prod"
JWT_EXPIRES_IN="7d"
PORT=8000
APP_URL="http://localhost:8000"
FRONTEND_ORIGINS="http://localhost:3000,https://bootcamp-fawn-psi.vercel.app"
```

- [ ] **Step 5: Create `.env.example`**

Create `bootcamp-api/.env.example`:
```
DATABASE_URL="postgresql://postgres:<your-password>@db.<your-project-ref>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:<your-password>@db.<your-project-ref>.supabase.co:5432/postgres"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=8000
APP_URL="http://localhost:8000"
FRONTEND_ORIGINS="http://localhost:3000,https://your-frontend.vercel.app"
```

- [ ] **Step 6: Update `.gitignore`**

Append to `bootcamp-api/.gitignore`:
```
.env
uploads/
```

- [ ] **Step 7: Add Prisma seed script to `package.json`**

In `bootcamp-api/package.json`, add after the `"scripts"` block:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

- [ ] **Step 8: Create the uploads directory**

```bash
mkdir -p uploads/avatars
```

- [ ] **Step 9: Verify install succeeded**

```bash
npm run build
```
Expected: `Successfully compiled: X files with swc`

---

## Task 2: Prisma schema & database migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts` (stub — full seed in Task 7)

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

Replace the generated file entirely:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id           Int          @id @default(autoincrement())
  username     String       @unique
  email        String       @unique
  password     String
  fullName     String?
  mobileNumber String?
  age          Int?
  avatar       String?
  enrollments  Enrollment[]
  reviews      Review[]
  createdAt    DateTime     @default(now())
}

model Category {
  id      Int      @id @default(autoincrement())
  name    String
  icon    String
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
  basePrice     Decimal          @db.Decimal(8, 2)
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

enum SessionType {
  online
  in_person
  hybrid
}

model CourseSchedule {
  id               Int         @id @default(autoincrement())
  courseId         Int
  weeklyScheduleId Int
  timeSlotId       Int
  sessionType      SessionType
  priceModifier    Decimal     @db.Decimal(8, 2) @default(0)
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

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```
Expected: `Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
cd ..
git add bootcamp-api/prisma/schema.prisma bootcamp-api/prisma/migrations bootcamp-api/.env.example bootcamp-api/.gitignore bootcamp-api/package.json
git commit -m "feat: scaffold NestJS project with Prisma schema and Supabase migration"
```

---

## Task 3: Global setup — main.ts, AppModule, PrismaModule, ValidationFilter

**Files:**
- Create: `src/prisma/prisma.service.ts`
- Create: `src/prisma/prisma.module.ts`
- Create: `src/common/validation-exception.filter.ts`
- Modify: `src/main.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write `src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 2: Write `src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Write `src/common/validation-exception.filter.ts`**

```ts
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(ex: BadRequestException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const r = ex.getResponse() as any;

    if (r?.errors) {
      return res.status(422).json(r);
    }

    const errors: Record<string, string[]> = {};
    if (Array.isArray(r?.message)) {
      for (const m of r.message) {
        const field = m.split(' ')[0];
        (errors[field] ||= []).push(m);
      }
    }
    res.status(422).json({ errors, message: 'Validation failed' });
  }
}
```

- [ ] **Step 4: Write `src/main.ts`**

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './common/validation-exception.filter';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_ORIGINS!.split(','),
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
```

- [ ] **Step 5: Write `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Verify the app starts**

```bash
npm run start:dev
```
Expected: `Application is running on: http://[::1]:8000`

Stop the server with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add PrismaModule, ValidationExceptionFilter, and bootstrap setup"
```

---

## Task 4: Common utilities — serializeUser and lookup maps

**Files:**
- Create: `src/common/serialize-user.ts`
- Create: `src/common/lookup-maps.ts`

- [ ] **Step 1: Write `src/common/serialize-user.ts`**

```ts
export function serializeUser(u: {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  mobileNumber: string | null;
  age: number | null;
  avatar: string | null;
}) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    mobileNumber: u.mobileNumber,
    age: u.age,
    avatar: u.avatar,
    profileComplete: Boolean(u.fullName && u.mobileNumber && u.age),
  };
}
```

- [ ] **Step 2: Write `src/common/lookup-maps.ts`**

```ts
export const WEEKLY_SCHEDULE_MAP: Record<
  number,
  { label: string; days: [string, string] }
> = {
  1: { label: 'Mon - Wed', days: ['Monday', 'Wednesday'] },
  2: { label: 'Tue - Thu', days: ['Tuesday', 'Thursday'] },
  3: { label: 'Fri - Sat', days: ['Friday', 'Saturday'] },
  4: { label: 'Sat - Sun', days: ['Saturday', 'Sunday'] },
};

export const TIME_SLOT_MAP: Record<
  number,
  { label: string; startTime: string; endTime: string; display12h: string }
> = {
  1: {
    label: '(9:00 AM - 11:00 AM)',
    startTime: '09:00',
    endTime: '11:00',
    display12h: '9:00 AM - 11:00 AM',
  },
  2: {
    label: '(2:00 PM - 4:00 PM)',
    startTime: '14:00',
    endTime: '16:00',
    display12h: '2:00 PM - 4:00 PM',
  },
  3: {
    label: '(6:00 PM - 8:00 PM)',
    startTime: '18:00',
    endTime: '20:00',
    display12h: '6:00 PM - 8:00 PM',
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/common/
git commit -m "feat: add serializeUser helper and schedule lookup maps"
```

---

## Task 5: Auth module — register, login, logout, me

**Files:**
- Create: `src/auth/dto/register.dto.ts`
- Create: `src/auth/dto/login.dto.ts`
- Create: `src/auth/jwt.strategy.ts`
- Create: `src/auth/jwt-auth.guard.ts`
- Create: `src/auth/optional-jwt-auth.guard.ts`
- Create: `src/auth/auth.service.ts`
- Create: `src/auth/auth.controller.ts`
- Create: `src/auth/auth.module.ts`
- Modify: `src/app.module.ts`
- Create: `test/helpers.ts`
- Create: `test/auth.e2e-spec.ts`

- [ ] **Step 1: Write `src/auth/dto/register.dto.ts`**

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  password_confirmation: string;
}
```

- [ ] **Step 2: Write `src/auth/dto/login.dto.ts`**

```ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 3: Write `src/auth/jwt.strategy.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: number }) {
    return { id: payload.sub };
  }
}
```

- [ ] **Step 4: Write `src/auth/jwt-auth.guard.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: Write `src/auth/optional-jwt-auth.guard.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user ?? null;
  }
}
```

- [ ] **Step 6: Write `src/auth/auth.service.ts`**

```ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser } from '../common/serialize-user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, avatarFilename?: string) {
    if (dto.password !== dto.password_confirmation) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { password_confirmation: ['Passwords do not match'] },
      });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { [field]: [`${field} already taken`] },
      });
    }

    const password = await bcrypt.hash(dto.password, 10);
    const avatar = avatarFilename
      ? `${process.env.APP_URL}/uploads/avatars/${avatarFilename}`
      : null;

    const user = await this.prisma.user.create({
      data: { username: dto.username, email: dto.email, password, avatar },
    });

    const token = this.jwt.sign({ sub: user.id });
    return { token, user: serializeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwt.sign({ sub: user.id });
    return { token, user: serializeUser(user) };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return serializeUser(user);
  }
}
```

- [ ] **Step 7: Write `src/auth/auth.controller.ts`**

```ts
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}${extname(file.originalname)}`),
});

const avatarFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpeg, png, webp files are allowed'), false);
  }
};

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFilter }),
  )
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.auth.register(dto, file?.filename);
    return { data };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.auth.login(dto);
    return { data };
  }

  @Post('logout')
  logout() {
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    const user = await this.auth.me(req.user.id);
    return { data: user };
  }
}
```

- [ ] **Step 8: Write `src/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 9: Register AuthModule in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 10: Write `test/helpers.ts`**

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { ValidationExceptionFilter } from '../src/common/validation-exception.filter';

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  await app.init();
  return app;
}

export async function registerAndLogin(
  app: INestApplication,
  suffix: string,
): Promise<{ token: string; userId: number }> {
  const res = await request(app.getHttpServer())
    .post('/api/register')
    .field('email', `test-${suffix}@example.com`)
    .field('username', `testuser${suffix}`)
    .field('password', 'password123')
    .field('password_confirmation', 'password123');
  return { token: res.body.data.token, userId: res.body.data.user.id };
}
```

- [ ] **Step 11: Write `test/auth.e2e-spec.ts`**

```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createApp } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const ts = Date.now().toString();
  const email = `test-${ts}@example.com`;
  const username = `testuser${ts}`;
  let token: string;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } });
    await app.close();
  });

  it('POST /api/register returns 201 with token and user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/register')
      .field('email', email)
      .field('username', username)
      .field('password', 'password123')
      .field('password_confirmation', 'password123');

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.profileComplete).toBe(false);
    token = res.body.data.token;
  });

  it('POST /api/register returns 422 for duplicate email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/register')
      .field('email', email)
      .field('username', `other${ts}`)
      .field('password', 'password123')
      .field('password_confirmation', 'password123');

    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty('email');
  });

  it('POST /api/register returns 422 for password mismatch', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/register')
      .field('email', `mismatch-${ts}@example.com`)
      .field('username', `mismatch${ts}`)
      .field('password', 'password123')
      .field('password_confirmation', 'wrong');

    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty('password_confirmation');
  });

  it('POST /api/login returns 200 with token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send({ email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('POST /api/login returns 401 for bad password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send({ email, password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('GET /api/me returns current user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data).toHaveProperty('profileComplete');
  });

  it('GET /api/me returns 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/logout returns message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
  });
});
```

- [ ] **Step 12: Run the auth tests**

```bash
npx jest test/auth.e2e-spec.ts --testPathPattern=auth --config jest-e2e.json --forceExit
```
Expected: All 7 tests PASS.

- [ ] **Step 13: Commit**

```bash
git add src/auth/ src/app.module.ts test/
git commit -m "feat: add auth module (register, login, logout, me) with JWT"
```

---

## Task 6: Catalog module — categories, topics, instructors

**Files:**
- Create: `src/catalog/catalog.service.ts`
- Create: `src/catalog/catalog.controller.ts`
- Create: `src/catalog/catalog.module.ts`
- Modify: `src/app.module.ts`
- Create: `test/catalog.e2e-spec.ts`

- [ ] **Step 1: Write `src/catalog/catalog.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({
      select: { id: true, name: true, icon: true },
      orderBy: { id: 'asc' },
    });
  }

  topics(categoryIds?: number[]) {
    return this.prisma.topic.findMany({
      where: categoryIds?.length
        ? { categoryId: { in: categoryIds } }
        : undefined,
      select: { id: true, name: true, categoryId: true },
      orderBy: { id: 'asc' },
    });
  }

  instructors() {
    return this.prisma.instructor.findMany({
      select: { id: true, name: true, avatar: true },
      orderBy: { id: 'asc' },
    });
  }
}
```

- [ ] **Step 2: Write `src/catalog/catalog.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('topics')
  topics(@Query('categories') raw?: string | string[]) {
    const ids = raw
      ? (Array.isArray(raw) ? raw : [raw]).map(Number).filter(Boolean)
      : undefined;
    return this.catalog.topics(ids);
  }

  @Get('instructors')
  instructors() {
    return this.catalog.instructors();
  }
}
```

- [ ] **Step 3: Write `src/catalog/catalog.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
```

- [ ] **Step 4: Register CatalogModule in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CatalogModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Write `test/catalog.e2e-spec.ts`**

```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createApp } from './helpers';

describe('Catalog (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/categories returns bare array with 5 entries', async () => {
    const res = await request(app.getHttpServer()).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);
    const icons = res.body.map((c: any) => c.icon);
    expect(icons).toContain('development');
    expect(icons).toContain('design');
    expect(icons).toContain('business');
    expect(icons).toContain('marketing');
    expect(icons).toContain('data-science');
  });

  it('GET /api/topics returns all topics', async () => {
    const res = await request(app.getHttpServer()).get('/api/topics');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(30);
    expect(res.body[0]).toHaveProperty('categoryId');
  });

  it('GET /api/topics?categories[]=1 filters by category', async () => {
    const catRes = await request(app.getHttpServer()).get('/api/categories');
    const catId = catRes.body[0].id;

    const res = await request(app.getHttpServer()).get(
      `/api/topics?categories[]=${catId}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((t: any) => expect(t.categoryId).toBe(catId));
  });

  it('GET /api/instructors returns bare array with 12 entries', async () => {
    const res = await request(app.getHttpServer()).get('/api/instructors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(12);
    expect(res.body[0]).toHaveProperty('avatar');
  });
});
```

- [ ] **Step 6: Run catalog tests — expect failures (no seed yet)**

```bash
npx jest test/catalog.e2e-spec.ts --config jest-e2e.json --forceExit
```
Expected: FAIL — 0 categories, 0 topics, 0 instructors (seed not yet run). This is the failing test state.

- [ ] **Step 7: Commit**

```bash
git add src/catalog/ src/app.module.ts test/catalog.e2e-spec.ts
git commit -m "feat: add catalog module (categories, topics, instructors)"
```

---

## Task 7: Triple-rich seed data

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data in dependency order
  await prisma.review.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseSchedule.deleteMany();
  await prisma.course.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.category.deleteMany();

  // ── Categories ────────────────────────────────────────────
  const dev = await prisma.category.create({ data: { name: 'Development', icon: 'development' } });
  const des = await prisma.category.create({ data: { name: 'Design', icon: 'design' } });
  const biz = await prisma.category.create({ data: { name: 'Business', icon: 'business' } });
  const mkt = await prisma.category.create({ data: { name: 'Marketing', icon: 'marketing' } });
  const dsc = await prisma.category.create({ data: { name: 'Data Science', icon: 'data-science' } });

  // ── Topics ────────────────────────────────────────────────
  await prisma.topic.createMany({
    data: [
      // Development
      { name: 'React', categoryId: dev.id },
      { name: 'Node.js', categoryId: dev.id },
      { name: 'Python', categoryId: dev.id },
      { name: 'Go', categoryId: dev.id },
      { name: 'Docker & Kubernetes', categoryId: dev.id },
      { name: 'DevOps & CI/CD', categoryId: dev.id },
      // Design
      { name: 'UI/UX Design', categoryId: des.id },
      { name: 'Figma', categoryId: des.id },
      { name: 'Motion Design', categoryId: des.id },
      { name: 'Brand Identity', categoryId: des.id },
      { name: 'Design Systems', categoryId: des.id },
      { name: 'Adobe XD', categoryId: des.id },
      // Business
      { name: 'Entrepreneurship', categoryId: biz.id },
      { name: 'Project Management', categoryId: biz.id },
      { name: 'Financial Modeling', categoryId: biz.id },
      { name: 'Leadership', categoryId: biz.id },
      { name: 'Business Strategy', categoryId: biz.id },
      { name: 'Human Resources', categoryId: biz.id },
      // Marketing
      { name: 'Digital Marketing', categoryId: mkt.id },
      { name: 'SEO', categoryId: mkt.id },
      { name: 'Social Media', categoryId: mkt.id },
      { name: 'Content Marketing', categoryId: mkt.id },
      { name: 'Email Marketing', categoryId: mkt.id },
      { name: 'Analytics', categoryId: mkt.id },
      // Data Science
      { name: 'Machine Learning', categoryId: dsc.id },
      { name: 'Data Analysis', categoryId: dsc.id },
      { name: 'SQL', categoryId: dsc.id },
      { name: 'Deep Learning', categoryId: dsc.id },
      { name: 'Statistics', categoryId: dsc.id },
      { name: 'Business Intelligence', categoryId: dsc.id },
    ],
  });

  // ── Instructors ───────────────────────────────────────────
  const instructors = await Promise.all([
    prisma.instructor.create({ data: { name: 'Ana Khachidze', avatar: 'https://ui-avatars.com/api/?name=Ana+Khachidze&size=200&background=6366f1&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Giorgi Beridze', avatar: 'https://ui-avatars.com/api/?name=Giorgi+Beridze&size=200&background=8b5cf6&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Nino Lomidze', avatar: 'https://ui-avatars.com/api/?name=Nino+Lomidze&size=200&background=ec4899&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Luka Kvaratskhelia', avatar: 'https://ui-avatars.com/api/?name=Luka+Kvaratskhelia&size=200&background=14b8a6&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Mariam Tsereteli', avatar: 'https://ui-avatars.com/api/?name=Mariam+Tsereteli&size=200&background=f59e0b&color=fff' } }),
    prisma.instructor.create({ data: { name: 'David Jibladze', avatar: 'https://ui-avatars.com/api/?name=David+Jibladze&size=200&background=10b981&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Tamar Chitanava', avatar: 'https://ui-avatars.com/api/?name=Tamar+Chitanava&size=200&background=f43f5e&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Irakli Gabisonia', avatar: 'https://ui-avatars.com/api/?name=Irakli+Gabisonia&size=200&background=3b82f6&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Khatia Burchuladze', avatar: 'https://ui-avatars.com/api/?name=Khatia+Burchuladze&size=200&background=a855f7&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Tornike Kipiani', avatar: 'https://ui-avatars.com/api/?name=Tornike+Kipiani&size=200&background=0ea5e9&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Elene Gvenetadze', avatar: 'https://ui-avatars.com/api/?name=Elene+Gvenetadze&size=200&background=84cc16&color=fff' } }),
    prisma.instructor.create({ data: { name: 'Sandro Mgebrishvili', avatar: 'https://ui-avatars.com/api/?name=Sandro+Mgebrishvili&size=200&background=f97316&color=fff' } }),
  ]);

  // Schedule helper — generates 6 schedules for featured, 4 for non-featured
  function schedules(featured: boolean, nearZero = false) {
    const base = [
      { weeklyScheduleId: 1, timeSlotId: 1, sessionType: 'online' as const, priceModifier: 0, totalSeats: 25 },
      { weeklyScheduleId: 1, timeSlotId: 1, sessionType: 'in_person' as const, priceModifier: 50, totalSeats: nearZero ? 2 : 15, location: 'Tbilisi Hub' },
      { weeklyScheduleId: 2, timeSlotId: 3, sessionType: 'online' as const, priceModifier: 0, totalSeats: 25 },
      { weeklyScheduleId: 3, timeSlotId: 2, sessionType: 'hybrid' as const, priceModifier: 30, totalSeats: 10, location: 'Tbilisi Hub & Online' },
    ];
    if (!featured) return base;
    return [
      ...base,
      { weeklyScheduleId: 1, timeSlotId: 2, sessionType: 'hybrid' as const, priceModifier: 30, totalSeats: 12, location: 'Tbilisi Hub & Online' },
      { weeklyScheduleId: 4, timeSlotId: 1, sessionType: 'in_person' as const, priceModifier: 50, totalSeats: nearZero ? 2 : 8, location: 'Saburtalo Campus' },
    ];
  }

  // ── Development Courses ───────────────────────────────────
  await prisma.course.create({ data: {
    title: 'Full-Stack Web Development', isFeatured: true,
    description: 'Master React, Node.js, PostgreSQL, and deployment. Build production-grade apps from scratch and learn the full development lifecycle.',
    image: 'https://picsum.photos/seed/fullstack/800/450',
    basePrice: 499, durationWeeks: 12, hours: 120,
    categoryId: dev.id, instructorId: instructors[0].id,
    schedules: { createMany: { data: schedules(true, true) } },
  }});

  await prisma.course.create({ data: {
    title: 'React & Next.js Mastery', isFeatured: true,
    description: 'Deep-dive into React 18, Server Components, App Router, React Query, and Zustand. Ship fast, SEO-friendly applications.',
    image: 'https://picsum.photos/seed/reactnext/800/450',
    basePrice: 399, durationWeeks: 8, hours: 80,
    categoryId: dev.id, instructorId: instructors[1].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Node.js Backend Engineering',
    description: 'Build scalable REST APIs with Node.js, Express, and PostgreSQL. Learn authentication, testing, and production deployment.',
    image: 'https://picsum.photos/seed/nodejs/800/450',
    basePrice: 299, durationWeeks: 6, hours: 60,
    categoryId: dev.id, instructorId: instructors[0].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Python for Developers',
    description: 'Go from beginner to professional Python developer. Learn OOP, async programming, testing, and popular frameworks like FastAPI.',
    image: 'https://picsum.photos/seed/python/800/450',
    basePrice: 249, durationWeeks: 8, hours: 80,
    categoryId: dev.id, instructorId: instructors[1].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'DevOps & Cloud Infrastructure', isFeatured: true,
    description: 'Learn Docker, Kubernetes, CI/CD pipelines, AWS, and infrastructure as code. Take your applications from local to globally scaled.',
    image: 'https://picsum.photos/seed/devops/800/450',
    basePrice: 599, durationWeeks: 10, hours: 100,
    categoryId: dev.id, instructorId: instructors[0].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Go Programming Language',
    description: 'Learn Go from fundamentals to building high-performance microservices. Covers goroutines, channels, REST APIs, and gRPC.',
    image: 'https://picsum.photos/seed/golang/800/450',
    basePrice: 349, durationWeeks: 6, hours: 60,
    categoryId: dev.id, instructorId: instructors[1].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  // ── Design Courses ────────────────────────────────────────
  await prisma.course.create({ data: {
    title: 'UI/UX Design Fundamentals', isFeatured: true,
    description: 'Learn user research, wireframing, prototyping, and usability testing. Build a professional portfolio of real product designs.',
    image: 'https://picsum.photos/seed/uxdesign/800/450',
    basePrice: 349, durationWeeks: 8, hours: 80,
    categoryId: des.id, instructorId: instructors[2].id,
    schedules: { createMany: { data: schedules(true, true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Figma for Product Designers',
    description: 'Master Figma components, Auto Layout, variables, and prototyping. Learn workflows used at top design teams.',
    image: 'https://picsum.photos/seed/figma/800/450',
    basePrice: 299, durationWeeks: 6, hours: 60,
    categoryId: des.id, instructorId: instructors[3].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Motion Design & Animation', isFeatured: true,
    description: 'Create stunning motion graphics with After Effects and Lottie. Learn timing, easing, and storytelling through animation.',
    image: 'https://picsum.photos/seed/motion/800/450',
    basePrice: 399, durationWeeks: 8, hours: 80,
    categoryId: des.id, instructorId: instructors[2].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Brand Identity Design',
    description: 'Learn the strategic and creative process of building brands. From logo design to full brand systems and guidelines.',
    image: 'https://picsum.photos/seed/brand/800/450',
    basePrice: 249, durationWeeks: 6, hours: 60,
    categoryId: des.id, instructorId: instructors[3].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Design Systems & Tokens',
    description: 'Build scalable design systems using tokens, components, and documentation. Align design and engineering teams at scale.',
    image: 'https://picsum.photos/seed/designsys/800/450',
    basePrice: 329, durationWeeks: 6, hours: 60,
    categoryId: des.id, instructorId: instructors[2].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Adobe XD Masterclass',
    description: 'Complete guide to Adobe XD for UI design and prototyping. Learn responsive resize, voice prototyping, and developer handoff.',
    image: 'https://picsum.photos/seed/adobexd/800/450',
    basePrice: 199, durationWeeks: 4, hours: 40,
    categoryId: des.id, instructorId: instructors[3].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  // ── Business Courses ──────────────────────────────────────
  await prisma.course.create({ data: {
    title: 'Startup Fundamentals', isFeatured: true,
    description: 'From idea validation to raising your first round. Covers lean startup methodology, product-market fit, pitching, and fundraising.',
    image: 'https://picsum.photos/seed/startup/800/450',
    basePrice: 449, durationWeeks: 8, hours: 80,
    categoryId: biz.id, instructorId: instructors[4].id,
    schedules: { createMany: { data: schedules(true, true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Project Management Pro',
    description: 'Learn Agile, Scrum, and Kanban methodologies. Prepare for PMP certification and manage complex projects with confidence.',
    image: 'https://picsum.photos/seed/projmgmt/800/450',
    basePrice: 299, durationWeeks: 6, hours: 60,
    categoryId: biz.id, instructorId: instructors[5].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Financial Modeling', isFeatured: true,
    description: 'Build DCF models, LBO models, and three-statement models in Excel. Essential skills for finance, consulting, and startup finance.',
    image: 'https://picsum.photos/seed/finance/800/450',
    basePrice: 399, durationWeeks: 8, hours: 80,
    categoryId: biz.id, instructorId: instructors[4].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Leadership & Team Building',
    description: 'Develop the emotional intelligence, communication, and strategic thinking skills needed to lead high-performing teams.',
    image: 'https://picsum.photos/seed/leadership/800/450',
    basePrice: 349, durationWeeks: 6, hours: 60,
    categoryId: biz.id, instructorId: instructors[5].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Business Strategy',
    description: 'Learn Porter\'s Five Forces, Blue Ocean Strategy, and OKRs. Develop and execute competitive strategies for any organization.',
    image: 'https://picsum.photos/seed/strategy/800/450',
    basePrice: 279, durationWeeks: 6, hours: 60,
    categoryId: biz.id, instructorId: instructors[4].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'HR Management Essentials',
    description: 'Master recruitment, onboarding, performance management, and HR compliance. Build people-first organizations that retain top talent.',
    image: 'https://picsum.photos/seed/hrmanage/800/450',
    basePrice: 199, durationWeeks: 4, hours: 40,
    categoryId: biz.id, instructorId: instructors[5].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  // ── Marketing Courses ─────────────────────────────────────
  await prisma.course.create({ data: {
    title: 'Digital Marketing Bootcamp', isFeatured: true,
    description: 'Master Google Ads, Meta Ads, email marketing, and analytics. Run profitable campaigns and build marketing funnels that convert.',
    image: 'https://picsum.photos/seed/digimkt/800/450',
    basePrice: 349, durationWeeks: 8, hours: 80,
    categoryId: mkt.id, instructorId: instructors[6].id,
    schedules: { createMany: { data: schedules(true, true) } },
  }});

  await prisma.course.create({ data: {
    title: 'SEO Mastery',
    description: 'Rank at the top of Google with technical SEO, content strategy, link building, and keyword research. Includes Core Web Vitals.',
    image: 'https://picsum.photos/seed/seo/800/450',
    basePrice: 249, durationWeeks: 6, hours: 60,
    categoryId: mkt.id, instructorId: instructors[7].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Social Media Marketing', isFeatured: true,
    description: 'Grow your brand on Instagram, TikTok, LinkedIn, and YouTube. Learn content creation, community building, and paid amplification.',
    image: 'https://picsum.photos/seed/socialmkt/800/450',
    basePrice: 299, durationWeeks: 6, hours: 60,
    categoryId: mkt.id, instructorId: instructors[6].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Content Marketing Strategy',
    description: 'Build content engines that generate organic traffic, leads, and revenue. Covers blogging, video, podcasts, and distribution.',
    image: 'https://picsum.photos/seed/content/800/450',
    basePrice: 229, durationWeeks: 4, hours: 40,
    categoryId: mkt.id, instructorId: instructors[7].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Email Marketing & Automation',
    description: 'Design high-converting email sequences in Mailchimp and ActiveCampaign. Learn segmentation, A/B testing, and deliverability.',
    image: 'https://picsum.photos/seed/emailmkt/800/450',
    basePrice: 199, durationWeeks: 4, hours: 40,
    categoryId: mkt.id, instructorId: instructors[6].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Marketing Analytics',
    description: 'Turn data into decisions with Google Analytics 4, Looker Studio, and SQL. Build dashboards that prove marketing ROI.',
    image: 'https://picsum.photos/seed/mktanalytics/800/450',
    basePrice: 279, durationWeeks: 6, hours: 60,
    categoryId: mkt.id, instructorId: instructors[7].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  // ── Data Science Courses ──────────────────────────────────
  await prisma.course.create({ data: {
    title: 'Machine Learning Fundamentals', isFeatured: true,
    description: 'Supervised and unsupervised learning with scikit-learn. Build regression, classification, and clustering models deployed to production.',
    image: 'https://picsum.photos/seed/ml/800/450',
    basePrice: 599, durationWeeks: 12, hours: 120,
    categoryId: dsc.id, instructorId: instructors[8].id,
    schedules: { createMany: { data: schedules(true, true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Data Analysis with Python', isFeatured: true,
    description: 'Master pandas, NumPy, Matplotlib, and Seaborn. Transform raw datasets into insights with professional data analysis workflows.',
    image: 'https://picsum.photos/seed/datapy/800/450',
    basePrice: 399, durationWeeks: 8, hours: 80,
    categoryId: dsc.id, instructorId: instructors[9].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'SQL for Data Science',
    description: 'Write complex queries, window functions, CTEs, and performance-optimized SQL. Work with real datasets across PostgreSQL and BigQuery.',
    image: 'https://picsum.photos/seed/sql/800/450',
    basePrice: 249, durationWeeks: 6, hours: 60,
    categoryId: dsc.id, instructorId: instructors[8].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Deep Learning & Neural Networks', isFeatured: true,
    description: 'Build CNNs, RNNs, and Transformers with PyTorch. Train models for computer vision, NLP, and time-series forecasting.',
    image: 'https://picsum.photos/seed/deeplearn/800/450',
    basePrice: 699, durationWeeks: 12, hours: 120,
    categoryId: dsc.id, instructorId: instructors[9].id,
    schedules: { createMany: { data: schedules(true) } },
  }});

  await prisma.course.create({ data: {
    title: 'Statistics for Data Science',
    description: 'Probability theory, hypothesis testing, Bayesian inference, and experimental design. The mathematical backbone every data scientist needs.',
    image: 'https://picsum.photos/seed/stats/800/450',
    basePrice: 299, durationWeeks: 8, hours: 80,
    categoryId: dsc.id, instructorId: instructors[8].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  await prisma.course.create({ data: {
    title: 'Business Intelligence & BI Tools',
    description: 'Build executive dashboards with Power BI and Tableau. Learn data warehousing, star schemas, and self-service BI for business teams.',
    image: 'https://picsum.photos/seed/bi/800/450',
    basePrice: 349, durationWeeks: 8, hours: 80,
    categoryId: dsc.id, instructorId: instructors[9].id,
    schedules: { createMany: { data: schedules(false) } },
  }});

  const courseCount = await prisma.course.count();
  const scheduleCount = await prisma.courseSchedule.count();
  console.log(`✓ Seeded: 5 categories, 30 topics, 12 instructors, ${courseCount} courses, ${scheduleCount} schedules`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
npx prisma db seed
```
Expected: `✓ Seeded: 5 categories, 30 topics, 12 instructors, 30 courses, 144 schedules`

- [ ] **Step 3: Re-run catalog tests — expect pass now**

```bash
npx jest test/catalog.e2e-spec.ts --config jest-e2e.json --forceExit
```
Expected: All 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add triple-rich seed data (30 courses, 144 schedules)"
```

---

## Task 8: Courses module — list and featured

**Files:**
- Create: `src/courses/dto/create-review.dto.ts`
- Create: `src/courses/courses.service.ts`
- Create: `src/courses/courses.controller.ts`
- Create: `src/courses/courses.module.ts`
- Modify: `src/app.module.ts`
- Create: `test/courses.e2e-spec.ts` (partial — list and featured tests)

- [ ] **Step 1: Write `src/courses/dto/create-review.dto.ts`**

```ts
import { IsInt, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
```

- [ ] **Step 2: Write `src/courses/courses.service.ts`**

```ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WEEKLY_SCHEDULE_MAP, TIME_SLOT_MAP } from '../common/lookup-maps';
import { Prisma } from '@prisma/client';

const PAGE_SIZE = 9;

const courseCardSelect = {
  id: true,
  title: true,
  image: true,
  description: true,
  basePrice: true,
  durationWeeks: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { id: true, name: true, icon: true } },
  instructor: { select: { id: true, name: true, avatar: true } },
  reviews: { select: { rating: true } },
} satisfies Prisma.CourseSelect;

function computeCard(c: any) {
  const reviewCount = c.reviews.length;
  const avgRating =
    reviewCount > 0
      ? c.reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
      : null;
  const { reviews, createdAt, isFeatured, ...rest } = c;
  return { ...rest, avgRating, reviewCount };
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    sort?: string;
    page?: number;
    categories?: number[];
    topics?: number[];
    instructors?: number[];
  }) {
    const page = query.page ?? 1;
    const where: Prisma.CourseWhereInput = {};

    if (query.categories?.length) where.categoryId = { in: query.categories };
    if (query.topics?.length) {
      where.category = { topics: { some: { id: { in: query.topics } } } };
    }
    if (query.instructors?.length) where.instructorId = { in: query.instructors };

    const total = await this.prisma.course.count({ where });
    const lastPage = Math.ceil(total / PAGE_SIZE);

    let orderBy: Prisma.CourseOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort === 'price_asc') orderBy = { basePrice: 'asc' };
    if (query.sort === 'price_desc') orderBy = { basePrice: 'desc' };

    const raw = await this.prisma.course.findMany({
      where,
      select: courseCardSelect,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    let courses = raw.map(computeCard);

    if (query.sort === 'rating') {
      courses = courses.sort(
        (a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1),
      );
    }

    return {
      data: courses,
      meta: { currentPage: page, lastPage, total },
    };
  }

  async featured() {
    const raw = await this.prisma.course.findMany({
      where: { isFeatured: true },
      select: courseCardSelect,
    });
    return raw.map(computeCard);
  }

  async detail(id: number, userId?: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        ...courseCardSelect,
        hours: true,
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const card = computeCard(course);
    const reviews = course.reviews.map((r: any) => ({ rating: r.rating }));

    let isRated = false;
    let enrollment = null;

    if (userId) {
      const review = await this.prisma.review.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      });
      isRated = Boolean(review);

      const enr = await this.prisma.enrollment.findFirst({
        where: { userId, courseId: id },
        include: {
          schedule: {
            include: {
              course: {
                include: {
                  instructor: { select: { name: true } },
                  reviews: { select: { rating: true } },
                },
              },
            },
          },
        },
      });
      enrollment = enr ? this.serializeEnrollment(enr) : null;
    }

    return { ...card, hours: (course as any).hours, reviews, isRated, enrollment };
  }

  async weeklySchedules(courseId: number) {
    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId },
      select: { weeklyScheduleId: true },
      distinct: ['weeklyScheduleId'],
      orderBy: { weeklyScheduleId: 'asc' },
    });
    return schedules.map((s) => ({ id: s.weeklyScheduleId }));
  }

  async timeSlots(courseId: number, weeklyScheduleId: number) {
    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId, weeklyScheduleId },
      select: { timeSlotId: true },
      distinct: ['timeSlotId'],
      orderBy: { timeSlotId: 'asc' },
    });
    return schedules.map((s) => ({
      id: s.timeSlotId,
      startTime: TIME_SLOT_MAP[s.timeSlotId].startTime,
      endTime: TIME_SLOT_MAP[s.timeSlotId].endTime,
    }));
  }

  async sessionTypes(
    courseId: number,
    weeklyScheduleId: number,
    timeSlotId: number,
  ) {
    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId, weeklyScheduleId, timeSlotId },
      include: { _count: { select: { enrollments: true } } },
    });
    return schedules.map((s) => ({
      courseScheduleId: s.id,
      name: s.sessionType,
      priceModifier: s.priceModifier,
      availableSeats: s.totalSeats - s._count.enrollments,
      location: s.location,
    }));
  }

  async upsertReview(courseId: number, userId: number, rating: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    await this.prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { rating },
      create: { userId, courseId, rating },
    });
  }

  serializeEnrollment(e: any) {
    const ws = WEEKLY_SCHEDULE_MAP[e.schedule.weeklyScheduleId];
    const ts = TIME_SLOT_MAP[e.schedule.timeSlotId];
    const courseReviews: any[] = e.schedule.course?.reviews ?? [];
    const reviewCount = courseReviews.length;
    const avgRating =
      reviewCount > 0
        ? courseReviews.reduce((s: number, r: any) => s + r.rating, 0) /
          reviewCount
        : null;

    return {
      id: e.id,
      progress: e.progress,
      completedAt: e.completedAt,
      course: {
        id: e.schedule.course.id,
        title: e.schedule.course.title,
        image: e.schedule.course.image,
        avgRating,
        instructor: { name: e.schedule.course.instructor.name },
      },
      schedule: {
        weeklySchedule: { label: ws.label },
        timeSlot: { label: ts.label },
        sessionType: { name: e.schedule.sessionType },
        location: e.schedule.location,
      },
    };
  }
}
```

- [ ] **Step 3: Write `src/courses/courses.controller.ts`**

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('courses/featured')
  featured() {
    return this.courses.featured();
  }

  @Get('courses')
  list(
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('categories') categories?: string | string[],
    @Query('topics') topics?: string | string[],
    @Query('instructors') instructors?: string | string[],
  ) {
    const toIds = (v?: string | string[]) =>
      v ? (Array.isArray(v) ? v : [v]).map(Number).filter(Boolean) : undefined;

    return this.courses.list({
      sort,
      page: page ? Number(page) : 1,
      categories: toIds(categories),
      topics: toIds(topics),
      instructors: toIds(instructors),
    });
  }

  @Get('courses/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async detail(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const userId: number | undefined = req.user?.id;
    const data = await this.courses.detail(id, userId);
    return { data };
  }

  @Get('courses/:id/weekly-schedules')
  async weeklySchedules(@Param('id', ParseIntPipe) id: number) {
    const data = await this.courses.weeklySchedules(id);
    return { data };
  }

  @Get('courses/:id/time-slots')
  async timeSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('weekly_schedule_id') wsId: string,
  ) {
    const data = await this.courses.timeSlots(id, Number(wsId));
    return { data };
  }

  @Get('courses/:id/session-types')
  async sessionTypes(
    @Param('id', ParseIntPipe) id: number,
    @Query('weekly_schedule_id') wsId: string,
    @Query('time_slot_id') tsId: string,
  ) {
    const data = await this.courses.sessionTypes(id, Number(wsId), Number(tsId));
    return { data };
  }

  @Post('courses/:id/reviews')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    await this.courses.upsertReview(id, req.user.id, dto.rating);
    return { message: 'Review saved' };
  }
}
```

- [ ] **Step 4: Write `src/courses/courses.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
```

- [ ] **Step 5: Register CoursesModule in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    CoursesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Write `test/courses.e2e-spec.ts`**

```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createApp, registerAndLogin } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Courses (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let courseId: number;
  let scheduleId: number;

  beforeAll(async () => {
    app = await createApp();
    const prisma = app.get(PrismaService);
    const ts = Date.now().toString();
    ({ token } = await registerAndLogin(app, ts));
    const course = await prisma.course.findFirst({ where: { isFeatured: true } });
    courseId = course!.id;
    const schedule = await prisma.courseSchedule.findFirst({ where: { courseId } });
    scheduleId = schedule!.id;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } });
    await app.close();
  });

  it('GET /api/courses/featured returns bare array of featured courses', async () => {
    const res = await request(app.getHttpServer()).get('/api/courses/featured');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(12);
    const c = res.body[0];
    expect(c).toHaveProperty('basePrice');
    expect(c).toHaveProperty('avgRating');
    expect(c).toHaveProperty('reviewCount');
    expect(c.category).toHaveProperty('icon');
    expect(c.instructor).toHaveProperty('avatar');
  });

  it('GET /api/courses returns paginated { data, meta }', async () => {
    const res = await request(app.getHttpServer()).get('/api/courses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ currentPage: 1 });
    expect(res.body.meta.total).toBe(30);
    expect(res.body.data.length).toBeLessThanOrEqual(9);
  });

  it('GET /api/courses?sort=price_asc sorts ascending', async () => {
    const res = await request(app.getHttpServer()).get('/api/courses?sort=price_asc');
    expect(res.status).toBe(200);
    const prices = res.body.data.map((c: any) => parseFloat(c.basePrice));
    expect(prices[0]).toBeLessThanOrEqual(prices[prices.length - 1]);
  });

  it('GET /api/courses filters by category', async () => {
    const catRes = await request(app.getHttpServer()).get('/api/categories');
    const catId = catRes.body[0].id;
    const res = await request(app.getHttpServer()).get(`/api/courses?categories[]=${catId}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((c: any) => expect(c.category.id).toBe(catId));
  });

  it('GET /api/courses/:id returns full course for guest', async () => {
    const res = await request(app.getHttpServer()).get(`/api/courses/${courseId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hours');
    expect(res.body.data).toHaveProperty('reviews');
    expect(res.body.data.isRated).toBe(false);
    expect(res.body.data.enrollment).toBeNull();
  });

  it('GET /api/courses/:id/weekly-schedules returns { data: [{ id }] }', async () => {
    const res = await request(app.getHttpServer()).get(`/api/courses/${courseId}/weekly-schedules`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('id');
  });

  it('GET /api/courses/:id/time-slots returns startTime and endTime', async () => {
    const wsRes = await request(app.getHttpServer()).get(`/api/courses/${courseId}/weekly-schedules`);
    const wsId = wsRes.body.data[0].id;
    const res = await request(app.getHttpServer()).get(
      `/api/courses/${courseId}/time-slots?weekly_schedule_id=${wsId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('startTime');
    expect(res.body.data[0]).toHaveProperty('endTime');
  });

  it('GET /api/courses/:id/session-types returns availableSeats', async () => {
    const wsRes = await request(app.getHttpServer()).get(`/api/courses/${courseId}/weekly-schedules`);
    const wsId = wsRes.body.data[0].id;
    const tsRes = await request(app.getHttpServer()).get(
      `/api/courses/${courseId}/time-slots?weekly_schedule_id=${wsId}`,
    );
    const tsId = tsRes.body.data[0].id;
    const res = await request(app.getHttpServer()).get(
      `/api/courses/${courseId}/session-types?weekly_schedule_id=${wsId}&time_slot_id=${tsId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('courseScheduleId');
    expect(res.body.data[0]).toHaveProperty('availableSeats');
    expect(res.body.data[0]).toHaveProperty('name');
  });

  it('POST /api/courses/:id/reviews requires auth', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/reviews`)
      .send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('POST /api/courses/:id/reviews saves rating', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/courses/${courseId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5 });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Review saved');
  });
});
```

- [ ] **Step 7: Run courses tests**

```bash
npx jest test/courses.e2e-spec.ts --config jest-e2e.json --forceExit
```
Expected: All 11 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/courses/ src/app.module.ts test/courses.e2e-spec.ts
git commit -m "feat: add courses module (list, featured, detail, scheduling, reviews)"
```

---

## Task 9: Enrollments module — create, list, complete, delete

**Files:**
- Create: `src/enrollments/dto/create-enrollment.dto.ts`
- Create: `src/enrollments/enrollments.service.ts`
- Create: `src/enrollments/enrollments.controller.ts`
- Create: `src/enrollments/enrollments.module.ts`
- Modify: `src/app.module.ts`
- Create: `test/enrollments.e2e-spec.ts`

- [ ] **Step 1: Write `src/enrollments/dto/create-enrollment.dto.ts`**

```ts
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt()
  courseId: number;

  @IsInt()
  courseScheduleId: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}
```

- [ ] **Step 2: Write `src/enrollments/enrollments.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { WEEKLY_SCHEDULE_MAP, TIME_SLOT_MAP } from '../common/lookup-maps';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  async create(userId: number, dto: CreateEnrollmentDto) {
    const targetSchedule = await this.prisma.courseSchedule.findUnique({
      where: { id: dto.courseScheduleId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!targetSchedule) throw new NotFoundException('Schedule not found');

    const availableSeats = targetSchedule.totalSeats - targetSchedule._count.enrollments;
    if (availableSeats <= 0) {
      throw new BadRequestException('No seats available');
    }

    if (!dto.force) {
      const conflicts = await this.prisma.enrollment.findMany({
        where: {
          userId,
          completedAt: null,
          schedule: {
            weeklyScheduleId: targetSchedule.weeklyScheduleId,
            timeSlotId: targetSchedule.timeSlotId,
          },
        },
        include: {
          schedule: { include: { course: { select: { title: true } } } },
        },
      });

      if (conflicts.length > 0) {
        const ws = WEEKLY_SCHEDULE_MAP[targetSchedule.weeklyScheduleId];
        const ts = TIME_SLOT_MAP[targetSchedule.timeSlotId];
        const scheduleStr = `${ws.days[0]} - ${ws.days[1]} at (${ts.display12h})`;

        throw new ConflictException({
          message: 'Schedule conflict',
          conflicts: conflicts.map((c) => ({
            conflictingCourseName: c.schedule.course.title,
            schedule: scheduleStr,
          })),
        });
      }
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId: dto.courseId,
        courseScheduleId: dto.courseScheduleId,
      },
      include: {
        schedule: {
          include: {
            course: {
              include: {
                instructor: { select: { name: true } },
                reviews: { select: { rating: true } },
              },
            },
          },
        },
      },
    });

    return this.coursesService.serializeEnrollment(enrollment);
  }

  async findAll(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        schedule: {
          include: {
            course: {
              include: {
                instructor: { select: { name: true } },
                reviews: { select: { rating: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return enrollments.map((e) => this.coursesService.serializeEnrollment(e));
  }

  async complete(enrollmentId: number, userId: number) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { completedAt: new Date(), progress: 100 },
      include: {
        schedule: {
          include: {
            course: {
              include: {
                instructor: { select: { name: true } },
                reviews: { select: { rating: true } },
              },
            },
          },
        },
      },
    });
    return this.coursesService.serializeEnrollment(updated);
  }

  async remove(enrollmentId: number, userId: number) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
  }
}
```

- [ ] **Step 3: Write `src/enrollments/enrollments.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post()
  async create(@Body() dto: CreateEnrollmentDto, @Request() req: any) {
    const data = await this.enrollments.create(req.user.id, dto);
    return { data };
  }

  @Get()
  async findAll(@Request() req: any) {
    const data = await this.enrollments.findAll(req.user.id);
    return { data };
  }

  @Patch(':id/complete')
  async complete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.enrollments.complete(id, req.user.id);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.enrollments.remove(id, req.user.id);
    return { message: 'Enrollment removed' };
  }
}
```

- [ ] **Step 4: Write `src/enrollments/enrollments.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [CoursesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
})
export class EnrollmentsModule {}
```

- [ ] **Step 5: Register EnrollmentsModule in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    CoursesModule,
    EnrollmentsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Write `test/enrollments.e2e-spec.ts`**

```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createApp, registerAndLogin } from './helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Enrollments (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;
  let courseId: number;
  let scheduleId: number;
  let conflictScheduleId: number;
  let enrollmentId: number;

  beforeAll(async () => {
    app = await createApp();
    const prisma = app.get(PrismaService);
    const ts = Date.now().toString();
    ({ token, userId } = await registerAndLogin(app, ts));

    // Get a course with schedules for weeklyScheduleId=1, timeSlotId=1
    const schedule = await prisma.courseSchedule.findFirst({
      where: { weeklyScheduleId: 1, timeSlotId: 1 },
      include: { course: true },
    });
    courseId = schedule!.courseId;
    scheduleId = schedule!.id;

    // Get a DIFFERENT course's schedule with the same weeklyScheduleId+timeSlotId for conflict test
    const conflictSchedule = await prisma.courseSchedule.findFirst({
      where: {
        weeklyScheduleId: 1,
        timeSlotId: 1,
        courseId: { not: courseId },
      },
    });
    conflictScheduleId = conflictSchedule!.id;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.enrollment.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } });
    await app.close();
  });

  it('POST /api/enrollments requires auth', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/enrollments')
      .send({ courseId, courseScheduleId: scheduleId });
    expect(res.status).toBe(401);
  });

  it('POST /api/enrollments creates enrollment and returns serialized shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId, courseScheduleId: scheduleId, force: false });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('progress');
    expect(res.body.data.course).toHaveProperty('title');
    expect(res.body.data.schedule).toHaveProperty('weeklySchedule');
    expect(res.body.data.schedule).toHaveProperty('timeSlot');
    enrollmentId = res.body.data.id;
  });

  it('POST /api/enrollments returns 409 on schedule conflict', async () => {
    const prisma = app.get(PrismaService);
    const cs = await prisma.courseSchedule.findUnique({ where: { id: conflictScheduleId } });

    const res = await request(app.getHttpServer())
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: cs!.courseId, courseScheduleId: conflictScheduleId, force: false });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Schedule conflict');
    expect(Array.isArray(res.body.conflicts)).toBe(true);
  });

  it('POST /api/enrollments with force=true bypasses conflict and enrolls', async () => {
    const prisma = app.get(PrismaService);
    const cs = await prisma.courseSchedule.findUnique({ where: { id: conflictScheduleId } });

    const res = await request(app.getHttpServer())
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: cs!.courseId, courseScheduleId: conflictScheduleId, force: true });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });

  it('GET /api/enrollments returns list with schedule labels', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/enrollments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const enr = res.body.data[0];
    expect(enr.schedule.weeklySchedule).toHaveProperty('label');
    expect(enr.schedule.timeSlot).toHaveProperty('label');
    expect(enr.schedule.sessionType).toHaveProperty('name');
  });

  it('PATCH /api/enrollments/:id/complete marks enrollment complete', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/enrollments/${enrollmentId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.progress).toBe(100);
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it('DELETE /api/enrollments/:id removes enrollment', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Enrollment removed');
  });
});
```

- [ ] **Step 7: Run enrollment tests**

```bash
npx jest test/enrollments.e2e-spec.ts --config jest-e2e.json --forceExit
```
Expected: All 7 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/enrollments/ src/app.module.ts test/enrollments.e2e-spec.ts
git commit -m "feat: add enrollments module (create with conflict detection, list, complete, delete)"
```

---

## Task 10: Users profile — PUT /profile

**Files:**
- Create: `src/users/dto/update-profile.dto.ts`
- Create: `src/users/users.service.ts`
- Create: `src/users/users.controller.ts`
- Create: `src/users/users.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write `src/users/dto/update-profile.dto.ts`**

```ts
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z\s]{3,50}$/, {
    message: 'full_name must be 3–50 characters, letters and spaces only',
  })
  full_name?: string;

  @IsOptional()
  @IsString()
  mobile_number?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;
}
```

- [ ] **Step 2: Write `src/users/users.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser } from '../common/serialize-user';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    avatarFilename?: string,
  ) {
    const data: Record<string, any> = {};

    if (dto.full_name !== undefined) data.fullName = dto.full_name;
    if (dto.age !== undefined) data.age = Number(dto.age);
    if (dto.mobile_number !== undefined) {
      data.mobileNumber = dto.mobile_number.startsWith('+995')
        ? dto.mobile_number
        : `+995${dto.mobile_number}`;
    }
    if (avatarFilename) {
      data.avatar = `${process.env.APP_URL}/uploads/avatars/${avatarFilename}`;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return serializeUser(user);
  }
}
```

- [ ] **Step 3: Write `src/users/users.controller.ts`**

```ts
import {
  Body,
  Controller,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}${extname(file.originalname)}`),
});

const avatarFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpeg, png, webp files are allowed'), false);
  }
};

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Put('profile')
  @UseInterceptors(
    FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFilter }),
  )
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = await this.users.updateProfile(req.user.id, dto, file?.filename);
    return { data: user };
  }
}
```

- [ ] **Step 4: Write `src/users/users.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Register UsersModule in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    CoursesModule,
    EnrollmentsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Add profile tests to `test/auth.e2e-spec.ts`**

Add this test to the existing `describe('Auth (e2e)')` block:

```ts
it('PUT /api/profile updates full_name, mobile_number, age and sets profileComplete=true', async () => {
  const res = await request(app.getHttpServer())
    .put('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .field('full_name', 'Test User')
    .field('mobile_number', '555123456')
    .field('age', '25');

  expect(res.status).toBe(200);
  expect(res.body.data.fullName).toBe('Test User');
  expect(res.body.data.mobileNumber).toBe('+995555123456');
  expect(res.body.data.age).toBe(25);
  expect(res.body.data.profileComplete).toBe(true);
});
```

- [ ] **Step 7: Run all tests**

```bash
npx jest --config jest-e2e.json --forceExit
```
Expected: All tests PASS across auth, catalog, courses, enrollments.

- [ ] **Step 8: Commit**

```bash
git add src/users/ src/app.module.ts test/auth.e2e-spec.ts
git commit -m "feat: add users profile endpoint (PUT /profile) with avatar upload and +995 prefix"
```

---

## Task 11: Final verification — run server and smoke test

- [ ] **Step 1: Start the API**

```bash
npm run start:dev
```
Expected: `Application is running on: http://[::1]:8000`

- [ ] **Step 2: Verify all routes are registered**

```bash
curl http://localhost:8000/api/categories
```
Expected: JSON array of 5 categories.

```bash
curl http://localhost:8000/api/courses/featured
```
Expected: JSON array of 12 featured courses.

```bash
curl http://localhost:8000/api/courses
```
Expected: `{ data: [...], meta: { currentPage: 1, lastPage: 4, total: 30 } }`

- [ ] **Step 3: Run all e2e tests one final time**

```bash
npx jest --config jest-e2e.json --forceExit --verbose
```
Expected: All test suites PASS.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Bootcamp backend — NestJS + Prisma + Supabase PostgreSQL"
```

---

## Smoke Checklist (run against the frontend at http://localhost:3000)

- [ ] Sign up with and without avatar — lands logged in, profile incomplete badge visible
- [ ] Duplicate email on register → 422 mapped to email step
- [ ] Log in → refresh → still logged in (token in localStorage)
- [ ] Log out → token cleared → redirect to login
- [ ] Browse page: category/topic/instructor filters work, sort options change order, pagination shows correct totals
- [ ] Course detail page: rating, hours, weeks, description, instructor avatar all visible
- [ ] 3-step enrollment picker: only valid combos selectable; price = basePrice + priceModifier
- [ ] Enroll → confirmation modal
- [ ] Conflicting enroll → 409 modal with conflict details → "Try Anyway" force-enrolls
- [ ] Enrolling with incomplete profile → profile modal appears
- [ ] "Continue Learning" shows enrollments with progress bar
- [ ] Complete course → completedAt set, rating prompt appears
- [ ] Submit 1–5 star rating → isRated flips
- [ ] Retake (delete enrollment) → seat freed
- [ ] Update profile (full name, phone, age) → profileComplete flips to true
