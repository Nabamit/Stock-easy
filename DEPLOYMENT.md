# Deploying StockEasy Platform

StockEasy is built on a modern **Next.js 14** stack utilizing Server Actions. Below is the production setup documentation to deploy the application on **Vercel** backed by a **Supabase** cloud database and **Firebase Auth**.

---

## Architecture Overview

| Layer / Service | Cloud Provider | Purpose / Description |
| :--- | :--- | :--- |
| **Next.js Application** | [Vercel](https://vercel.com) | Frontend pages, routes, API middleware, and Server Actions |
| **PostgreSQL Database** | [Supabase](https://supabase.com) | Relational database, multi-tenant tables, and custom RLS bypass guards |
| **Authentication Engine** | [Firebase Console](https://console.firebase.google.com) | Client-side Google and Email Sign-In with verification link routing |

---

## Part 1 — Supabase Database Setup

1. **Create Project**: Sign in to [supabase.com](https://supabase.com) and spin up a new PostgreSQL database.
2. **Execute Migrations**: Open the **SQL Editor** in the Supabase dashboard and run the migrations in sequential order:
   - Run `supabase/migrations/001_initial_schema.sql` (Creates base schemas)
   - Run `supabase/migrations/002_features.sql` (Adds analytical columns and indices)
   - Run `supabase/migrations/003_admin_subroles_maintenance.sql` (Adds Super Admin flag, maintenance toggles, admin tasks, and chat tables)
3. **Copy Credentials**: In your Supabase project dashboard, navigate to **Project Settings → API** and copy:
   - **Project URL**
   - **Anon Public API Key** (`anon`)
   - **Service Role Secret Key** (`service_role` - Keep this confidential and server-side only)
4. **Seed Database**: (Optional) Run `npm run db:seed` in your terminal to initialize default subscription tiers and dummy mock entries.

---

## Part 2 — Firebase Console Configuration

1. **Register Firebase Project**: Open the [Firebase Console](https://console.firebase.google.com) and create a project matching your pharmacy application.
2. **Enable Authentication Providers**: Go to **Build → Authentication → Sign-in method**:
   - **Email/Password**: Enable this provider. Ensure email verification is turned on.
   - **Google**: Enable Google sign-in, linking your project support email.
3. **Authorized Domains**: Under Authentication settings, add your Vercel deployment URL (e.g. `your-app.vercel.app`) to the **Authorized Domains** whitelist to prevent CORS blocks during login popups.
4. **Obtain Client Keys**: Retrieve your Web Client Config parameters from Project Settings.

---

## Part 3 — Vercel Production Deployment

### A. Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: implement platform subscription controls and admin dashboards"
git remote add origin https://github.com/YOUR_USERNAME/stock-easy.git
git branch -M main
git push -u origin main
```

### B. Setup Vercel Project
1. Log in to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your GitHub repository.
3. If your repository root is a monorepo or sub-directory, set the **Root Directory** to `stock-easy` (Next.js framework will auto-detect).
4. Expand **Environment Variables** and add:

| Environment Variable | Description / Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase cloud project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Never prefix with `NEXT_PUBLIC_`) |
| `SESSION_SECRET` | A secure, random 32+ character encryption string |
| `GOOGLE_GEMINI_API_KEY` | Your Google Gemini API Key |
| `GOOGLE_GEMINI_MODEL` | `gemini-2.5-flash` (or customized Gemini model identifier) |
| `NEXT_PUBLIC_APP_URL` | Production website URL (e.g., `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase project Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Firebase Storage Bucket URL |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App ID |

5. Click **Deploy**. Vercel will build and distribute your static pages and Edge-ready Server Actions globally.

---

## Part 4 — Render (Alternative Application Hosting)

If you host Next.js on **Render** instead of Vercel:
1. Log in to [render.com](https://render.com) and select **New → Web Service**.
2. Connect your GitHub repository.
3. Set **Build Command** to `npm install && npm run build`.
4. Set **Start Command** to `npm start`.
5. Set Node runtime environment parameter: `NODE_VERSION` to `20`.
6. Add the exact environment variables listed in the Vercel table above.
7. Note: Vercel is highly recommended over Render for Next.js deployments to prevent cold startup delay on free tiers.

---

## Part 5 — Post-Deployment Verification (Smoke Test)

After successful deployment, test the following key paths:
1. **Landing Page**: Check that the register wizard loads, and steps 1–4 validations operate.
2. **Shop Owner Login**: Sign in using `owner1@test.com` / `owner123` to test subscription and medicine limits.
3. **Platform Admin Dashboard**: Sign in with `nabamitdutta14@gmail.com` / `Nabamitdutta@1442002`. Verify access to Super Admin settings, maintenance toggle, onboarding leaderboards, and direct support chat.
4. **Maintenance Redirection**: Toggle maintenance mode in the Admin settings, and verify that normal shop users are locked out and redirected to `/maintenance`.
5. **AI Assistant**: Navigate to `/ai` and ask: *"Which medicines are expiring soon?"* to test Gemini API integration.
