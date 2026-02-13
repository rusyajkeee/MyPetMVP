# MyPet – Full-Stack Pet Services Platform

Three separate applications for pet owners, service providers, and administrators. Shared backend API.

## Architecture

| App | Port | Role | Theme | Description |
|-----|------|------|-------|-------------|
| **MyPet** | 5173 | Pet owners (USER) | Green, mobile-first | Search, book, review providers |
| **MyPetWork** | 5174 | Service providers (PROVIDER) | Blue, SaaS dashboard | Manage services, appointments, profile |
| **MyPetAdmin** | 5175 | Administrators (ADMIN) | Purple, desktop admin | Verify providers, manage users, stats |
| **API** | 4000 | All | — | Express + Prisma backend |
| **Swagger** | 4000/api-docs | All | — | API documentation |

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Frontend:** 3 x React (Vite) + Tailwind CSS
- **Auth:** JWT (access + refresh), bcrypt, role-based
- **Deployment:** Docker Compose

## Quick start

```bash
docker compose up
```

| URL | App |
|-----|-----|
| http://localhost:5173 | MyPet (pet owners) |
| http://localhost:5174 | MyPetWork (providers) |
| http://localhost:5175 | MyPetAdmin (admins) |
| http://localhost:4000/api-docs | Swagger |

### Test logins

| App | Email | Password |
|-----|-------|----------|
| MyPet | oleg@example.com | password123 |
| MyPetWork | dr.kusainov@mypet.kz | password123 |
| MyPetAdmin | admin@mypet.kz | password123 |

### View database

```bash
docker compose --profile tools up prisma-studio
```
Open http://localhost:5555

## Local development

```bash
# Start Postgres
docker compose up postgres -d

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
node prisma/seed.js   # Re-run anytime to fix seed data (e.g. service price/duration)
npm run dev

# MyPet (new terminal)
cd apps/mypet
npm install
npm run dev          # http://localhost:5173

# MyPetWork (new terminal)
cd apps/mypetwork
npm install
npm run dev          # http://localhost:5174

# MyPetAdmin (new terminal)
cd apps/mypetadmin
npm install
npm run dev          # http://localhost:5175
```

## Project layout

```
MyPetMVP/
├── apps/
│   ├── mypet/           # Pet owners app (green, mobile)
│   │   └── src/pages/   Home, Discover, ProviderProfile, Booking, Dashboard, Profile, Pets
│   ├── mypetwork/       # Provider dashboard (blue, SaaS)
│   │   └── src/pages/   Dashboard, Services, Appointments, Profile
│   └── mypetadmin/      # Admin panel (purple, desktop)
│       └── src/pages/   Dashboard, Providers, Users
├── backend/
│   ├── prisma/          schema, migrations, seed
│   └── src/             Express routes, middleware, validators
├── docker-compose.yml
└── README.md
```

## Features by app

### MyPet (Pet Owners)
- Register/login with ToS acceptance
- Browse providers by category (Veterinary, Grooming, Boarding)
- View provider profiles with ratings
- Book appointments (date, time, pet selection)
- My Bookings with review system (1-5 stars + comment)
- Manage pets (add with breed, age, weight, color)

### MyPetWork (Providers)
- Register as provider with business info
- **My Services:** Create, edit, delete services (title, category, price, duration)
- **Appointments:** View and manage all bookings (accept/reject, mark paid, complete)
- **Profile:** Edit name, business info, view reviews, verification status
- Professional sidebar layout

### MyPetAdmin (Administrators)
- Dashboard with platform statistics
- Verify new providers
- Block/unblock users
- Provider management

## Environment

Backend (`backend/.env`):
- `PORT` (default: 4000)
- `DATABASE_URL` (default: `postgresql://mypet:mypet@localhost:5433/mypet?schema=public`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `FRONTEND_URL`

Each frontend app supports `VITE_API_URL` (default: `/api` for Docker, proxied in dev).
