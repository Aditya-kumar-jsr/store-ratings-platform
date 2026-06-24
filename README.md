# Store Ratings Platform

A full-stack web application where users submit 1–5 star ratings for stores. A single
login serves three roles — **System Administrator**, **Normal User**, and **Store Owner** —
each with role-specific functionality.

## Tech stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | Express.js + TypeScript                       |
| Database  | PostgreSQL                                         |
| Frontend  | React + TypeScript (Vite)                     |
| Auth      | Google OAuth + JWT sessions                   |
| Hosting   | Vercel frontend + Vercel serverless API       |

## Project layout

```
.
├── api/
│   └── index.ts
├── vercel.json
├── backend/
│   └── src/
│       ├── config/
│       ├── db/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       └── utils/
└── frontend/
    └── src/
        ├── api/
        ├── context/
        ├── components/
        └── pages/
```

## Prerequisites

- Node.js 18+ (tested on Node 20)
- PostgreSQL 14+ running locally (no Docker required)

### Install PostgreSQL locally (macOS / Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16

psql -d postgres -c "CREATE ROLE store_user LOGIN PASSWORD 'store_pass';"
psql -d postgres -c "CREATE DATABASE store_ratings OWNER store_user;"
```

(On Linux use your package manager; on Windows use the official installer or WSL.)

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

> `npm run seed` is idempotent — it applies the schema and inserts demo users,
> stores and ratings. Use `npm run migrate` if you only want the schema.

For Google OAuth, configure these backend variables:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
API_PUBLIC_URL=http://localhost:4000
CLIENT_ORIGIN=http://localhost:5173
```

In Google Cloud Console, add the redirect URI above for local development. For
production, use your deployed API URL with `/api/auth/google/callback`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend, so no extra config is needed.

## Deploying to Vercel

The repo is configured for a single Vercel project. Vercel builds the React app
from `frontend/` and serves the Express API through `api/index.ts`.

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Keep the framework preset as **Other** if Vercel does not detect Vite
   automatically. The included `vercel.json` provides the install, build and
   output settings.
4. Add a managed PostgreSQL connection string as `DATABASE_URL`.
5. Add these environment variables in Vercel:

```bash
DATABASE_URL=your-production-postgres-url
CLIENT_ORIGIN=https://your-vercel-domain.vercel.app
API_PUBLIC_URL=https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://your-vercel-domain.vercel.app/api/auth/google/callback
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7d
SEED_ADMIN_NAME=Aditya Kumar Singh
SEED_ADMIN_EMAIL=your-google-email@example.com
SEED_ADMIN_ADDRESS=1 Admin Plaza, Head Office
```

6. In Google Cloud Console, add the same production URL:
   - Authorized JavaScript origin: `https://your-vercel-domain.vercel.app`
   - Authorized redirect URI:
     `https://your-vercel-domain.vercel.app/api/auth/google/callback`
7. After deployment, run the database seed once from your local machine against
   the production `DATABASE_URL`:

```bash
cd backend
DATABASE_URL="your-production-postgres-url" npm run seed
```

Locally the frontend talks to the API through the Vite proxy. In production the
frontend and API share the same Vercel domain, so no `VITE_API_URL` is required.

## Seeded users

Seed data creates users and roles. Users sign in with Google OAuth using the
same email address. Password login and signup are not exposed by the app.

## Roles & functionality

### System Administrator
- Dashboard with total users / stores / ratings.
- Add stores, normal users, admin users (and store owners).
- List users (Name, Email, Address, Role) and stores (Name, Email, Address, Rating).
- Filter every listing by Name, Email, Address, Role.
- View full user details, including the store rating for owners.

### Normal User
- Google OAuth sign-in.
- Browse all stores; search by Name and Address.
- See overall rating + their own submitted rating per store.
- Submit and modify a rating (1–5).

### Store Owner
- Google OAuth sign-in.
- Dashboard: average store rating + list of users who rated the store.

## Form validation rules

Enforced on **both** client and server:

- **Name** — required (no length limit).
- **Address** — max 400 characters.
- **Email** — standard email format.

## Notable design decisions

- **Roles enforced in two layers** — `authorize()` middleware on the API, and
  role-aware routing/guards on the client.
- **Sorting** — every table supports ascending/descending sort (client-side in
  `DataTable`); the API also accepts `sortBy`/`order` with a column whitelist to
  prevent SQL injection.
- **Filtering** — server-side `ILIKE` filters, debounced from the UI.
- **Ratings** — a `UNIQUE (user_id, store_id)` constraint plus an upsert means
  "submit" and "modify" are the same idempotent operation.
- **Security** — Google OAuth identity, JWT app sessions, `helmet`, CORS locked
  to the client origin, parameterized SQL throughout.

## API overview

| Method | Endpoint                      | Role   | Purpose                              |
| ------ | ----------------------------- | ------ | ------------------------------------ |
| GET    | `/api/auth/google`            | public | Start Google OAuth                   |
| GET    | `/api/auth/google/callback`   | public | Complete Google OAuth                |
| GET    | `/api/auth/me`                | any    | Current user                         |
| GET    | `/api/users/dashboard`        | admin  | Counts for the admin dashboard       |
| GET    | `/api/users`                  | admin  | List/filter/sort users               |
| GET    | `/api/users/:id`              | admin  | User details (rating if owner)       |
| POST   | `/api/users`                  | admin  | Create a user of any role            |
| DELETE | `/api/users/:id`              | admin  | Delete a user (cannot delete self)   |
| GET    | `/api/stores`                 | any    | List stores (+ own rating for users) |
| POST   | `/api/stores`                 | admin  | Create a store                       |
| DELETE | `/api/stores/:id`             | admin  | Delete a store                       |
| GET    | `/api/stores/owner/dashboard` | owner  | Owner dashboard                      |
| POST   | `/api/ratings`                | user   | Submit / modify a rating             |
