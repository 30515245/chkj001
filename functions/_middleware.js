/** @type {import("@cloudflare/pages-plugin-types").PagesFunction} */

// 恶意/探测/扫描路径：命中则返回 404 且不入访问日志（避免安全暴露与统计污染）
const probePatterns = [
  /^\/robots\.txt$/i,
  /^\/sitemap(\.xml|_index\.xml|\.xml\.gz|\.gz)?$/i,
  /(^|\/)(\.git|\.svn|\.hg|\.env|\.npmrc|\.htaccess|\.gitlab-ci|\.netrc|\.env\.)/i,
  /(^|\/)(server\.(key|pem|p12|jks|crt)|id_rsa|dump\.sql|database\.sql|backup)(\/|$)/i,
  /\.(sql|bak|old|swp|save|backup|log|gz|tar|zip)(\/|$)/i,
  /(^|\/)(user_secrets|secret(s|s\.json|s\.yaml)?|credentials|access|phpinfo|config\.php|wp-config\.php|phpunit|artisan|laravel\.log)(\/|$)/i,
  /(^|\/)(composer\.(json|lock)|package\.json|yarn\.lock|Dockerfile|docker-compose)(\/|$)/i,
  /(^|\/)(web\.config|crossdomain\.xml|boot\.ini|etc\/passwd|proc\/|winnt\/|cgi-bin)(\/|$)/i,
  /(^|\/)(wp-admin|wp-includes|wp-content|wp-login)/i,
  /(^|\/)(actuator|storage|vendor|officialsite)/i,
  /(^|\/)alvin9999\//i,
  /\.php(\/|$|\.)/i,
  /^(?:\/[^/]+){2,}$/, // 三段及以上深路径（本站页面均为 ≤2 段，防扫描噪流）
];
const isProbe = (p) => probePatterns.some(re => re.test(p || ""));

// 只对真实内容页做访问记录 + 注入追踪（白名单，与数据清理口径一致）
// 单段探测路径（/config.json、/graphql、/login、/appsettings.* 等）黑名单匹配不到，
// 统一在此拦截不记录，从源头防止统计污染复发；新增页面需同步加入。
const LOGGABLE = new Set([
  "/", "/page-1", "/page-2", "/page-3", "/page-4", "/page-5", "/page-6", "/page-7", "/page-8",
  "/rongping-road-19-green-energy-proposal",
]);
const isLoggable = (p) => LOGGABLE.has(p);

export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  // 排除静态资源请求（css/js/png/ico等，只记录页面访问）
  const staticExt = [".css", ".js", ".png", ".jpg", ".gif", ".ico", ".svg", ".woff", ".ttf"];
  if (staticExt.some(ext => url.pathname.endsWith(ext))) {
    return context.next();
  }
  // 排除接口类请求（如停留时长上报 /api/duration），只记录真实页面访问
  if (url.pathname.startsWith("/api/")) {
    return context.next();
  }
  // Cloudflare Pages 会把 /xxx.html 永久 308 重定向到 /xxx；若此处也记录会产生重复日志。
  // 跳过 .html 请求，由重定向后的干净 URL 统一记录一次。
  if (url.pathname.endsWith(".html")) {
    return context.next();
  }
  // 后台查看页 /logs 及其登录/退出，属于运营动作，不入访问统计
  if (url.pathname === "/logs") {
    return context.next();
  }
  // 恶意/探测路径：返回 404 且不记录
  if (isProbe(url.pathname)) {
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  // 白名单：只对真实内容页做访问记录与追踪注入，其余未知路径一律不入日志
  if (!isLoggable(url.pathname)) {
    return context.next();
  }

  // 读取CF原生全部访客信息
  const headers = request.headers;
  // 注意：城市/地区/时区只能通过 request.cf 对象获取（cf-ipcity/cf-region/cf-timezone 并非真实请求头，恒为空）
  const cf = request.cf || {};

  // 国家 ISO 代码 → 中文名（未匹配则保留原代码）
  const COUNTRY_CN = {
    CN: "中国", HK: "中国香港", TW: "中国台湾", MO: "中国澳门",
    JP: "日本", KR: "韩国", KP: "朝鲜",
    US: "美国", CA: "加拿大", MX: "墨西哥",
    GB: "英国", IE: "爱尔兰", FR: "法国", DE: "德国", IT: "意大利",
    ES: "西班牙", PT: "葡萄牙", NL: "荷兰", BE: "比利时", CH: "瑞士",
    AT: "奥地利", SE: "瑞典", NO: "挪威", DK: "丹麦", FI: "芬兰",
    PL: "波兰", RU: "俄罗斯", UA: "乌克兰", CZ: "捷克", HU: "匈牙利",
    AU: "澳大利亚", NZ: "新西兰",
    SG: "新加坡", MY: "马来西亚", TH: "泰国", VN: "越南", PH: "菲律宾",
    ID: "印度尼西亚", IN: "印度", BD: "孟加拉国", LK: "斯里兰卡",
    BR: "巴西", AR: "阿根廷", CL: "智利", CO: "哥伦比亚", PE: "秘鲁",
    ZA: "南非", EG: "埃及", AE: "阿联酋", SA: "沙特阿拉伯", TR: "土耳其",
    IL: "以色列", QA: "卡塔尔", KW: "科威特",
    KZ: "哈萨克斯坦", MN: "蒙古",
  };
  const cnCountry = (code) => COUNTRY_CN[(code || "").toUpperCase()] || code || "未知";

  // 常见国际城市罗马字 → 中文（中国访客 CF 已返回中文，原样保留）
  const CITY_CN = {
    // 日本
    tokyo: "东京", osaka: "大阪", kyoto: "京都", yokohama: "横滨",
    nagoya: "名古屋", sapporo: "札幌", kobe: "神户", fukuoka: "福冈",
    chiba: "千叶", kawasaki: "川崎", hiroshima: "广岛", sendai: "仙台",
    shizuoka: "静冈", kumamoto: "熊本", niigata: "新潟", okayama: "冈山",
    kanazawa: "金泽", nagasaki: "长崎", kagoshima: "鹿儿岛", asahikawa: "旭川",
    hakodate: "函馆", saitama: "埼玉", okinawa: "冲绳", nara: "奈良",
    // 韩国
    seoul: "首尔", busan: "釜山", incheon: "仁川",
    // 美国
    "new york": "纽约", "los angeles": "洛杉矶", chicago: "芝加哥",
    "san francisco": "旧金山", seattle: "西雅图", boston: "波士顿",
    "washington": "华盛顿", miami: "迈阿密", houston: "休斯顿",
    dallas: "达拉斯", atlanta: "亚特兰大", philadelphia: "费城", "san diego": "圣地亚哥",
    // 欧洲
    london: "伦敦", manchester: "曼彻斯特", paris: "巴黎", lyon: "里昂",
    berlin: "柏林", munich: "慕尼黑", madrid: "马德里", barcelona: "巴塞罗那",
    rome: "罗马", milan: "米兰", amsterdam: "阿姆斯特丹", vienna: "维也纳",
    zurich: "苏黎世", geneva: "日内瓦", copenhagen: "哥本哈根", oslo: "奥斯陆",
    stockholm: "斯德哥尔摩",
    // 东南亚 / 大洋洲
    singapore: "新加坡", bangkok: "曼谷", "hong kong": "香港", macau: "澳门",
    taipei: "台北", "kuala lumpur": "吉隆坡", jakarta: "雅加达", manila: "马尼拉",
    "ho chi minh": "胡志明市", hanoi: "河内", sydney: "悉尼", melbourne: "墨尔本",
    brisbane: "布里斯班", perth: "珀斯",
    // 其他
    toronto: "多伦多", vancouver: "温哥华", moscow: "莫斯科", dubai: "迪拜",
    "new delhi": "新德里", mumbai: "孟买",
  };
  const cnCity = (city) => {
    if (!city) return "";
    if (/[一-龥]/.test(city)) return city; // 已含中文，原样保留
    return CITY_CN[city.toLowerCase()] || city;
  };

  // 客户端/设备短标签：定向传播场景，UA 全文太宽且无用，只看"用什么打开"
  const parseClient = (ua) => {
    ua = ua || "";
    if (/MicroMessenger/i.test(ua)) return "微信";
    if (/DingTalk/i.test(ua)) return "钉钉";
    if (/wxwork|EnterpriseWeChat/i.test(ua)) return "企业微信";
    if (/QQ\//i.test(ua)) return "QQ";
    if (/Weibo/i.test(ua)) return "微博";
    // 华为鸿蒙(OpenHarmony)内嵌浏览器(ArkWeb)的 UA 不写 Android/iOS，需在 Chrome 之前单独识别
    if (/OpenHarmony|HarmonyOS|ArkWeb/i.test(ua)) return "鸿蒙";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Android/i.test(ua)) return "Android";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac OS|Macintosh/i.test(ua)) return "Mac";
    if (/Linux/i.test(ua)) return "Linux";
    // 移动端通用兜底：无 OS 特征词但标了 Mobile 的 WebView，不误判成桌面浏览器
    if (/Mobile|Mobi/i.test(ua)) return "移动端";
    if (/Chrome/i.test(ua)) return "Chrome";
    if (/Firefox/i.test(ua)) return "Firefox";
    if (/Edg/i.test(ua)) return "Edge";
    if (/Safari/i.test(ua)) return "Safari";
    return "其他";
  };

  // 渠道归因：定向传播时通过 utm 或 IM 识别客户从哪来（哪封邮件 / 哪个群）
  const parseSource = (u, referer, ua) => {
    const us = u.searchParams.get("utm_source");
    if (us) return us;
    ua = ua || "";
    if (/MicroMessenger/i.test(ua)) return "微信";
    if (/DingTalk/i.test(ua)) return "钉钉";
    if (/wxwork|EnterpriseWeChat/i.test(ua)) return "企业微信";
    if (referer) {
      try {
        const h = new URL(referer).hostname.toLowerCase();
        if (/weixin|qq\.com/.test(h)) return "微信";
        if (/dingtalk/.test(h)) return "钉钉";
        if (/mail|163\.com|qq\.com|outlook|gmail|foxmail/.test(h)) return "邮件";
        if (h && h !== "null") return h;
      } catch (e) {}
    }
    return "直接访问";
  };

  // 机器人/预览爬虫标记：明确爬虫直接标记（微信/钉钉预览与真实打开 UA 相同，无法区分，故不在此列）
  const isBot = (ua) => {
    ua = (ua || "").toLowerCase();
    return /slackbot|telegrambot|discordbot|facebookexternalhit|whatsapp|bytespider|spider|bot|crawl|python-requests|curl|go-http|preview|nmap|masscan|zgrab|sqlmap|nikto|wpscan|acunetix|nessus|semrush|ahrefs|mj12|petalbot|sogou|yandexbot|baiduspider|360spider|twitterbot|linkedinbot|httpclient|okhttp|lighthouse|headlesschrome|phantomjs|screamingfrog|scrapy|nutch|archive-org_bot|node-fetch|axios|netcraft|builtwith|wappalyzer|zoominfo|dotbot|java\/|libwww|wget/.test(ua);
  };

  const uaRaw = headers.get("User-Agent") || "";
  const refererRaw = headers.get("referer") || "";
  const logData = {
    visit_url: url.href,
    visit_path: url.pathname,
    visitor_ip: headers.get("CF-Connecting-IP") || "unknown",
    user_agent: uaRaw,
    country: cnCountry(cf.country || headers.get("cf-ipcountry") || ""),
    region: cf.region || "",
    city: cnCity(cf.city || ""),
    timezone: cf.timezone || "",
    referer: refererRaw,
    client: parseClient(uaRaw),
    source: parseSource(url, refererRaw, uaRaw),
    is_bot: isBot(uaRaw) ? 1 : 0,
  };

  // 计算中国时间 (UTC+8)，避免 Cloudflare 运行时默认 UTC 导致日志慢 8 小时
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const chinaTime = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} `
    + `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

  // 每页生成唯一访问 ID，供客户端上报停留时长时回写对应记录
  const visitId = crypto.randomUUID();
  // epoch 秒时间戳，便于按日期区间筛选与正确排序（字符串 visit_time 仅用于展示）
  const ts = Math.floor(Date.now() / 1000);

  // 独立访客识别：稳定的第一方 cookie（uv）跨页/跨会话复用，首次访问才生成
  // 比按 visitor_ip 去重更准确（移动网络/公司 NAT 不再把多人误并或误分）
  const cookieRaw = headers.get("cookie") || "";
  const uvMatch = cookieRaw.match(/(?:^|;\s*)uv=([^;]+)/);
  const uvId = uvMatch ? uvMatch[1] : crypto.randomUUID();

  // 异步写入数据库，waitUntil不会阻塞页面响应速度
  const saveLog = async () => {
    try {
      // 是否新客：该 uv 是否已在库中出现过（首次访问 is_new=1，便于新客/回访口径）
      const found = await env.DB.prepare("SELECT COUNT(*) AS c FROM visit_record WHERE uv_id = ?").bind(uvId).first();
      const isNew = (found && Number(found.c) > 0) ? 0 : 1;
      await env.DB.prepare(`
      INSERT INTO visit_record
      (visit_url, visit_path, visitor_ip, user_agent, country, region, city, timezone, referer, visit_time, visit_id, ts, client, source, is_bot, duration, uv_id, is_new)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(visit_id) DO UPDATE SET
        visit_url=excluded.visit_url, visit_path=excluded.visit_path, visitor_ip=excluded.visitor_ip,
        user_agent=excluded.user_agent, country=excluded.country, region=excluded.region, city=excluded.city,
        timezone=excluded.timezone, referer=excluded.referer, visit_time=excluded.visit_time,
        ts=excluded.ts, client=excluded.client, source=excluded.source, is_bot=excluded.is_bot,
        uv_id=excluded.uv_id, is_new=excluded.is_new
      `)
        .bind(
          logData.visit_url,
          logData.visit_path,
          logData.visitor_ip,
          logData.user_agent,
          logData.country,
          logData.region,
          logData.city,
          logData.timezone,
          logData.referer,
          chinaTime,
          visitId,
          ts,
          logData.client,
          logData.source,
          logData.is_bot,
          uvId,
          isNew
        )
        .run();
    } catch (err) {
      console.error("访问日志写入失败：", err);
    }
  };
  waitUntil(saveLog());

  // 正常返回原网页；对 HTML 页面注入停留时长追踪脚本，并通过 Cookie 下发 visit_id
  const resp = await context.next();
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    const html = await resp.text();
    if (!html.includes("__SNS_TRACK__")) {
      const tracker = `<script>/*__SNS_TRACK__*/(function(){try{var m=document.cookie.match(/(?:^|;\\s*)pv=([^;]+)/);var vid=m&&m[1];if(!vid)return;var s=Date.now(),max=0;function send(){var d=Math.round((Date.now()-s)/1000);if(d<=0||d<=max)return;max=d;var j=JSON.stringify({vid:vid,duration:d});var ok=false;try{if(navigator.sendBeacon&&navigator.sendBeacon('/api/duration',j)){ok=true;}}catch(e){}if(!ok){try{fetch('/api/duration',{method:'POST',headers:{'Content-Type':'application/json'},body:j,keepalive:true});ok=true;}catch(e){}}if(!ok){try{fetch('/api/duration',{method:'POST',headers:{'Content-Type':'application/json'},body:j});}catch(e){}}}document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){send();}else{s=Date.now();}});window.addEventListener('pagehide',function(){send();});window.addEventListener('beforeunload',function(){send();});setInterval(function(){try{send();}catch(e){}},15000);}catch(e){}})();</script>`;
      const out = html.replace("</body>", tracker + "\n</body>");
      const h = new Headers(resp.headers);
      h.set("content-type", ct);
      // 关闭页面缓存，确保每次打开都经过中间件并记录（否则边缘缓存会让重复访问漏记）
      h.set("Cache-Control", "no-store");
      h.delete("Set-Cookie");
      h.append("Set-Cookie", `pv=${visitId}; Path=/; SameSite=Lax; Max-Age=3600`);
      h.append("Set-Cookie", `uv=${uvId}; Path=/; SameSite=Lax; Max-Age=31536000`);
      return new Response(out, { status: resp.status, headers: h });
    }
  }
  return resp;
}
