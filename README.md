# Trello Clone

A full-stack Trello-like board management application with authentication, boards, lists, cards, drag-and-drop, and card detail views.

## Stack

- **Backend:** Laravel 13 (PHP 8.5), SQLite, Laravel Sanctum (cookie-based SPA auth)
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Drag & Drop:** @dnd-kit
- **Testing:** PHPUnit

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

This starts both servers simultaneously:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

You can also run them separately:

```bash
# Terminal 1
cd backend && php artisan serve

# Terminal 2
cd frontend && npm run dev
```

## Test Credentials

After registering through the UI, you can use any email/password. There is no seeding required — users are created via the registration form.

Example test user:
- Email: `test@example.com`
- Password: `password`

## Testing

### Backend tests

```bash
cd backend
php artisan test --compact
```

All 25 tests cover:
- Authentication (register, login, validation)
- Board CRUD with ownership authorization
- List CRUD within boards
- Card CRUD within lists

### Frontend

No frontend test suite is included, but the app can be verified manually by running `npm run dev` and exercising the features.

## Technical Decisions

- **Laravel Sanctum with cookie sessions** instead of JWT: chosen for first-party SPA authentication. The frontend (Next.js) and backend (Laravel) run on different ports, and Sanctum's stateful API middleware handles cross-origin cookie auth cleanly.
- **SQLite for local development**: zero-configuration database that persists data without requiring MySQL/PostgreSQL setup.
- **Next.js 16 App Router with Server Components + Client Components**: the auth pages and board pages use `'use client'` because they need browser APIs (cookies, fetch with credentials), while the layout and other pages can leverage server rendering.
- **@dnd-kit for drag and drop**: modern, accessible, and framework-agnostic. Implemented optimistic UI updates so cards move instantly and sync with the server in the background.
- **Tailwind CSS v4**: utility-first styling used throughout both Laravel resources and Next.js frontend for consistency.
