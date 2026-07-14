// GET /healthz -- for uptime monitors
import { json, errorJson } from "./_common.js";

export async function onRequestGet(context) {
  try {
    await context.env.DB.prepare("SELECT 1").first();
    return json({ status: "ok" });
  } catch (err) {
    return errorJson("Health check DB probe failed: " + err.message, 503);
  }
}
