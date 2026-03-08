# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install
pnpm run dev                              # Watch mode (alias for start:dev)
pnpm run build                            # Compile to dist/ (required before migration:generate)
pnpm run test                             # All unit tests
pnpm run test -- --testPathPattern=<name> # Single test file
pnpm run test:e2e                         # End-to-end tests
pnpm run lint                             # ESLint with auto-fix
pnpm run migration:generate <Name>        # Generate migration (run build first)
pnpm run migration:run                    # Apply pending migrations
pnpm run migration:revert                 # Revert last migration
```

## Architecture

Feature-based NestJS modules. New domain modules go in `src/modules/<name>/` following the user module pattern (`controller`, `service`, `entities/`, `dto/`).

```
src/
  app.module.ts          # Root module: registers global JWT guard via APP_GUARD
  main.ts                # Bootstrap: Swagger + global ValidationPipe, port from PORT env
  config/
    database.config.ts   # Registered as 'database.*' namespace
    global.config.ts     # Registered as 'global.*' namespace (jwtSecret)
    typeorm.config.ts    # DataSource for TypeORM CLI — reads dist/ compiled files
  core/auth/             # Shared auth infrastructure
    auth.module.ts       # Exports JwtModule + PassportModule for feature modules to import
    jwt-auth.guard.ts    # Global guard; checks 'isPublic' metadata to skip auth
    jwt.strategy.ts      # Validates Bearer token; attaches { userId, username } to req.user
    public.decorator.ts  # @Public() — marks a route as unauthenticated
  migrations/            # TypeORM migration files
  modules/
    user/                # User CRUD + login
    loan/                # Loan CRUD + loanNumber sequencing
```

## Key Patterns

**Global auth:** `JwtAuthGuard` is registered as `APP_GUARD` in `app.module.ts`, so every route requires a valid JWT by default. Opt-out with `@Public()` on the controller method or class.

**Password field:** `User.password` has `{ select: false }`. To read it, use `createQueryBuilder` with `.addSelect('user.password')` — see `user.service.ts:login`.

**Path alias:** `@/` maps to `src/` (configured in `tsconfig.json`).

**Migrations:** The TypeORM CLI (`typeorm.config.ts`) reads compiled entities from `dist/`. Always run `pnpm run build` before `pnpm run migration:generate`.

**Swagger:** UI at `GET /api`, JSON spec at `GET /swagger/json`.

## Environment Variables

| Variable | Default |
|---|---|
| `DATABASE_HOST` | `localhost` |
| `DATABASE_PORT` | `5432` |
| `DATABASE_USERNAME` | `postgres` |
| `DATABASE_PASSWORD` | `postgres` |
| `DATABASE_NAME` | `monkey-money` |
| `JWT_SECRET` | `your-secret-key` |
| `PORT` | `5001` |

`synchronize` is **disabled** for all environments — schema changes must go through migrations only.

## Timezone Convention

**Database stores all timestamps in UTC.** All business logic that involves date/time must use **Asia/Bangkok (UTC+7)** — no DST, fixed offset.

This applies to:
- Computing year/month for `loanNumber` format (`yy-mm-seq`)
- Building date range filters for month-boundary queries (e.g., `getNextSequence`)
- Any future feature that buckets records by calendar month/year

**Pattern — extract Bangkok year/month from a UTC Date:**
```typescript
const BANGKOK_TZ = 'Asia/Bangkok'

function toBangkokParts(utcDate: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(utcDate)
  return {
    year:  Number(parts.find(p => p.type === 'year')!.value),
    month: Number(parts.find(p => p.type === 'month')!.value),
  }
}
```

**Pattern — convert Bangkok month boundaries to UTC for TypeORM `Between()`:**
```typescript
// Bangkok month (year, month) → UTC range
const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 3600_000)
const endUTC   = new Date(Date.UTC(year, month,     1) - 7 * 3600_000 - 1)
// e.g. Bangkok April 2026 → UTC 2026-03-31T17:00:00.000Z to 2026-04-30T16:59:59.999Z
```

**Never** call `.getFullYear()`, `.getMonth()`, or `.getDate()` directly on a UTC `Date` for business calendar logic — these return UTC values, not Bangkok values.

## Sentry

- `src/instrument.ts` must start with `import 'dotenv/config'` — it runs before `ConfigModule` loads `.env`, so `process.env` vars aren't populated otherwise
- `SentryGlobalFilter` must be registered via `APP_FILTER` provider in `app.module.ts` (not `app.useGlobalFilters()` in `main.ts`)

## Development Workflow

TDD approach: write/update tests before implementation, confirm failure, then implement. All code must pass `pnpm run lint` and `pnpm run build` (TypeScript) without errors before committing.

## Schema Management

**Entity column naming — two conventions exist:**
- Entities backed by **TypeORM-generated** migrations (user, loan, borrower, etc.): camelCase column names, no explicit `name`.
- Entities backed by **manually written** migrations (installment, installment_payment, auto_penalty): snake_case DB columns, must declare explicit `name` mappings:

```typescript
@Column({ name: 'due_date', type: 'timestamp with time zone' })
dueDate: Date

@JoinColumn({ name: 'loan_id' })
loan: Loan
```

**Reset local DB (drop all tables):**
```bash
psql -h localhost -U postgres -d monkey-money -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# Then: pnpm run build && pnpm run migration:run
```

## Seed

```bash
pnpm run seed   # Insert 200 diverse loans for development/testing
```

**Keep `src/seeds/seed-loans.ts` in sync with entities.** When a migration adds a NOT NULL column, update the seed too — TypeORM throws a `23502` constraint error at runtime, not compile time.
