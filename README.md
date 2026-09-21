# Health Insight

An **insight-first** health dashboard. Instead of opening on a wall of charts, it answers three questions in order:

1. **Am I okay right now?** A readiness score that arrives with its drivers attached.
2. **What actually changed?** Only the metrics that moved. The flat ones stay quiet.
3. **What should I do about it?** One to three recommendations, each carrying its evidence.

The raw per-metric charts still sit below that line for anyone who wants to dig. A floating assistant answers questions about the same data, grounded so it cannot assert anything the dashboard does not back up.

> **Live demo:** [sqreem-health-dashboard.vercel.app](https://sqreem-health-dashboard.vercel.app)
> Sign in with any Google account. Every signed-in user reads the same seeded dataset. Only the display name follows the account.

---



## 1. Setup



### 1.1 Run locally

You need an LLM key and a Postgres database.

```bash
git clone https://github.com/nngthinh/sqreem-health-dashboard.git
cd sqreem-health-dashboard
npm install
cp .env.example apps/api/.env      # set LLM_API_KEY and SESSION_SECRET
npm run db:up && npm run db:migrate
npm run dev                        # web :5173, api :8787
```

Get the key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). `SESSION_SECRET` is any 32+ random characters.

Open [http://localhost:5173](http://localhost:5173) and click **Continue as dev user**.

`npm run db:up` starts Postgres 17 in Docker. To skip Docker, point `DATABASE_URL` at a free Neon branch instead. The app cannot tell the difference.

To verify the checkout:

```bash
npm test          # 240 tests. Repository tests need `npm run db:up` first
npm run typecheck # project-wide tsc -b
npm run lint      # biome check
```



### 1.2 Environment variables

**Where they live.** Server variables go in `apps/api/.env`, which is gitignored. `.env.example` is the committed template and the only tracked env file. The web app needs nothing to run, because it only ever calls its own origin. It reads one optional build-time hint.

**What matters in development.** The copied `.env.example` sets `AUTH_DEV_BYPASS=true`, so sign-in is skipped entirely and only six variables matter: `LLM_API_KEY`, `SESSION_SECRET`, `WEB_ORIGIN`, `DATABASE_URL`, `LLM_PROVIDER`, `LLM_MODEL`.

**What matters in production.** Everything else in the table below. The dev bypass is ignored once `NODE_ENV=production`, so real Google sign-in becomes mandatory and the three `GOOGLE_`* credentials are required.


| Variable                         | Required                 | Default                      | Purpose                                                                                               |
| -------------------------------- | ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `LLM_API_KEY`                    | **yes**                  | —                            | Google AI Studio key                                                                                  |
| `SESSION_SECRET`                 | **yes**                  | —                            | Signs the session cookie. Boot fails under 32 chars                                                   |
| `DATABASE_URL`                   | **yes**                  | —                            | Postgres connection string, local Docker or Neon                                                      |
| `WEB_ORIGIN`                     | no                       | `http://localhost:5173`      | Allowed origin for cookies and CORS                                                                   |
| `LLM_PROVIDER`                   | no                       | `google`                     | `google`, `anthropic` or `openai`. Only `google` is implemented                                       |
| `LLM_MODEL`                      | no                       | `gemini-3.8-flash`           | Model name for the chosen provider                                                                    |
| `NODE_ENV`                       | no                       | `development`                | `production` disables the dev bypass outright                                                         |
| `PORT`                           | no                       | `8787`                       | API port in local dev                                                                                 |
| `LLM_MESSAGE_RATE_LIMIT_PER_MIN` | no                       | `4`                          | Chat turns per user per minute, sized for the free tier                                               |
| `AUTH_MODE`                      | no                       | `sso`                        | `sso` or `demo`                                                                                       |
| `AUTH_DEV_BYPASS`                | no                       | unset, off                   | `"true"` enables the dev button. Ignored under `NODE_ENV=production`. Set to `true` by `.env.example` |
| `DEV_USER_EMAIL`                 | no                       | `dev@localhost`              | Identity used by the dev bypass                                                                       |
| `DEMO_ACCESS_CODE`               | only if `AUTH_MODE=demo` | —                            | Shared passphrase. Boot fails under 32 chars                                                          |
| `GOOGLE_CLIENT_ID`               | prod, `sso` mode         | —                            | OAuth client id                                                                                       |
| `GOOGLE_CLIENT_SECRET`           | prod, `sso` mode         | —                            | OAuth client secret                                                                                   |
| `GOOGLE_REDIRECT_URI`            | prod, `sso` mode         | —                            | Must match the console entry exactly                                                                  |
| `DIRECT_DATABASE_URL`            | no                       | falls back to `DATABASE_URL` | Non-pooled URL used only by migrations                                                                |
| `VITE_AUTH_HINT`                 | no                       | unset                        | Web build only. `demo` swaps the login copy                                                           |


## 2. Architecture



### 2.1 Project structure

```
sqreem-health-dashboard/
├─ apps/
│  ├─ web/             React 19 + Vite + TypeScript, the client
│  └─ api/             Hono BFF. Holds the LLM key, serves data, proxies chat
│     ├─ auth/           Google OAuth, session store, guard middleware
│     ├─ db/             Drizzle schema, migrations, repositories
│     ├─ llm/            Provider adapter, prompt builder, tool loop
│     └─ routes/         profile, records, insights, chat, conversations
├─ packages/
│  └─ shared/           Types, Zod schemas, dataset, insight engine
│     ├─ schema/          DailyRecord, Goal, Persona, InsightBlock
│     ├─ data/            Seeded generator and persona, server-only
│     └─ insights/        readiness, trends, signals, goals, coverage
├─ api/index.ts        Vercel function entry, wraps the same Hono app
└─ docker-compose.yml
```



### 2.2 Stack


| Concern    | Choice                            | Why                                                                                        |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| UI         | React 19 + Vite 7                 | Required by the brief. Vite for the fastest dev loop                                       |
| State      | Redux Toolkit + RTK Query         | Required by the brief. RTK Query hands every fetch site its loading, error and empty flags |
| Routing    | React Router 7                    | Route-level code splitting and typed params                                                |
| Styling    | Tailwind CSS 4                    | Design tokens as CSS variables, no stylesheet sprawl                                       |
| Primitives | Radix UI                          | Accessible dialog, dropdown, tabs and tooltip without rebuilding focus traps               |
| Charts     | Recharts                          | Declarative and composable, enough for four chart types                                    |
| Backend    | Hono                              | Runs unchanged on Node locally and on a Vercel function in production                      |
| Data       | Drizzle + Postgres on Neon        | Typed schema shared with the repositories, SQL migrations in the repo                      |
| LLM        | Google Gemini via `@google/genai` | Native function calling and a free tier that survives a review                             |
| Quality    | Vitest + Biome                    | 240 tests, one tool for lint and format                                                    |




### 2.3 Decisions

**Why a backend at all.** Three things make a server unavoidable.

- **The LLM key cannot live in the browser.** Anything shipped to the client is public, and a leaked key is someone else's bill.
- **The client cannot be the source of grounding data.** If it were, anyone could fabricate a context and make the assistant assert whatever they liked.
- **Sessions and secrets need somewhere to live.** There is nowhere else to hold them.

So the backend loads the dataset, builds the grounding context and owns the LLM call. The client sends only a chat message plus which view it is looking at. Prior turns are read back from the database, so a forged transcript cannot reach the prompt.

**Why a monorepo.** It is the simplest thing that runs at this size, and it lets `packages/shared` own one set of Zod schemas plus the LLM output validator. The generator, the routes, the charts and the validator all import the same `MetricId` and `GoalId`, so an identifier cannot drift between what a chart draws and what the prompt promises.

**Why this deployment.** Free-tier by design.

- **Vercel hosts web and API as one project.** A single origin keeps the session cookie on `SameSite=Lax` rather than `SameSite=None`, which Safari blocks by default.
- **Neon hosts Postgres.** Its free limit is more generous than Vercel's own.
- **The LLM is the only real cost ceiling.** That is why the chat route is rate-limited per user.

---



## 3. Product decisions



### 3.1 Dashboard

The section order is the argument.

1. **Readiness answers "am I okay".** One score, weighted sleep 0.5, steps 0.3, calories 0.2, published together with the drivers that produced it. A missing input drops its term instead of scoring zero. The assistant cites the same drivers when asked.
2. **Progress answers "what changed".** The current period against the previous one. A metric that did not move gets no section.
3. **Focus answers "what should I do".** One to three recommendations. Each has a `why?` disclosure holding its evidence and an `ask` button that hands the same context to the assistant. A recommendation you cannot interrogate is just an instruction.
4. **Detail sits underneath.** Recent activities, then per-metric charts, weekday breakdowns and the raw records table on the metric route.

Two further rules run through the whole screen:

- **Two numbers, never one.** Every goal reports attainment, the mean against target such as `85%`, alongside adherence, the days actually met such as `2 of 7 nights`. The status band reads adherence, because a flattering average is exactly what it must not hide.
- **State goes in the layout, events go in the toast.** A failing query gets its own place on the page with a Retry, because that is a state. A failed rename or a dropped stream is a one-off event and goes through the global toaster.

**Assumptions.** Three, and the whole dashboard rests on them.

- **Collection.** Steps, sleep, calories, distance and workouts arrive already collected from the user's devices. The app does not ingest raw sensor data.
- **Goals.** They are system-generated rather than user-set.
- **Readiness.** Calculated by formula.

| Term     | Weight | Scored 0 to 1 as                                         |
| -------- | ------ | -------------------------------------------------------- |
| Sleep    | 0.5    | Last night against target, capped at 1                   |
| Steps    | 0.3    | Last 7 days against the 7 before: 0.8x → 0, 1.2x → 1     |
| Calories | 0.2    | Yesterday against target, capped at 1                    |

The score is the weighted mean of the terms that have data, renormalised and shown 0 to 100. A missing input drops its term and lowers confidence to partial rather than scoring zero. Bands: 75 good, 50 steady, below that watch.

### 3.2 Persona & dataset

**What it is.** One fixed, seeded, deterministic dataset shared by every signed-in user, so answers stay reproducible across reviewers. The persona is **Daniel Tan**, 34, Senior Product Manager in Singapore, three months into rebuilding a routine that a year heads-down on a launch let slide. The signed-in account's own name is substituted for display so the greeting is not uncanny. The data never changes.

**Why it rolls.** The window always covers the 90 days ending today, so the dashboard never looks stale.

**How the three goals are designed.** Each is a different failure mode on purpose.

- **Steps.** Was being hit, has been sliding for three weeks. This is the headline "what changed".
- **Sleep.** Weeknight debt papered over by weekend catch-up. The mean lands near target and lies about it.
- **Active calories.** Never on target, never moving. Its drift of about 5% sits below the significance threshold deliberately, so the dashboard has to stay quiet about it.

There is also a deliberate ten-day gap in distance data, which forces the gap-versus-zero distinction to be handled rather than assumed away.

### 3.3 AI health assistant

A floating button sits bottom-right on every route and opens a chat panel that answers questions about the current dataset, such as *"How am I progressing?"* or *"What should I focus on?"*.

**How data reaches the model.** Two channels, deliberately.

- **A static system prompt** carries the persona, goal definitions, valid identifiers and tone.
- **A grounding digest** carries the baseline figures as plain label and value lines, because models reason more reliably over those than over nested JSON:

  ```
  steps 30d: 6841.2 steps | vs previous 30d: -8.4% | significant: true | recorded days: 29/30
  sleep: target 7.5h | mean 7.1h | attainment 94% | met 9 of 30 recorded days | status off_track
  ```

  The same insight engine that renders the screen produces it, so chat and UI cannot disagree, and it is rebuilt per request, so a long conversation never drifts onto stale numbers.
- **Four tools** cover what the digest does not: `get_metric_series`, `compare_periods`, `get_recent_workouts`, `get_goal_progress`. Ask *"how did last month compare?"* and the model calls `compare_periods` instead of guessing. Each result returns as a native tool-response turn rather than text pasted into the prompt, so the model only reasons over data it actually requested. The loop stops after four rounds, which bounds latency, quota, and a confused model querying in circles.

**How the prompt is structured.** Persona and goals come first, so *"is this good?"* is judged against the user's own targets rather than population averages. Hard rules and the output contract sit in the middle, stable across turns. The current view and the digest come last, closest to the question, because they are the only parts that change every request.

**How context is maintained.** The last ten messages of the thread replay and everything older is dropped. That bounds the prompt rather than preserving memory, buying a fixed token cost with some staleness. The obvious next step is compacting older turns into a summary instead of discarding them.

**How invention is prevented.** Layered, because any single instruction leaks.

- *Never calculate* is rule one, since arithmetic is where a fluent answer goes wrong invisibly.
- Valid identifiers are enumerated and the absent ones, heart rate, HRV, weight and nutrition, are named explicitly. A model told only what exists will still invent.
- A gap is declared not a zero.
- Attainment and adherence must be reported together.
- An insight block carries a reference, never a number. The app draws the figures server-side, so a hallucinated one has no route to the screen.

**How unexpected output is handled.**

- Tools answer `{ ok: false, reason }` rather than failing silently. An unknown identifier comes back with the valid ones so the model self-corrects.
- Model output is parsed and then schema-validated. A fenced block that fails either step is dropped while the prose around it still renders.
- Relative ranges are frozen to absolute dates before persisting, so a stored block never silently redraws with numbers the user never saw.
- Rate limiting returns 429 with human copy. An internal failure logs in full, shows one line, and still persists whatever streamed before the break.



### 3.4 States, responsiveness and testing

**Four states, everywhere data is fetched.**

- **Loading.** A skeleton matching the final layout.
- **Error.** Scoped per section with a Retry, so one broken section never blanks the page.
- **Empty.** An explicit message rather than a fake zero.
- **Partial.** Days with no reading are excluded from every mean, delta and adherence count, then surfaced as a coverage note such as *"9 of the last 30 days have no distance recorded"*.

**Responsive.** A persistent sidebar from `md` up and a drawer below it. The chat panel owns its own gutters so its composer reaches the edges.

**Testing.** Covering the insight engine, the generator's determinism, schema validation and block extraction, the LLM layer end to end, the auth flow, and the chat and conversation routes. Repository tests need a database, so run `npm run db:up` before `npm test`.
