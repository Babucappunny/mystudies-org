// GET /api/masterdata -- drives the Selection Page dropdowns
import { json, errorJson } from "../_common.js";

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare('SELECT * FROM "MasterData"').all();
    return json(results || []);
  } catch (err) {
    return errorJson("Failed to load MasterData: " + err.message, 500);
  }
}
