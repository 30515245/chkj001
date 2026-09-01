const SECRET = "Abc123456Log2026";

function isAuthed(request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some(c => c.trim() === `auth=${SECRET}`);
}

function csvCell(v) {
  v = String(v ?? "");
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function onRequest({ request, env }) {
  // 复用 /logs 的登录态（HttpOnly cookie），未登录拒绝
  if (!isAuthed(request)) {
    return new Response("未授权", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const url = new URL(request.url);
  const bot = url.searchParams.get("bot") === "1" ? 1 : 0;       // 1=隐藏机器人
  const minDur = url.searchParams.get("min_dur") === "1" ? 1 : 0; // 1=仅有效访问(有停留)

  let sql = "SELECT * FROM visit_record WHERE 1=1";
  if (bot) sql += " AND (is_bot IS NULL OR is_bot != 1)";
  if (minDur) sql += " AND duration > 0";
  sql += " ORDER BY ts DESC, id DESC LIMIT 5000";

  const { results } = await env.DB.prepare(sql).run();
  const rows = results || [];

  const head = ["ID", "时间", "停留(秒)", "路径", "渠道", "省", "市", "客户端", "来源", "国家", "User-Agent"];
  const csv = [head, ...rows.map(r => [
    r.id, r.visit_time, r.duration, r.visit_path, r.source, r.region, r.city,
    r.client, r.referer, r.country, r.user_agent
  ])].map(line => line.map(csvCell).join(",")).join("\r\n");

  const stamp = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const fname = `visit_log_${stamp}.csv`;

  return new Response("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store"
    }
  });
}
