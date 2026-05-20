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
3. Env vars live in `.env` (dev) and `.env.production` (Vercel build); see `.env.example` for reference
4. Run development server: `npm run dev`

## Production (Vercel)

Vite reads `.env` and `.env.production` at build time. After changing either file, push and redeploy (or trigger a new Vercel deploy).
