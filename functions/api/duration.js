export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ code: 405, msg: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" }
    });
  }

  let vid = "";
  let duration = 0;
  try {
    // 不依赖 Content-Type：sendBeacon(纯字符串/Blob) 与 fetch 均按明文读取后解析，
    // 避免 content-type 不匹配时 duration 静默变 0。
    const text = await request.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch (e) { body = null; }
      if (!body) {
        // 表单兜底，兼容可能的历史 form 上报
        const sp = new URLSearchParams(text);
        vid = sp.get("vid") || "";
        duration = parseInt(sp.get("duration"), 10) || 0;
      }
    }
    if (body) {
      vid = body.vid || "";
      duration = parseInt(body.duration, 10) || 0;
    }
  } catch (e) {
    return new Response(JSON.stringify({ code: 400, msg: "bad request" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  if (!vid) {
    return new Response(JSON.stringify({ code: 400, msg: "missing vid" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    // UPSERT 消除竞态：若中间件 waitUntil 的异步 INSERT 尚未提交，此处先写入；
    // 随后中间件 INSERT 触发 ON CONFLICT 补齐元数据并保留本处已回写的时长。
    await env.DB.prepare(
      "INSERT INTO visit_record (visit_id, duration, ts) VALUES (?, ?, ?) " +
      "ON CONFLICT(visit_id) DO UPDATE SET duration = excluded.duration"
    ).bind(vid, duration, Math.floor(Date.now() / 1000)).run();
    return new Response(JSON.stringify({ code: 200 }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ code: 500, error_msg: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}