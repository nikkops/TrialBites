# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Adults tracking their own single-food elimination or reintroduction trials, usually following a plan from a doctor, allergist, or dietitian. They are testing one food at a time, need to remember what happened each day after eating it, and need a clear record of which foods are safe and which are not. Use happens on both phone and desktop, and both must work fully: logging a reaction after a meal or photographing a food before eating it on the phone, and sitting down to review history on a larger screen.

## Product Purpose

TrialBites replaces notes scattered across a phone with one private place per person to run food trials: start a trial for one food, log reactions day by day, give a final safe or unsafe verdict, and keep a searchable history. It then puts that history to work: unsafe foods are surfaced as warnings, and a food-photo scanner flags foods in a photo that are, or usually contain, one of them.

Success: a user can always answer "what did I try, what happened, and is this food safe for me?" in seconds, and can check a packaged food against their own unsafe list before eating it.

## Positioning

The scanner checks a photo of food against the user's own trial verdicts, not a generic allergen list. Because those verdicts come from the user's logged trials, the app links the record of each trial to what they're about to eat. It names what it sees and rates each match as **seen**, **likely** (the dish usually contains it, e.g. almond flour in macarons) or **possible**, and reads a package label if one is in the photo. It never declares a food safe, because a photo can't show hidden ingredients.

## Operating Context

- Trial lifecycle: start a trial (food + start date) → log reactions per day with severity **None / Mild / Moderate / Severe** (stored 0 / 2 / 5 / 8 on a 0–10 scale) and notes → verdict **Mark as Safe** or **Mark as Unsafe (Allergen)**, with the verdict date saved.
- Active trial states shown on the Dashboard: **Baseline** (nothing logged), **Under Watch** (at least one reaction), **No Reactions** (only "None" entries).
- Surfaces: Auth (sign up, log in, password reset), Dashboard (active trials, the **Clinical Allergen Shield** warning listing unsafe foods), Trial Tracker (day-by-day timeline), Food Log (search plus filters In Progress / Safe Only / Unsafe (Allergens)), Allergen Scanner (upload or take a photo of food → Scan & Analyze → matches with certainty and reasons, plus every food identified).
- Each user's data is private to them (Supabase Row Level Security).

## Capabilities and Constraints

- Stack in place: React 19 + Vite, plain CSS with tokens in `src/index.css`, Lucide icons, Supabase (Postgres, Auth, RLS, Edge Function), Google Gemini through the `scan-label` Edge Function, deployed on Vercel (https://trial-bites.vercel.app/).
- No custom backend: the browser talks to Supabase with the publishable key; the Gemini key stays server-side in the Edge Function.
- The scanner is optional and needs at least one Unsafe trial to be useful; the rest of the app works without it.
- Project status: built as a course final project; it will continue afterward as a portfolio piece, not as a commercial product with real users at scale.

## Brand Commitments

- Name: **TrialBites**, with the existing logo at `public/favicon.svg` (also `apple-touch-icon.png`).
- Medical stance is binding: TrialBites is a tracking tool, not medical advice. Existing copy: "TrialBites is a tracking tool, not medical advice. Always plan food trials with your clinical team." Scanner results are supportive only: "AI scan results are supportive. Always verify with your clinical team."
- AI assistance is disclosed openly (README badge, `AI-USAGE.md`).

## Evidence on Hand

- Screenshots of every main surface: `images_documentation/` (Login, Dashboard, TrialTracker, FoodLog, AllergenScanner).
- Full documentation: `DOCUMENTATION.md`, `SECURITY-CHECKLIST.md`, `AI-USAGE.md`.
- No testimonials, user counts, clinical validation, or endorsements exist. Do not invent them, and do not claim medical accuracy for the scanner.

## Product Principles

1. **The record is the product.** Every trial, reaction, and verdict must be easy to log and trustworthy to read back later; never lose what the user typed.
2. **Safety signals are unmistakable.** Unsafe foods and scanner matches must stand out at a glance, and must never be confused with safe or in-progress states.
3. **Support, never diagnose.** The app helps users follow their clinical team's plan; copy and results stay framed as tracking and support, not medical judgment.
4. **Works where the moment happens.** Logging after a meal and scanning in a store are as important as reviewing at a desk; phone and desktop are both primary.
5. **Private by default.** A user's health data is theirs alone.

## Accessibility & Inclusion

Status and severity are health-relevant, so they must never rely on color alone; pair color with text labels or icons. Target WCAG 2.1 AA.
