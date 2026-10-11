# AI usage

**Project:** TrialBites · **Repository:** https://github.com/nikkops/TrialBites

**Assistant:** Claude (Anthropic), used through the Claude app as a coding assistant, from
27 September 2026 onward. I used it for the styling pass, the Supabase connection,
login, the Gemini label scanner and most of the documentation. I worked one step at a time:
I gave it my files and mockups, asked it to explain the plan before writing code, tested
each change in the app, and sent back the errors I hit.


## 1. How I used AI

### 1.1 Styling every page from my mockups — 27 Sep 2026

- **Tool:** Claude
- **What I asked:** I gave it my mockup of the Dashboard and the plain, unstyled React files
  I had (`App.jsx`, the four pages, `AppShell.jsx`, `trials.js`), and asked which files to
  edit for the CSS. Then we went one file at a time: `index.css`, `AppShell`, the Dashboard,
  and then the Trial Tracker, Food Log and Allergen Scanner after I sent mockups for those.
- **What came back:** design tokens and shared styles in `index.css` (colors, cards, badges,
  buttons), a sidebar layout in `AppShell.jsx` / `.css` with `lucide-react` icons, one CSS
  file per page, a shared `PageHeader` component, and `src/utils/trialHelpers.js` for dates
  and badges. It also asked me whether to style only with the data I had, or add new data
  fields to match the mockups exactly.
- **What I kept or changed, and why:** I chose to style with my existing data only and leave
  new fields for later, so I could finish the look first. I kept the sidebar and the
  per-page CSS files. When my page went blank, I sent my files back folder by folder until
  we found the cause (see 2.1).
- **Commit:** [87c5370](https://github.com/nikkops/TrialBites/commit/87c5370)

### 1.2 Planning the Supabase connection and a `trialsApi.js` skeleton — 4 Oct 2026

- **Tool:** Claude
- **What I asked:** I had already created my `trials` and `symptoms` tables in Supabase with
  my own SQL, and installed a package. I asked what to do next, then asked it to explain the
  whole plan before writing anything, then asked for `trialsApi.js` with the queries left as
  TODOs so I could try writing them myself.
- **What came back:** it pointed out that `npm install supabase` installs the command-line
  tool, not the library (`@supabase/supabase-js`), and that my `severity` check
  (`between 1 and 10`) would reject the app's "None" option (0). It gave me steps for
  `.env.local`, `src/lib/supabase.js`, turning on Row Level Security, and a `trialsApi.js`
  with `toTrial` / `toSymptom` converters and three functions with numbered TODO comments.
- **What I kept or changed, and why:** I kept all of it and committed the skeleton with the
  TODOs still in it, because I wanted to write the queries myself the next day.
- **Commit:** [0b29b91](https://github.com/nikkops/TrialBites/commit/0b29b91)

### 1.3 Filling in the queries and connecting `App.jsx` — 5 Oct 2026

- **Tool:** Claude
- **What I asked:** to fill in the three TODOs the way a beginner would, with comments I could
  use in my documentation. Then I asked whether the `pg` / `$1` parameterized query style from
  my backend course would work with Supabase. Then I asked it to update `App.jsx` to load and
  save through `trialsApi.js`.
- **What came back:** the finished `fetchTrials`, `addSymptom` and `updateTrialStatus`, which
  it tested against a fake Supabase server; a seed SQL script for my three sample trials; and
  a new `App.jsx` with loading, error and "Try again" states. For the `pg` question it first
  wrote a whole separate server layer (see 2.4) before explaining that the Supabase client
  already sends values as parameters.
- **What I kept or changed, and why:** I stayed with the Supabase client instead of adding a
  server, because it does the same job with less code. I kept all my CSS in `index.css`, so I
  had it move the new loading and error styles there instead of reviving `App.css`, and I
  deleted `App.css`. It also changed `TrialTracker.jsx` so a failed save keeps what I typed.
  I saved that file to the wrong place at first (`src/TrialTracker.jsx`, next to `App.jsx`),
  so the page the app actually uses, `src/pages/TrialTracker.jsx`, only got the change in
  [d73efc5](https://github.com/nikkops/TrialBites/commit/d73efc5). The stray copy is unused.
- **Commit:** [93ecdac](https://github.com/nikkops/TrialBites/commit/93ecdac)

### 1.4 Start New Trial, and login / sign-up — 9 Oct 2026

- **Tool:** Claude
- **What I asked:** to make "Start New Trial" work, and then to add login and sign-up. I asked
  to see what the login page would look like before it was connected to anything.
- **What came back:** `NewTrialDialog.jsx` and `createTrial()`; then a login page
  (`AuthPage.jsx`), which it showed me as screenshots first; then `authApi.js`, `AuthGate.jsx`,
  a Log out button in the sidebar, and SQL that adds a `user_id` to each trial and replaces my
  "public access" policies with "only your own data" policies. It tested the policies with two
  pretend users.
- **What I kept or changed, and why:** I approved the design without changes. I asked to turn
  off confirmation emails, because Supabase's built-in email only sends a few per hour, which
  made testing slow. I ran the SQL in two parts: the second part claims my old trials for my
  account, and it only works after signing up, which I learned by running it too early.
- **Commit:** [212a47d](https://github.com/nikkops/TrialBites/commit/212a47d)

### 1.5 Verdict dates, entry times and the Food Log — 9 Oct 2026

- **Tool:** Claude
- **What I asked:** to add the fields my mockups had but my data didn't.
- **What came back:** a plan for `planned_days`, `dosage` and `completed_at` columns, times
  taken from each entry's `created_at`, and the mockup's "Baseline" / "Under Watch" statuses
  worked out from the entries.
- **What I kept or changed, and why:** I skipped `planned_days` and `dosage`, because I wanted
  to finish the whole platform before polishing details. I kept `completed_at`, the times and
  the statuses. I also asked why the Food Log needed a verdict before I could search for a food
  (see 2.3), which led to the "In Progress" filter.
- **Commit:** [d73efc5](https://github.com/nikkops/TrialBites/commit/d73efc5)

### 1.6 The Allergen Scanner with Gemini — 9 Oct 2026

- **Tool:** Claude
- **What I asked:** to connect the scanner page to Gemini.
- **What came back:** a Supabase Edge Function (`supabase/functions/scan-label/index.ts`) that
  checks I'm logged in, looks up my unsafe foods and asks Gemini to match the label's
  ingredients against them, plus `src/lib/scannerApi.js`, which shrinks the photo before
  uploading it. The function keeps my Gemini key on Supabase's servers instead of in the
  browser.
- **What I kept or changed, and why:** I kept the design. I deployed the function through the
  Supabase dashboard. Setup took several tries: my first key wasn't valid, and Google suspended
  the next one after it was exposed, so I made a new restricted key that only lives in
  Supabase's secrets. When Gemini said it was busy, I asked for a fix (see 2.2). The page code
  landed in `01f0ab4`; the function's code was added to the repository later, in `11b1f4c`.
- **Commits:** [01f0ab4](https://github.com/nikkops/TrialBites/commit/01f0ab4),
  [11b1f4c](https://github.com/nikkops/TrialBites/commit/11b1f4c)

### 1.7 Tab icon and page title — 9 Oct 2026

- **Tool:** Claude
- **What I asked:** to change the browser tab's icon and name.
- **What came back:** `public/favicon.svg` matching my sidebar logo, and the `index.html` lines
  for the title "TrialBites" and the icon.
- **What I kept or changed, and why:** I kept it. Its first version showed as a broken image
  (see 2.5), which it caught and fixed before sending.
- **Commit:** [6833b82](https://github.com/nikkops/TrialBites/commit/6833b82)

## 2. Where the AI got it wrong

### 2.1 An edit that left out an import and blanked the whole app

- **What it gave me:** while moving the Dashboard's date helpers into `trialHelpers.js`, it
  rewrote the import block at the top of `Dashboard.jsx` and dropped `formatDate` from it, even
  though the page still called `formatDate` in three places.
- **What was wrong:** the Dashboard is the first page the app shows, so it crashed on load and
  the whole site showed a blank white page with no error on screen.
- **What I did instead:** I sent my files back folder by folder (`src`, `components`, `pages`)
  so we could check each one. The `pages` folder showed the import was missing. I added
  `formatDate` back to the import. I learned to open the browser console first, since the red
  error there names the file.
- **Commit:** [87c5370](https://github.com/nikkops/TrialBites/commit/87c5370)

### 2.2 It used an outdated name for the Supabase key

- **What it gave me:** setup instructions that named the variable `VITE_SUPABASE_ANON_KEY` and
  read that name in `supabase.js`.
- **What was wrong:** my Supabase dashboard calls it the **publishable** key now
  (`sb_publishable_…`), so in `.env.local` I had named it `VITE_SUPABASE_PUBLISHABLE_KEY`. The
  names didn't match, `createClient` got `undefined`, and the app crashed on start with
  "supabaseKey is required."
- **What I did instead:** I used the console error to find it and renamed the variable in
  `supabase.js` to match the dashboard's current name. I kept that name in Vercel too. When
  Vercel refused to save it, the AI first told me to ignore the warning, which was also wrong:
  Vercel won't store a `VITE_` variable as a Secret at all. I had to set its type to
  **Config**.
- **Commits:** [ab5f3e7](https://github.com/nikkops/TrialBites/commit/ab5f3e7),
  [e58e0a9](https://github.com/nikkops/TrialBites/commit/e58e0a9)

### 2.3 The Food Log hid every trial that didn't have a verdict yet

- **What it gave me:** a Food Log that filtered out all active trials before the search ran,
  because my mockup's subtitle said "past completed" trials.
- **What was wrong:** a food I was still trialing couldn't be found in the Food Log at all,
  not even by searching. A user would think the trial was lost.
- **What I did instead:** I asked whether a trial had to have a verdict to be searchable. Then
  I had it show every trial, with an "In Progress" filter and badge for active ones, and
  changed the subtitle to match.
- **Commit:** [d73efc5](https://github.com/nikkops/TrialBites/commit/d73efc5)

### 2.4 The scanner gave up the first time Gemini was busy

- **What it gave me:** a scanner function that called Gemini once and returned an error if that
  call failed.
- **What was wrong:** on my second test scan, Gemini answered "503: This model is currently
  experiencing high demand." That's a normal, short-lived error, but the scanner just failed.
- **What I did instead:** I sent it the log, and it added two retries (after 1 and then 3
  seconds) plus an optional backup model, and a clear "The scanner is busy, try again in a
  minute" message when all of them fail.
- **Commit:** [11b1f4c](https://github.com/nikkops/TrialBites/commit/11b1f4c)

### 2.5 Smaller misses

- When I asked whether my course's `pg` + `$1` query style applied to Supabase, it
  misunderstood and wrote a full set of server repository files before I stopped it and
  re-asked the question. I didn't use those files.
- Its first tab icon had `--` inside an XML comment, which is invalid in SVG, so the icon showed
  as a broken image. It caught this when previewing, before I got the file.
- Its first login page wrapped the password field in a `<label>` that also contained the
  "Forgot password?" button, so clicking the word "Password" triggered a password reset. Its
  own browser test caught that, and it was fixed in [212a47d](https://github.com/nikkops/TrialBites/commit/212a47d).

## 3. Who wrote what


### 3.1 What I wrote myself

**The app's state and page switching: `src/App.jsx`, `src/data/trials.js` and the first
versions of the four pages — [ed4096e](https://github.com/nikkops/TrialBites/commit/ed4096e)**


`App.jsx` holds the app's data in one place: `trials` (every trial with its symptoms),
`currentTrialId` (which trial is open) and `currentPage`. The pages don't keep their own copy
of the data; they get it as props and send changes back up through functions like
`handleLogSymptom(trialId, symptom)` and `handleUpdateStatus(trialId, status)`. I built it this
way so that logging a symptom in the Trial Tracker shows up straight away on the Dashboard and
in the Food Log: they all read the same `trials` array. The handlers use
`setTrials(currentTrials => currentTrials.map(...))` to make a new array with only the changed
trial replaced, instead of changing the old one, because React only re-renders when it gets a
new array. Pages switch with a `switch (currentPage)` in `renderPage()` instead of a router,
because four screens didn't need URLs yet. This structure is still how the finished app works;
later, `App.jsx` just swapped the sample data in `trials.js` for Supabase calls.

**The database tables: `trials` and `symptoms` — now in `supabase/schema.sql`,
[11b1f4c](https://github.com/nikkops/TrialBites/commit/11b1f4c)**


I wrote the first `create table` SQL for both tables myself and ran it in Supabase before
asking the AI anything about the backend. `trials` has a `uuid` id, `food_name`, `start_date`
(defaulting to today) and a `status` with a `check` that only allows `'active'`, `'safe'` or
`'unsafe'`, so a typo can't create a fourth status. `symptoms` has a `trial_id` that
`references trials(id) on delete cascade`, so every symptom belongs to a real trial, and
deleting a trial deletes its symptoms instead of leaving orphans behind. `severity` has a range
check. Later the AI widened the severity range to include 0, and added `user_id`,
`completed_at`, length limits and Row Level Security on top of my design. The combined file is
what's in `schema.sql` now.

**Fixing the key name — [ab5f3e7](https://github.com/nikkops/TrialBites/commit/ab5f3e7)**

When the app crashed with "supabaseKey is required", I traced it to `src/lib/supabase.js`
reading a variable name that didn't exist in my `.env.local`, and renamed it (see 2.2).

### 3.2 The AI-written piece I understand best: `src/lib/trialsApi.js`

**[0b29b91](https://github.com/nikkops/TrialBites/commit/0b29b91) (skeleton) →
[93ecdac](https://github.com/nikkops/TrialBites/commit/93ecdac) (queries) →
[212a47d](https://github.com/nikkops/TrialBites/commit/212a47d) (`createTrial`) →
[d73efc5](https://github.com/nikkops/TrialBites/commit/d73efc5) (verdict dates)**

This file is the only place in the app that talks to the database. The pages call `App.jsx`,
and `App.jsx` calls these functions, so if I ever change databases, only this file changes.

- **Converting names:** the database uses snake_case column names (`food_name`,
  `symptom_date`) and my pages use camelCase (`foodName`, `date`). `toTrial()` and
  `toSymptom()` convert each row, so the pages didn't need to change when I switched from
  sample data to Supabase. `toTrial()` also sorts each trial's symptoms oldest first, because
  the Dashboard treats the last one as the latest.
- **`fetchTrials()`:** `.select('*, symptoms(*)')` gets every trial *and* its symptoms in one
  request. Supabase can do this because `symptoms.trial_id` is a foreign key to `trials.id`.
  It's the same idea as a `JOIN`, but each trial comes back with a `symptoms` array inside it.
  It doesn't filter by user, because Row Level Security in the database already only returns
  the logged-in user's rows.
- **`addSymptom()`:** an insert returns nothing by default, so `.select().single()` asks for
  the saved row back as one object. We need it because the database creates the `id`. It sends
  `symptom_date` from `getLocalDate()` instead of the database's `current_date`, because the
  database runs on UTC, 8 hours behind Manila: a symptom logged at 7 AM would otherwise be
  saved under yesterday's date.
- **`updateTrialStatus()`:** `.eq('id', trialId)` is the `WHERE` clause. Without it, the update
  would change every trial. It also asks for the updated row back and throws if none came back,
  because when Row Level Security blocks an update, Supabase doesn't send an error: it just
  updates 0 rows silently.
- **Errors:** Supabase doesn't throw; it returns `{ data, error }`. Every function does
  `if (error) throw error`, so `App.jsx` can use a normal `try/catch` and show the message in
  a banner instead of crashing.
- **SQL injection:** values go into `.eq()` and `.insert()` as data, sent separately from the
  query, never pasted into a SQL string. It's the same protection as the `$1` placeholders I
  learned with `pg`.
