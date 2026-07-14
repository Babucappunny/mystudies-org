// POST /api/answer
// Looks up the correct option server-side (never trusts the client's
// opinion of whether it was right), increments Correct#/Incorrect# on the
// matching MCQ row, and returns the correct answer so the UI can show
// immediate feedback.
import { tableExists, validMcqTables, json, errorJson } from "../_common.js";

export async function onRequestPost(context) {
  const { env, request } = context;
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

  const row = await db
    .prepare(`SELECT "Correct" FROM "${table}" WHERE "Id" = ?`)
    .bind(questionId)
    .first();
  if (!row) return errorJson("Question not found", 404);

  const correctLetter = row.Correct;
  const isCorrect = selected === correctLetter;
  const column = isCorrect ? '"Correct#"' : '"Incorrect#"';

  await db
    .prepare(`UPDATE "${table}" SET ${column} = ${column} + 1 WHERE "Id" = ?`)
    .bind(questionId)
    .run();

  return json({ ok: true, correct: correctLetter, isCorrect });
}
