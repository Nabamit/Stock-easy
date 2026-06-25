# Stock Easy

Smart Medicine Stock Management SaaS for small pharmacies in India. Built with FEFO (First Expiry First Out) logic, analytics, and a GenAI assistant.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL via Supabase (RLS multi-tenancy)
- **Auth**: Custom bcrypt + JWT session cookies
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **AI**: Gemini Flash (Google AI Studio)
- **File Uploads**: Uploadthing

## Quick Start

### 1. Install dependencies

```bash
cd stock-easy
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required for local dev:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` (min 32 characters)

### 3. Set up Supabase database

1. Create a new Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Seed test accounts:

```bash
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Central Admin | `admin@stockeasy.in` | `admin123` | Platform admin |
| Shop Owner (Verified) | `owner1@test.com` | `owner123` | Test Pharmacy — full access |
| Shop Owner (Pending) | `owner2@test.com` | `owner123` | Pending Pharmacy — locked |

## Project Structure

```
src/
├── app/
│   ├── (shop)/          # Verified shop routes (dashboard, billing, etc.)
│   ├── (admin)/         # Central admin routes
│   ├── login/           # Shop login
│   ├── register/        # Shop registration
│   ├── pending/         # Unverified shop lock screen
│   └── page.tsx         # Public landing
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # App shell, sidebar
│   ├── auth/            # Login/register forms
│   └── dashboard/       # KPI cards, charts
├── lib/
│   ├── auth/            # Session, password, server actions
│   ├── supabase/        # DB clients
│   └── data/            # Dashboard queries
└── types/               # TypeScript types
supabase/
├── migrations/          # PostgreSQL schema + RLS
└── seed.sql             # Seed documentation
scripts/
└── seed.ts              # Node seed script (bcrypt passwords)
```

## Features Implemented

- [x] Project scaffolding & folder structure
- [x] PostgreSQL schema with RLS policies
- [x] Custom auth (bcrypt + JWT cookies)
- [x] Role-based access control
- [x] Shop registration with document URLs
- [x] Unverified shop lock screen
- [x] Admin verification queue (approve/reject)
- [x] Shop dashboard with KPIs & charts
- [x] Admin platform dashboard
- [x] Responsive layout with mobile sidebar
- [x] Seed script for test accounts

## Roadmap (Next Iterations)

- [ ] FEFO billing flow
- [ ] Medicine catalogue & batch management
- [ ] Inventory alerts (expiry, low stock, dead stock)
- [ ] GenAI assistant (Gemini Flash + safe SQL)
- [ ] Uploadthing document uploads
- [ ] Bill printing & returns
- [ ] Razorpay subscription payments

## License

Private — Stock Easy © 2026
