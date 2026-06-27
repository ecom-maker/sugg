# Sugg Admission Management Platform

A production-ready SaaS platform for managing college admissions, student leads from WhatsApp, counselor workflows, agency partnerships, and commission tracking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, TailwindCSS |
| Backend | Next.js Server Actions + API Routes |
| Database | PostgreSQL (Supabase) + Prisma ORM |
| Auth | Supabase Auth (Email OTP + Phone OTP) |
| Storage | Supabase Storage |
| Messaging | Meta WhatsApp Business Cloud API |
| Forms | React Hook Form + Zod |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd Sugg
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` — Supabase PostgreSQL with connection pooling
- `DIRECT_URL` — Direct PostgreSQL connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `WHATSAPP_API_TOKEN` — Meta WhatsApp Cloud API token
- `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp phone number ID
- `WHATSAPP_WEBHOOK_SECRET` — Webhook verification secret
- `WHATSAPP_VERIFY_TOKEN` — Webhook verify token

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (dev)
npm run db:push

# Or run migrations (production)
npm run db:migrate:prod

# Seed with demo data
npm run db:seed
```

### 4. Supabase Setup

1. Create a new Supabase project
2. Go to **Authentication > Providers** → Enable Email and Phone
3. Go to **Storage** → Create buckets:
   - `documents` (private)
   - `logos` (public)
   - `galleries` (public)
4. Configure Row Level Security (RLS) policies

### 5. WhatsApp Setup

1. Create a Meta App at developers.facebook.com
2. Set up WhatsApp Business Cloud API
3. Configure webhook:
   - URL: `https://your-domain.com/api/whatsapp/webhook`
   - Verify Token: matches `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`, `message_deliveries`, `message_reads`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Roles & Access

| Role | Description | Default Route |
|------|-------------|---------------|
| `SUPER_ADMIN` | Full platform control | `/admin` |
| `SUGG_COUNSELOR` | Lead CRM, communication | `/counselor` |
| `COLLEGE_ADMIN` | College profile, applications | `/college` |
| `AGENCY_ADMIN` | Referrals, commission | `/agency` |
| `AGENCY_COUNSELOR` | Own referrals only | `/agency` |

---

## Architecture

### WhatsApp Lead Flow

```
Student WhatsApp → Meta Webhook → /api/whatsapp/webhook
  → Create Student → Create Lead → Auto-assign Counselor
  → Notify Counselor → Begin Follow-up Workflow
```

### Commission Flow

```
Application ENROLLED → createCommissionTransaction()
  → type: FIXED | PERCENTAGE | SLAB
  → Super Admin Review → APPROVED
  → processCommissionPayout() → PAID
```

### Auto Lead Assignment

```javascript
// Assignment priority:
1. Course-based specialist (lowest load)
2. Round-robin (lowest active lead count)
3. Manual override by admin
```

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/          # Login page
│   ├── (dashboard)/
│   │   ├── admin/          # Super Admin dashboard
│   │   ├── counselor/      # Counselor CRM
│   │   ├── college/        # College dashboard
│   │   └── agency/         # Agency dashboard
│   └── api/
│       ├── whatsapp/       # Webhook + send endpoints
│       ├── analytics/      # Analytics endpoints
│       ├── notifications/  # Notification management
│       └── cron/           # Scheduled jobs
├── components/
│   ├── ui/                 # ShadCN-style UI primitives
│   ├── shared/             # Shared components
│   ├── auth/               # Auth components
│   └── dashboard/          # Dashboard-specific components
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   ├── auth.ts             # Auth helpers & RBAC
│   ├── whatsapp.ts         # WhatsApp Cloud API
│   ├── lead-assignment.ts  # Auto-assignment engine
│   ├── notifications.ts    # Notification system
│   └── utils.ts            # Utility functions
├── actions/
│   ├── leads.ts            # Lead management actions
│   ├── colleges.ts         # College management actions
│   ├── applications.ts     # Application workflow actions
│   └── commissions.ts      # Commission engine actions
├── hooks/
│   └── use-toast.ts        # Toast notifications
├── types/
│   └── index.ts            # TypeScript types
└── middleware.ts            # Auth middleware + security headers
```

---

## Database Schema

30+ tables covering:

- **Identity**: `users`, `roles`, `permissions`, `audit_logs`
- **Students & Leads**: `students`, `leads`, `lead_notes`, `lead_followups`
- **Communication**: `whatsapp_messages`, `calls`, `tasks`, `notifications`
- **Colleges**: `colleges`, `courses`, `scholarships`, `hostels`, `documents`, `galleries`, `social_links`, `google_reviews`
- **Applications**: `applications`, `application_status_history`
- **Agencies**: `agencies`, `agency_users`, `student_referrals`
- **Commissions**: `commission_transactions`, `commission_payouts`
- **Payments (Future)**: `subscriptions`, `plans`, `payments`

---

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Vercel Configuration

1. Add all environment variables in Vercel dashboard
2. Configure cron jobs in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/inactivity-followups",
    "schedule": "0 9 * * *"
  }]
}
```

---

## Security

- ✅ JWT-based authentication via Supabase
- ✅ RBAC with per-role route protection
- ✅ Row Level Security on database
- ✅ CSRF protection (Next.js Server Actions)
- ✅ XSS protection via React + CSP headers
- ✅ SQL injection prevention via Prisma ORM
- ✅ Rate limiting middleware
- ✅ Secure HTTP headers
- ✅ Audit log for all sensitive operations

---

## Demo Accounts (after seeding)

| Email | Role |
|-------|------|
| `admin@sugg.in` | Super Admin |
| `counselor1@sugg.in` | Sugg Counselor |
| `counselor2@sugg.in` | Sugg Counselor |

> **Note**: These are for development only. In production, create users through Supabase Auth and set their roles in the database.
# sugg
# sugg
