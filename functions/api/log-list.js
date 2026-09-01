export async function onRequest({ request, env }) {
  try {
    const SECRET_KEY = "Abc123456Log2026";
    const urlObj = new URL(request.url);
    const authToken = urlObj.searchParams.get("token");

    if (authToken !== SECRET_KEY) {
      return Response.json({ code: 403, msg: "Token校验失败", receive: authToken }, { status: 403 });
    }
    // 查询日志数据
    const { results } = await env.DB.prepare(`
      SELECT * FROM visit_record ORDER BY visit_time DESC LIMIT 100
    `).run();
    return Response.json({
      code: 200,
      total: results.length,
      list: results
    });
  } catch (err) {
    // 抛出异常时返回错误信息，不再空白跳转首页
    return Response.json({ code: 500, error_msg: err.message }, { status: 500 });
  }
}
