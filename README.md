# Vidya (Cloudflare Workers + Static Assets + D1 edition)

This is a port of the Flask/SQLite Vidya quiz app to run entirely on
Cloudflare's free edge stack: a **Cloudflare Worker** (serving the
static HTML/CSS/JS and handling the API in one script) plus
**Cloudflare D1** (a serverless, SQLite-compatible database) --
deployed straight from a GitHub repo, no server to manage.

It is functionally identical to the Flask version: same 6 screens, same
`MasterData` / `Kerala_9_English_Book1_MCQ` schema, same 30 chapters /
3,000 MCQs, and the same security behaviour (the correct answer is
never sent to the browser until `/api/answer` confirms it,
`/api/answer` recomputes correctness server-side, and table names are
checked against a whitelist).

## Why "Workers", not "Pages"

This project was originally built for Cloudflare Pages (a `functions/`
folder of Pages Functions). In practice, deploying a Git-connected
Pages project with a custom `wrangler pages deploy` command turned out
to be unreliable -- Cloudflare kept reporting "The Pages project ...
does not exist" even for a project name that matched the dashboard
exactly (this is a known limitation, not specific to this app). The
currently-supported, well-documented path for a new Git-connected
full-stack site on Cloudflare is a Worker with a static-assets binding,
so that's what this folder now contains. See `deployment.txt` for the
full story and step-by-step setup.

## Files

```
Vidya-cloudflare/
  worker.js              Single Worker entry point (routes /api/* + /healthz,
                          everything else falls through to ./public)
  public/
    index.html, topic_selection.html, question.html,
    results.html, section_results.html, question_review.html
                          The 6 screens (static HTML)
    static/css/style.css  Shared responsive (mobile-first) styling
    static/js/*.js        One vanilla-JS file per page, plus common.js helpers
  schema.sql              CREATE TABLE statements for D1
  seed.sql                INSERT statements (30 chapters, 3,000 MCQs) for D1
                          -- kept outside public/ on purpose, since it
                          contains every question's correct answer
  wrangler.toml           Worker name, static-assets directory, D1 binding
  package.json            Convenience scripts (dev, db:*, deploy)
  deployment.txt          Full step-by-step deployment guide
```

## How it works

1. **Selection Page** (`public/index.html`) loads all rows of
   `MasterData` and builds seven cascading dropdowns (Syllabus, Grade,
   Medium/Language, Subject, Book, Chapter, Type). The **OK** button
   stays disabled until the combination you've picked matches an actual
   `MasterData` row.
2. On **OK**, the app derives the question table name from the pattern
   `<Syllabus>_<Grade>_<Language>_Book<Book#>_<Type>` -- keyed on the
   medium of instruction, not the school Subject, because one MCQ table
   holds every subject taught in that language/grade/book. It then
   opens **Topic_Selection**, listing that chapter's sections with a
   difficulty slider (1-5), filtered by the chapter's unique
   `ChapterId` (not `Chapter#`, which repeats across subjects).
3. Selecting one or more sections and pressing **OK** asks the Worker
   for up to 10 random questions (filtered by `ChapterId`, section, and
   max difficulty). The correct answer is **not** included in this
   response.
4. Each question screen keeps **Next** disabled until an option is
   chosen. Pressing **Next** sends only the selected letter to
   `/api/answer`; the Worker looks up the real answer, decides
   correctness, increments `Correct#`/`Incorrect#` on that row in D1,
   and reports the result back.
5. After question 10, **Results** shows a score percentage per section
   (Review fades out at 100%). Drilling into a section shows each
   question's your-answer/correct-answer (wrong answers in red), and
   drilling into a question shows the full option list with the
   correct answer highlighted green and any wrong pick highlighted red.

Quiz progress lives in the browser's `sessionStorage`, so it resets if
you close the tab or click Home.

## Try it locally

```bash
cd Vidya-cloudflare
npx wrangler d1 execute vidya-db --local --file=./schema.sql
npx wrangler d1 execute vidya-db --local --file=./seed.sql
npx wrangler dev
```

Open **http://localhost:8787/**. This runs the exact same `worker.js`
code and an emulated local D1 database.

## Deploying to mystudies.org

See `deployment.txt` in this folder for the full walkthrough: pushing
to GitHub, creating and seeding the D1 database, connecting the repo
as a Cloudflare Worker, confirming the D1 binding, and attaching
mystudies.org as a custom domain.

## Security notes

- The correct answer is only ever revealed by `/api/answer`, after the
  user has committed to a choice -- never shipped in the quiz-start
  payload.
- `/api/answer` recomputes correctness from the database itself; it
  does not trust a client-supplied "this was correct" flag.
- `/api/answer`'s `table` parameter is checked against a whitelist
  derived from `MasterData`, so a client can't redirect writes to an
  unrelated table.
- `schema.sql`/`seed.sql` (which contain every correct answer) live
  outside `public/`, so the assets binding never serves them to a
  browser directly.
- All API inputs are type/range validated and return `400`/`404` with a
  JSON error body on bad input; unhandled exceptions return a generic
  `500` (no stack traces sent to the client).

## Using your own data

Replace the contents of `MasterData` and add a matching
`<Syllabus>_<Grade>_<Language>_Book<Book#>_<Type>` table (same columns
as `Kerala_9_English_Book1_MCQ`, keyed by the unique `ChapterId`).
Regenerate `schema.sql`/`seed.sql` from your own SQLite file, or write
new INSERT statements directly, then re-run the `d1 execute --remote`
commands from `deployment.txt` Step 4.
