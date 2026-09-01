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
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await request.json();
      vid = body.vid || "";
      duration = parseInt(body.duration, 10) || 0;
    } else {
      const fd = await request.formData();
      vid = fd.get("vid") || "";
      duration = parseInt(fd.get("duration"), 10) || 0;
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
    await env.DB.prepare(
      "UPDATE visit_record SET duration = ? WHERE visit_id = ?"
    ).bind(duration, vid).run();
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
