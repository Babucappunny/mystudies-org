# Vidya (Cloudflare Pages + D1 edition)

This is a port of the Flask/SQLite Vidya quiz app to run entirely on
Cloudflare's free edge stack: **Cloudflare Pages** (static HTML/CSS/JS +
Pages Functions for the API) and **Cloudflare D1** (a serverless,
SQLite-compatible database) -- deployed straight from a GitHub repo, no
server to manage.

It is functionally identical to the Flask version: same 6 screens, same
`MasterData` / `Kerala_9_English_Book1_MCQ` schema, same 30
chapters / 3,000 MCQs, and the same security behaviour (the correct
answer is never sent to the browser until `/api/answer` confirms it,
`/api/answer` recomputes correctness server-side, and table names are
checked against a whitelist).

## What changed vs. the Flask version

| Flask version | This version |
|---|---|
| `app.py` (Python) | `functions/api/*.js`, `functions/healthz.js` (JavaScript, Cloudflare Pages Functions) |
| `templates/*.html` (Jinja, served by Flask routes) | Same HTML files, moved to the project root as plain static files |
| `Vidya.db` (SQLite file on disk) | Cloudflare D1 (`vidya-db`) -- same schema/data, loaded from `schema.sql` + `seed.sql` |
| `gunicorn` / `Procfile` / `wsgi.py` | Not needed -- Cloudflare Pages runs the Functions for you |
| `pytest` test suite | Not ported (would need a JS test runner against Miniflare/D1; happy to add if useful) |

Nothing in the frontend (`static/css`, `static/js`) needed to change --
it already talked to `/api/...` over `fetch()`, which works identically
here.

## Files

```
VidyaCF/
  index.html, topic_selection.html, question.html,
  results.html, section_results.html, question_review.html   Static pages (same as Flask templates/)
  static/css/style.css
  static/js/*.js                     Unchanged from the Flask version
  functions/
    _common.js                       Shared helpers (table-name derivation, whitelist, JSON helpers)
    healthz.js                       GET /healthz
    api/
      masterdata.js                  GET /api/masterdata
      topics.js                      GET /api/topics?id=
      answer.js                      POST /api/answer
      quiz/start.js                  POST /api/quiz/start
  schema.sql                         CREATE TABLE statements for D1
  seed.sql                           INSERT statements (30 chapters, 3000 MCQs) for D1
  wrangler.toml                      Project config + D1 binding (binding name: DB)
  package.json                       Convenience scripts (dev, db:*, deploy)
  .gitignore
```

## 1. Try it locally first (optional but recommended)

You need Node.js installed. `wrangler` (Cloudflare's CLI) is pulled in
automatically via `npx` -- no global install required.

```bash
cd VidyaCF
npx wrangler d1 execute vidya-db --local --file=./schema.sql
npx wrangler d1 execute vidya-db --local --file=./seed.sql
npx wrangler pages dev . --compatibility-date=2025-01-01
```

Open **http://localhost:8788/**. This runs the exact same Functions code
and a local emulated D1 database, so you can click through the whole
quiz flow before deploying anything.

## 2. Push this folder to GitHub

```bash
cd VidyaCF
git init
git add .
git commit -m "Vidya: Cloudflare Pages + D1 edition"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 3. Create the D1 database on Cloudflare

```bash
npx wrangler login
npx wrangler d1 create vidya-db
```

This prints a `database_id`. Open `wrangler.toml` and replace
`REPLACE_WITH_YOUR_DATABASE_ID` with that value, then commit and push
that change too.

Load the schema and data into the **remote** (production) database:

```bash
npx wrangler d1 execute vidya-db --remote --file=./schema.sql
npx wrangler d1 execute vidya-db --remote --file=./seed.sql
```

## 4. Connect the repo in Cloudflare Pages

1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
2. Pick the GitHub repo you pushed in step 2.
3. Build settings: **Framework preset: None**, **Build command: (leave empty)**,
   **Build output directory: `/`** (the project root -- everything is
   already static, nothing needs building).
4. Deploy. Cloudflare will pick up `wrangler.toml`'s `[[d1_databases]]`
   block automatically and bind it as `env.DB` in every function. If a
   deploy ever complains it can't find the binding, add it manually
   under the Pages project's **Settings -> Functions -> D1 database
   bindings** (variable name `DB`, pointing at `vidya-db`) for both the
   Production and Preview environments, then retrigger the deploy.

Every future `git push` to the connected branch auto-deploys.

## 5. Verify

Visit `https://<your-project>.pages.dev/healthz` -- it should return
`{"status":"ok"}`. Then open the site root and click through a full
quiz; check `Correct#`/`Incorrect#` are updating with:

```bash
npx wrangler d1 execute vidya-db --remote --command="SELECT Id, \"Correct#\", \"Incorrect#\" FROM Kerala_9_English_Book1_MCQ LIMIT 5"
```

## Notes / limitations

- Cloudflare Pages automatically redirects `/topic_selection.html` (and
  the other `.html` paths) to the extensionless `/topic_selection` with
  a 308 -- this is expected Pages behaviour, browsers follow it
  transparently, and no code changes were needed for it.
- D1 has a generous free tier (5 GB storage, 5 million rows read/day as
  of when this was written) -- comfortably enough for this app's 3,000
  rows, but double-check current limits on Cloudflare's pricing page if
  you expect heavy traffic.
- If you want the `pytest` suite ported to run against this stack too
  (e.g. with `vitest` + Miniflare), let me know and I can add it.

## Using your own data

Same as the Flask version: replace the contents of `MasterData` and add
a matching `<Syllabus>_<Grade>_<Language>_Book<Book#>_<Type>` table
(same columns as `Kerala_9_English_Book1_MCQ`, keyed by the unique
`ChapterId`). Regenerate `schema.sql`/`seed.sql` from your own SQLite
file, or write new INSERT statements directly, then re-run the
`d1 execute --remote` commands from step 3.
