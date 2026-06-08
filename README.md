# Trello Clone

A full-stack Trello-like board management application with authentication, boards, lists, cards, drag-and-drop, real-time updates, checklists, labels, activity log, and board member invitations.

## Stack

- **Backend:** Laravel 13 (PHP 8.5), SQLite, Laravel Sanctum (cookie-based SPA auth)
- **WebSockets:** Laravel Reverb (real-time board updates)
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Drag & Drop:** @dnd-kit
- **Testing:** PHPUnit (backend), Vitest + React Testing Library (frontend), Playwright (E2E)

## Prerequisites

- PHP 8.5+
- Composer
- Node.js 20+
- npm

## Setup

### 1. Clone and install dependencies

```bash
# Root package installs concurrently for dev
npm install

# Backend
cd backend
composer install

# Frontend
cd ../frontend
npm install
```

### 2. Backend configuration

```bash
cd backend
cp .env.example .env
php artisan key:generate
```

The project uses **SQLite** by default. The database file will be created automatically at `backend/database/database.sqlite`.

```bash
php artisan migrate --force
```

### 3. Run the application

From the project root:

```bash
npm run dev
```

This starts three servers simultaneously:
- Backend API: http://localhost:8000
- Reverb WebSocket server: ws://localhost:8080
- Frontend: http://localhost:3000

You can also run them separately:

```bash
# Terminal 1
cd backend && php artisan serve

# Terminal 2
cd backend && php artisan reverb:start

# Terminal 3
cd frontend && npm run dev
```

## Test Credentials

Run the seeder to create a ready-to-use test account:

```bash
cd backend
php artisan db:seed
```

- Email: `test@example.com`
- Password: `password`

Alternatively, register any account via the UI at http://localhost:3000/login.

## Testing

### Backend tests

```bash
cd backend
php artisan test --compact
```

With coverage (requires [Xdebug](https://xdebug.org/docs/install) installed and `xdebug.mode=coverage` set in `php.ini`):

```bash
cd backend
php artisan test --coverage
```

52 test methods across 9 test files covering:
- Authentication (register, login, validation, duplicate email)
- Board CRUD with ownership and member authorization
- List CRUD within boards
- Card CRUD within lists (title, description, due date, labels, status, parent)
- Checklist item CRUD within cards
- Board member invitations and removal

### Frontend unit tests

```bash
cd frontend
npm run test:unit          # run tests
npm run test:unit:coverage # run tests with coverage report
```

Covers API helpers and UI components (Vitest + React Testing Library).

### E2E tests

```bash
cd frontend
npm run test:e2e        # headless
npm run test:e2e:ui     # with Playwright UI
```

## Bonus Features Implemented

All optional bonus features from the spec are implemented:

- **Drag and drop** — reorder cards within and across lists (@dnd-kit, optimistic UI)
- **Card labels / color tags** — multi-select labels with 12 color options
- **Checklists** — add/toggle/edit/delete checklist items with a progress bar
- **Board member invitations** — invite users by email, remove members, real-time board list sync
- **Real-time updates** — Laravel Reverb WebSockets broadcast board changes to all connected clients
- **Card activity log** — full history of title, description, due date, label, status, move, checklist, and parent changes

## Technical Decisions

- **Laravel Sanctum with cookie sessions** instead of JWT: chosen for first-party SPA authentication. The frontend (Next.js) and backend (Laravel) run on different ports, and Sanctum's stateful API middleware handles cross-origin cookie auth cleanly.
- **SQLite for local development**: zero-configuration database that persists data without requiring MySQL/PostgreSQL setup.
- **Laravel Reverb for WebSockets**: first-party Laravel WebSocket server that integrates directly with broadcast events. Board updates are pushed to all connected clients after any mutation, keeping all users in sync without polling.
- **Next.js 16 App Router with Server Components + Client Components**: auth pages and board pages use `'use client'` because they need browser APIs (cookies, fetch with credentials), while the layout and other pages leverage server rendering.
- **@dnd-kit for drag and drop**: modern, accessible, and framework-agnostic. Implemented optimistic UI updates so cards move instantly and sync with the server in the background.
- **Tailwind CSS v4**: utility-first styling used throughout the Next.js frontend.
- **Soft deletes**: boards, lists, and cards use `deleted_at` so records are preserved in the database and can be audited or recovered.
