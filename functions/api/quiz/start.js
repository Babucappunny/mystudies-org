// POST /api/quiz/start
// Picks up to 10 random questions from the selected sections (optionally
// capped by a max difficulty from the slider). The "Correct" option is
// intentionally NOT included in the response -- it's only ever revealed
// via /api/answer, after the user has committed to an answer.
import { mcqTableName, tableExists, json, errorJson } from "../../_common.js";

export async function onRequestPost(context) {
  const { env, request } = context;
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
  const masterRow = await db
    .prepare('SELECT * FROM "MasterData" WHERE "Id" = ?')
    .bind(masterId)
    .first();
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
