# Deploying Stock Easy

Stock Easy is a **Next.js 14** app. Server logic (auth, billing, AI) runs as **Server Actions** inside the same app — there is no separate Express server in this repo.

## Recommended architecture

| Service | Host | Role |
|---------|------|------|
| **Next.js app** | **Vercel** | Frontend + API / Server Actions |
| **PostgreSQL** | **Supabase** | Database (already cloud) |
| **Render** | Optional | Only if you add a separate worker/cron later |

> For this project, deploy the **full app on Vercel** + **Supabase for DB**. You do not need Render unless you split out a custom backend later.

---

## Part 1 — Supabase (database)

1. Create project at [supabase.com](https://supabase.com)
2. **SQL Editor** → run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_features.sql`
3. **Settings → API** → copy:
   - Project URL
   - `anon` key
   - `service_role` key
4. Locally: `npm run db:seed` (creates test accounts)

---

## Part 2 — Vercel (app)

### A. Push code to GitHub

```bash
cd stock-easy
git init
git add .
git commit -m "Stock Easy initial deploy"
git remote add origin https://github.com/YOUR_USER/stock-easy.git
git push -u origin main
```

### B. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. **Root Directory:** `stock-easy` (if repo root is `StockEasy`)
4. Framework: **Next.js** (auto-detected)
5. Add **Environment Variables**:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SESSION_SECRET` | Random 32+ char string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

6. Click **Deploy**

### C. After deploy

- Open your Vercel URL → test login
- Update Supabase if needed: no extra CORS config required for server-side Supabase client

---

## Part 3 — Render (optional alternative)

If you prefer **Render** instead of Vercel for the Next.js app:

1. [render.com](https://render.com) → **New → Web Service**
2. Connect GitHub repo
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`
5. **Environment:** Node 20
6. Add the **same env vars** as Vercel table above
7. Set `NEXT_PUBLIC_APP_URL` to your Render URL (`https://your-app.onrender.com`)

Render free tier may sleep; Vercel hobby tier is usually better for Next.js.

---

## Part 4 — Environment checklist

**Local (`.env.local`):**

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Never commit `.env.local` or API keys to GitHub.**

---

## Part 5 — Post-deploy smoke test

1. Landing page loads
2. Admin login: `admin@stockeasy.in` / `admin123`
3. Shop login: `owner1@test.com` / `owner123`
4. Create bill → **Print Bill** (watermark included)
5. Bills History → open old bill → print works
6. AI Assistant → ask “Which medicines are expiring soon?”

---

## Security notes

- Rotate any API key that was shared in chat or commits
- Use strong `SESSION_SECRET` in production
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only (Vercel env, not `NEXT_PUBLIC_`)
