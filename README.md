# TrialBites — Final Project

[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)

Built with  help from **Claude (Anthropic)** as a coding assistant: it wrote most of the
styling, the Supabase connection, and the Gemini food scanner, with me directing,
testing and fixing each step. Details, the mistakes it made, and who wrote what:
[AI-USAGE.md](AI-USAGE.md).

## My project repository

Public repository: https://github.com/nikkops/TrialBites

Live app (if deployed): https://trial-bites.vercel.app/

## What it is

TrialBites is a web app for people doing elimination diets or food reintroduction
trials: you start a trial for one food, log your reactions day by day, and record a
final safe or unsafe verdict. It keeps a searchable history of every food you've
tried, warns you about your unsafe foods, and can scan a photo of food with Gemini
to flag anything that is, or usually contains, one of them (for example almond
flour in macarons). It never calls a food safe: a photo can't show hidden ingredients.

**Built with:** React + Vite (front end), Supabase (Postgres database, login, Row
Level Security, and an Edge Function), Google Gemini (food scanning), deployed on
Vercel.

## How to run it

### What you need

- [Node.js](https://nodejs.org) 20 or newer
- A free [Supabase](https://supabase.com) account
- Optional, only for the Allergen Scanner: a free Gemini API key from
  [Google AI Studio](https://aistudio.google.com)

### 1. Get the code

```bash
git clone https://github.com/nikkops/TrialBites.git
cd TrialBites
npm install
```

### 2. Set up the database

1. In Supabase, create a new project.
2. Open **SQL Editor → New query**, paste in all of [`supabase/schema.sql`](supabase/schema.sql),
   and click **Run**. This creates the `trials` and `symptoms` tables and the Row
   Level Security rules that make each user see only their own data.
3. Go to **Authentication → Sign In / Providers → Email** and turn off
   **Confirm email** (so new accounts can log in straight away while testing).
4. Go to **Authentication → URL Configuration** and add `http://localhost:5173`
   under **Redirect URLs** (needed for password reset emails).

### 3. Connect the app to your database

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then open `.env.local` and replace the example values with your project's own,
from **Project Settings → API** in Supabase:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

Use the **publishable (anon)** key only. Never use the `service_role` / secret key
here. `.env.local` is ignored by Git, so your keys are not committed.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:5173, create an account on the **Sign up** tab, and you're in.
Use **Start New Trial** on the Dashboard to add your first food.

### 5. Optional: turn on the Allergen Scanner

Everything else works without this step. The scanner's code runs inside your
Supabase project (as an Edge Function) rather than in the browser, so your Gemini
key is never exposed. To add it to your project:

1. In Supabase, go to **Edge Functions → Secrets** and add:
   - `GEMINI_API_KEY` = your key from Google AI Studio
   - `GEMINI_MODEL` (optional) = a Gemini model name; defaults to `gemini-3.8-flash`
   - `GEMINI_FALLBACK_MODEL` (optional) = a second model to try if the first is busy
2. Go to **Edge Functions → Deploy a new function → Via Editor**, name it exactly
   `scan-label`, paste in [`supabase/functions/scan-label/index.ts`](supabase/functions/scan-label/index.ts),
   and click **Deploy** (this saves the function to your Supabase project).
3. In the app, mark at least one trial as **Unsafe**, then scan a photo of food on the
   **Allergen Scanner** page.

If a scan fails, the details are in **Edge Functions → scan-label → Logs**.

### Project structure

```
src/
  AuthGate.jsx        shows the login page or the app
  App.jsx             loads trials and handles saving
  lib/                everything that talks to Supabase
    supabase.js         the Supabase client
    trialsApi.js        trials and symptoms queries
    authApi.js          sign up, log in, log out, password reset
    scannerApi.js       sends food photos to the scan-label function
  pages/              Dashboard, TrialTracker, FoodLog, AllergenScanner, AuthPage
  components/         AppShell (sidebar), PageHeader, NewTrialDialog
  utils/trialHelpers.js  dates, times, and status badges
supabase/
  schema.sql          database setup (run once)
  functions/scan-label/index.ts  the Gemini food scanner
```

## Presentation

- Video, Slides, and Image: https://drive.google.com/drive/folders/1a850P9Exrm0QcKxZ0-WuyxmDm3BGk-AU?usp=sharing

## AI usage

I used Claude (Anthropic) as a coding assistant throughout this project.
Link to the `AI-USAGE.md` in my project repository:
https://github.com/nikkops/TrialBites/blob/main/AI-USAGE.md
