/**
 * Shared helpers for all Cloudflare Pages Functions in this project.
 * Mirrors the logic in the original Flask app.py, ported to D1.
 */

const SAFE_TABLE_NAME = /^[A-Za-z0-9_]+$/;

/** Build the MCQ table name from a MasterData row: the pattern is
 * '<Syllabus>_<Grade>_<Language>_Book<Book#>_<Type>' (keyed on the medium
 * of instruction, not the school Subject -- one MCQ table holds every
 * subject for that language/grade/book, distinguished by ChapterId). */
export function mcqTableName(row) {
  const syllabus = String(row.Syllabus).trim().replace(/ /g, "_");
  const grade = String(row.Grade).trim();
  const language = String(row.Language).trim().replace(/ /g, "_");
  const book = String(row["Book#"]).trim();
  const qtype = String(row.Type).trim().replace(/ /g, "_");
  return `${syllabus}_${grade}_${language}_Book${book}_${qtype}`;
}

export async function tableExists(db, tableName) {
  if (!tableName || !SAFE_TABLE_NAME.test(tableName)) return false;
  const row = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .bind(tableName)
    .first();
  return row !== null;
}

/** Whitelist of MCQ table names actually reachable from MasterData, so a
 * client can't point /api/answer at an arbitrary table. */
export async function validMcqTables(db) {
  const { results } = await db
    .prepare('SELECT DISTINCT "Syllabus","Grade","Language","Book#","Type" FROM "MasterData"')
    .all();
  return new Set((results || []).map(mcqTableName));
}

export function json(data, init) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init && init.headers) },
  });
}

export function errorJson(message, status) {
  return json({ error: message }, { status: status || 400 });
}
