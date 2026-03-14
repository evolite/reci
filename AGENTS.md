# AGENTS.md

## Purpose
This file guides agentic coding tools working in this repo. Follow existing conventions and keep behavior consistent with current code.

## Repo layout
- `frontend/` React 19 + Vite + TypeScript + Tailwind + shadcn/ui
- `backend/` Express 5 + TypeScript + Prisma
- Root README documents deployment (Podman/Docker) and env vars

## Cursor/Copilot rules
- Cursor rule: Always use shadcn/ui components from `@/components/ui` for UI elements. Replace custom components with shadcn equivalents when possible. (from `.cursorrules`)
- Copilot rules: none found

## Install
- `frontend/`: `npm install`
- `backend/`: `npm install`

## Build/Lint/Test commands
### Frontend (Vite)
- Dev server: `npm run dev` (in `frontend/`)
- Build: `npm run build` (in `frontend/`)
- Lint: `npm run lint` (in `frontend/`)
- Preview: `npm run preview` (in `frontend/`)

### Backend (Express)
- Dev server: `npm run dev` (in `backend/`)
- Build: `npm run build` (in `backend/`)
- Start built server: `npm run start` (in `backend/`)
- Prisma:
  - Generate client: `npm run prisma:generate`
  - Migrate dev DB: `npm run prisma:migrate`
  - Studio: `npm run prisma:studio`

### Tests
- No test runner configured in `frontend/package.json` or `backend/package.json`.
- Single test: not available until a test runner (Vitest/Jest/etc.) is added.

## Code style guidelines
### General TypeScript
- Use strict typing. Both frontend and backend are `strict: true`.
- Prefer `type`/`interface` definitions for payloads, API inputs, and models.
- Avoid `any`; use `unknown` with narrowing or helper functions for validation.
- Keep functions focused and side effects clear.

### Imports
- Group imports: external packages, internal alias (`@/`), then relative paths.
- Frontend supports `@/*` alias to `frontend/src/*` (see `frontend/tsconfig.app.json`).
- Backend uses relative paths; no alias configured.

### Formatting by package
#### Frontend formatting
- No semicolons; use double quotes in imports/strings (see `frontend/src/lib/utils.ts`).
- React components are `.tsx`, hooks in `frontend/src/hooks`.
- Tailwind classes are composed via `cn` in `frontend/src/lib/utils.ts`.

#### Backend formatting
- Use semicolons and single quotes (see `backend/src/routes/*.ts`).
- Express routes live under `backend/src/routes`.

### Naming conventions
- Components: `PascalCase` (e.g., `RecipeCard`).
- Hooks: `useCamelCase` (e.g., `useSettings`).
- Types/Interfaces: `PascalCase` (e.g., `CreateRecipeInput`).
- Variables/Functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` when appropriate.
- Files: Frontend components in `PascalCase.tsx`, backend modules in `camelCase.ts`.

### Error handling
- Backend: use `handleRouteError` from `backend/src/utils/errorHandler.ts` for route handlers.
- Prefer explicit 400/404/403 responses for validation and auth checks.
- For validation utilities, reuse helpers in `backend/src/utils/errorHandler.ts` and `backend/src/utils/validation.ts`.
- Frontend: use `getErrorMessage` (`frontend/src/lib/utils.ts`) to extract messages from `unknown` errors.

### API and auth patterns (backend)
- Use `authenticate` or `optionalAuth` middleware from `backend/src/middleware/auth` as appropriate.
- Keep public GET routes above `/:id` routes to avoid collisions.
- Use Prisma via `backend/src/lib/prisma.ts`; reuse the singleton client.
- When fetching data that can fail (ratings, external services), catch and return safe defaults.

### UI guidelines (frontend)
- Always use shadcn components from `@/components/ui` for UI primitives.
- Prefer reusable components under `frontend/src/components` and pages in `frontend/src/pages`.
- Favor `react-hook-form` + `zod` for forms when adding new input flows.
- Use Tailwind for styling; keep classnames readable and grouped by layout/spacing/typography.

### State and data fetching (frontend)
- Use React Query (`@tanstack/react-query`) for server state where possible.
- Keep API calls in `frontend/src/lib` (see `frontend/src/lib/api.ts`).
- Use context under `frontend/src/contexts` for shared app state (auth, settings, etc.).

## Editing guidance for agents
- Do not introduce a new formatting tool unless required by a task.
- Preserve existing style: frontend no semicolons, backend semicolons.
- Prefer small, focused changes and reuse existing helpers.
- When changing backend routes, update related frontend API helpers if needed.

## Files to check when adding features
- Frontend routing: `frontend/src/App.tsx`
- API helpers: `frontend/src/lib/api.ts`
- Backend routes: `backend/src/routes/*.ts`
- Backend services: `backend/src/services/*.ts`
- Prisma models: `backend/prisma/schema.prisma` (if present)

## Known gaps
- No test framework configured. Add one before writing tests.
- Linting only configured for frontend. Backend has no eslint config.
