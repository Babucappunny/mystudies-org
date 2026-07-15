/**
 * Vidya -- Cloudflare Workers (Static Assets + D1) edition.
 *
 * Single Worker entry point. Static files (HTML/CSS/JS) live in ./public
 * and are served automatically by the [assets] binding configured in
 * wrangler.toml -- Cloudflare checks for a matching static file FIRST and
 * only calls this fetch handler when no static file matches the request
 * path, which is exactly the /api/* and /healthz routes below. This means
 * the routing in this file only ever needs to handle the API.
 *
 * This replaces the earlier functions/api/*.js (Cloudflare Pages
 * Functions) files -- Pages Git-integration deploys turned out not to
 * work reliably for this project (Cloudflare kept reporting "The Pages
 * project ... does not exist" even after fixing the name), so the app is
 * now packaged the way Cloudflare currently recommends for new Git-
 * connected full-stack projects: a Worker with a static-assets binding.
 */

const SAFE_TABLE_NAME = /^[A-Za-z0-9_]+$/;

function mcqTableName(row) {
  // NOTE: this used to build the table name from row.Language (the medium
  // of instruction). That broke once Malayalam-medium chapters (Language =
  // "മലയാളം") were added alongside the original English-medium ones,
  // because both actually live in the SAME physical table,
  // "Kerala_9_English_Book1_MCQ" -- "English" here is just this content
  // pack's fixed label, not a per-row medium-of-instruction lookup. So the
  // table name is now derived from Syllabus/Grade/Book#/Type only, with
  // "English" as a fixed segment matching the one table that actually
  // exists. If a genuinely different table is ever introduced (e.g. a new
  // book or a different syllabus), this will need a real per-row lookup
  // again (ideally via an explicit "Table" column on MasterData rather
  // than guessing from other fields).
  const syllabus = String(row.Syllabus).trim().replace(/ /g, "_");
  const grade = String(row.Grade).trim();
  const book = String(row["Book#"]).trim();
  const qtype = String(row.Type).trim().replace(/ /g, "_");
  return `${syllabus}_${grade}_English_Book${book}_${qtype}`;
}

async function tableExists(db, tableName) {
  if (!tableName || !SAFE_TABLE_NAME.test(tableName)) return false;
  const row = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .bind(tableName)
    .first();
  return row !== null;
}

async function validMcqTables(db) {
  const { results } = await db
    .prepare('SELECT DISTINCT "Syllabus","Grade","Language","Book#","Type" FROM "MasterData"')
    .all();
  return new Set((results || []).map(mcqTableName));
}

function json(data, init) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init && init.headers) },
  });
}

function errorJson(message, status) {
  return json({ error: message }, { status: status || 400 });
}

// ---------------------------------------------------------------------
// Route handlers (same behaviour as the previous Pages Functions)
// ---------------------------------------------------------------------

async function handleMasterdata(request, env) {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM "MasterData"').all();
    return json(results || []);
  } catch (err) {
    return errorJson("Failed to load MasterData: " + err.message, 500);
  }
}

async function handleTopics(request, env) {
  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  const masterId = Number(idParam);

  if (!idParam || !Number.isInteger(masterId)) {
    return errorJson("Query param 'id' (integer) is required", 400);
  }

  const db = env.DB;
  const masterRow = await db.prepare('SELECT * FROM "MasterData" WHERE "Id" = ?').bind(masterId).first();
  if (!masterRow) return errorJson("Selection not found", 404);

  const table = mcqTableName(masterRow);
  if (!(await tableExists(db, table))) {
    return errorJson(`No question table '${table}' found`, 404);
  }

  const { results } = await db
    .prepare(
      `SELECT "Section" as section, COUNT(*) as cnt
       FROM "${table}"
       WHERE "ChapterId" = ?
       GROUP BY "Section"
       ORDER BY MIN("Id")`
    )
    .bind(masterRow.ChapterId)
    .all();

  return json({
    chapterId: masterRow.ChapterId,
    chapter: masterRow.Chapter,
    chapterNum: masterRow["Chapter#"],
    table,
    sections: (results || []).map((r) => ({ name: r.section, count: r.cnt })),
  });
}

async function handleQuizStart(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    data = {};
  }

  const masterId = Number(data.masterId);
  if (!Number.isInteger(masterId)) {
    return errorJson("masterId (integer) is required", 400);
  }

  const sections = data.sections;
  if (!Array.isArray(sections) || sections.length === 0 || !sections.every((s) => typeof s === "string")) {
    return errorJson("sections must be a non-empty list of strings", 400);
  }

  let maxDifficulty = Number(data.maxDifficulty ?? 5);
  if (!Number.isFinite(maxDifficulty)) {
    return errorJson("maxDifficulty must be an integer", 400);
  }
  maxDifficulty = Math.max(1, Math.min(5, Math.round(maxDifficulty)));

  const db = env.DB;
  const masterRow = await db.prepare('SELECT * FROM "MasterData" WHERE "Id" = ?').bind(masterId).first();
  if (!masterRow) return errorJson("Selection not found", 404);

  const table = mcqTableName(masterRow);
  if (!(await tableExists(db, table))) {
    return errorJson(`No question table '${table}' found`, 404);
  }

  const placeholders = sections.map(() => "?").join(",");
  const query = `
    SELECT "Id","Section","Question","OptionA","OptionB","OptionC","OptionD"
    FROM "${table}"
    WHERE "ChapterId" = ? AND "Section" IN (${placeholders}) AND "Difficulty" <= ?
    ORDER BY RANDOM()
    LIMIT 10
  `;
  const params = [masterRow.ChapterId, ...sections, maxDifficulty];
  const { results } = await db.prepare(query).bind(...params).all();

  const questions = (results || []).map((r) => ({
    id: r.Id,
    section: r.Section,
    question: r.Question,
    options: { A: r.OptionA, B: r.OptionB, C: r.OptionC, D: r.OptionD },
  }));

  return json({
    table,
    chapterId: masterRow.ChapterId,
    chapter: masterRow.Chapter,
    chapterNum: masterRow["Chapter#"],
    questions,
  });
}

async function handleAnswer(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    data = {};
  }

  const table = data.table;
  const selected = data.selected;
  const questionId = Number(data.questionId);

  if (!Number.isInteger(questionId)) {
    return errorJson("questionId (integer) is required", 400);
  }
  if (!["A", "B", "C", "D"].includes(selected)) {
    return errorJson("selected must be one of 'A', 'B', 'C', 'D'", 400);
  }

  const db = env.DB;
  const allowedTables = await validMcqTables(db);
  if (typeof table !== "string" || !allowedTables.has(table) || !(await tableExists(db, table))) {
    return errorJson("Unknown table", 400);
  }

  const row = await db.prepare(`SELECT "Correct" FROM "${table}" WHERE "Id" = ?`).bind(questionId).first();
  if (!row) return errorJson("Question not found", 404);

  const correctLetter = row.Correct;
  const isCorrect = selected === correctLetter;
  const column = isCorrect ? '"Correct#"' : '"Incorrect#"';

  await db.prepare(`UPDATE "${table}" SET ${column} = ${column} + 1 WHERE "Id" = ?`).bind(questionId).run();

  return json({ ok: true, correct: correctLetter, isCorrect });
}

async function handleHealthz(request, env) {
  try {
    await env.DB.prepare("SELECT 1").first();
    return json({ status: "ok" });
  } catch (err) {
    return errorJson("Health check DB probe failed: " + err.message, 503);
  }
}

// ---------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    try {
      if (pathname === "/healthz" && method === "GET") {
        return await handleHealthz(request, env);
      }
      if (pathname === "/api/masterdata" && method === "GET") {
        return await handleMasterdata(request, env);
      }
      if (pathname === "/api/topics" && method === "GET") {
        return await handleTopics(request, env);
      }
      if (pathname === "/api/quiz/start" && method === "POST") {
        return await handleQuizStart(request, env);
      }
      if (pathname === "/api/answer" && method === "POST") {
        return await handleAnswer(request, env);
      }
    } catch (err) {
      return errorJson("Internal server error: " + err.message, 500);
    }

    // Anything else that reaches the Worker (rather than being served
    // directly from ./public by the assets binding) is a genuine 404.
    if (pathname.startsWith("/api/") || pathname === "/healthz") {
      return errorJson("Not found", 404);
    }
    return env.ASSETS.fetch(request);
  },
};
