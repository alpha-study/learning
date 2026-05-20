# Alpha Learning: Instructor Platform

Professional SaaS dashboard for course creation, management, and student performance tracking.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn/UI
- **Backend**: Supabase (Auth, Database, Storage)
- **Charts**: Recharts
- **Forms**: React Hook Form, Zod

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in values (use your local `.env.production` as reference if you have it)
4. Run development server: `npm run dev`

## Production (Vercel)

Env files are not committed. After changing variables, trigger a **new deploy** so Vite rebuilds with them.

In [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**, set at least:

| Variable | Example (production) |
|----------|----------------------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key from Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `VITE_API_BASE_URL` | `/vendor-api` |
| `VITE_VENDOR_ASSET_ORIGIN` | `https://dev.alpha.study` |

Copy the rest from `.env.example` / your local `.env.production`. Scope each variable to **Production** (and Preview if needed).

If the site is blank with `supabaseUrl is required` in the console, the production build was deployed without `VITE_SUPABASE_URL`.
