// GET /api/topics?id=<MasterData.Id>
// Returns chapter info + the list of distinct sections (with question
// counts) from the matching MCQ table, filtered by the chapter's unique
// ChapterId (not Chapter#, which is reused across different subjects).
import { mcqTableName, tableExists, json, errorJson } from "../_common.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  const masterId = Number(idParam);

  if (!idParam || !Number.isInteger(masterId)) {
    return errorJson("Query param 'id' (integer) is required", 400);
  }

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
