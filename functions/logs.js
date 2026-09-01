function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function fmtDur(s) {
  s = parseInt(s, 10) || 0;
  if (s <= 0) return "—";
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
}

function isAuthed(request, secret) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some(c => c.trim() === `auth=${secret}`);
}

function loginHtml(error) {
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>访问日志 · 登录</title>
<style>
  :root{--bg:#0b1411;--card:#10201a;--line:#1e3a2e;--green:#34d399;--txt:#e6f4ec;--mut:#7fa392;}
  *{box-sizing:border-box;margin:0}
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
    background:radial-gradient(1200px 600px at 50% -10%,#14312688,transparent),var(--bg);
    color:var(--txt);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{width:100%;max-width:360px;background:var(--card);border:1px solid var(--line);
    border-radius:18px;padding:32px 28px;box-shadow:0 20px 60px #0008;text-align:center}
  h1{font-size:20px;letter-spacing:.5px}
  .sub{color:var(--mut);font-size:13px;margin:8px 0 22px}
  input{width:100%;padding:12px 14px;border-radius:11px;border:1px solid var(--line);
    background:#0c1813;color:var(--txt);font-size:15px;outline:none}
  input:focus{border-color:var(--green)}
  button{margin-top:14px;width:100%;padding:12px;border:none;border-radius:11px;cursor:pointer;
    background:linear-gradient(135deg,#34d399,#10b981);color:#04140d;font-weight:700;font-size:15px}
  button:hover{filter:brightness(1.08)}
  .err{color:#f87171;font-size:13px;margin-top:14px}
</style>
</head>
<body>
  <div class="card">
    <h1>📊 访问日志</h1>
    <p class="sub">请输入查看密钥</p>
    <form method="post" action="/logs">
      <input type="password" name="password" placeholder="密钥" autofocus autocomplete="off">
      <button type="submit">登 录</button>
    </form>
    ${error ? '<p class="err">密钥错误，请重试</p>' : ""}
  </div>
</body>
</html>`;
}

// 汇总统计：让查看页从"原始表"变成销售能直接用的概览（基于全部数据，作为稳定参考）
function computeStats(rows) {
  const total = rows.length;
  const uniq = new Set(rows.map(r => r.visitor_ip || "")).size;
  const durs = rows.map(r => parseInt(r.duration, 10) || 0).filter(d => d > 0);
  const avgDur = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
  const countBy = (key) => {
    const m = {};
    rows.forEach(r => { const v = (r[key] || "").trim(); if (v) m[v] = (m[v] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  return {
    total, uniq, avgDur,
    topPaths: countBy("visit_path"),
    topSources: countBy("source")
  };
}

function statsHtml(s) {
  const tile = (label, val) =>
    `<div class="tile"><div class="tv">${esc(val)}</div><div class="tl">${esc(label)}</div></div>`;
  const list = (label, arr) => arr.length
    ? `<div class="side"><div class="side-h">${esc(label)}</div>${arr.map(([k, c]) =>
        `<div class="side-row"><span class="side-k" title="${esc(k)}">${esc(k)}</span><span class="side-c">${c}</span></div>`).join("")}</div>`
    : "";
  return `<div class="stats">
    ${tile("总访问", s.total)}
    ${tile("独立访客", s.uniq)}
    ${tile("平均停留", fmtDur(s.avgDur))}
  </div>
  <div class="sides">
    ${list("热门页面", s.topPaths)}
    ${list("热门渠道", s.topSources)}
  </div>`;
}

function tableHtml(rows) {
  const body = rows.map(r => `<tr data-bot="${r.is_bot || 0}" data-dur="${(parseInt(r.duration,10)||0)}">
    <td>${esc(r.id)}</td>
    <td class="t">${esc(r.visit_time)}</td>
    <td class="dur">${fmtDur(r.duration)}</td>
    <td class="p">${esc(r.visit_path)}</td>
    <td class="src">${esc(r.source)}</td>
    <td>${esc(r.region)}</td>
    <td>${esc(r.city)}</td>
    <td class="cli">${esc(r.client)}</td>
    <td class="ref" title="${esc(r.referer)}">${esc(r.referer || "—")}</td>
  </tr>`).join("");
  // 把数据内联进页面，前端做筛选/导出，避免为低流量站点新增接口
  const dataJson = JSON.stringify(rows.map(r => ({
    id: r.id, visit_time: r.visit_time, duration: r.duration, visit_path: r.visit_path,
    source: r.source, region: r.region, city: r.city, client: r.client,
    referer: r.referer, is_bot: r.is_bot || 0,
    uv_id: r.uv_id || "", uv_key: r.uv_id || r.visitor_ip || "", is_new: r.is_new || 0
  })));
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>访问日志</title>
<style>
  :root{--bg:#0b1411;--card:#10201a;--line:#1e3a2e;--green:#34d399;--txt:#e6f4ec;--mut:#7fa392;}
  *{box-sizing:border-box;margin:0}
  html,body{height:100%}
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
    background:radial-gradient(1200px 600px at 50% -10%,#14312688,transparent),var(--bg);
    color:var(--txt);min-height:100vh;padding:18px 14px;display:flex;flex-direction:column;overflow-y:auto}
  .wrap{max-width:1180px;margin:0 auto;width:100%;display:flex;flex-direction:column}
  header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;flex:none}
  h1{font-size:19px;letter-spacing:.5px}
  .meta{color:var(--mut);font-size:13px}
  .meta a{color:var(--green);text-decoration:none;margin-left:14px}
  .meta a:hover{text-decoration:underline}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px;flex:none}
  .tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;text-align:center}
  .tv{font-size:23px;font-weight:800;color:var(--green);font-variant-numeric:tabular-nums}
  .tl{color:var(--mut);font-size:12px;margin-top:3px}
  .sides{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:none;margin:10px 0}
  .side{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
  .side-h{color:var(--mut);font-size:12px;margin-bottom:6px}
  .side-row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:13px;border-top:1px solid #15291f}
  .side-row:first-of-type{border-top:none}
  .side-k{color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:78%}
  .side-c{color:var(--green);font-variant-numeric:tabular-nums;flex:none}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px;flex:none}
  .panel-h{color:var(--mut);font-size:12px;margin-bottom:8px}
  .bars{display:flex;align-items:flex-end;gap:5px;height:88px}
  .bwrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
  .bcol{width:100%;background:linear-gradient(180deg,#34d399,#0e9f6e);border-radius:4px 4px 0 0}
  .bcol:hover{filter:brightness(1.12)}
  .bval{font-size:11px;color:var(--green);font-variant-numeric:tabular-nums}
  .blab{font-size:10px;color:var(--mut)}
  .cross table{width:100%;border-collapse:collapse;font-size:12px}
  .cross th,.cross td{text-align:left;padding:5px 8px;border-bottom:1px solid #15291f;white-space:nowrap}
  .cross th{color:var(--mut);font-weight:600}
  .cross td:first-child{color:var(--green);font-variant-numeric:tabular-nums}
  .cross td:last-child{color:#fbbf24;font-variant-numeric:tabular-nums}
  .bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;flex:none;margin-bottom:10px}
  .bar input{padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:#0c1813;color:var(--txt);font-size:13px;outline:none;min-width:200px}
  .bar input:focus{border-color:var(--green)}
  .bar label{font-size:12px;color:var(--mut);display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
  .bar button{margin:0;width:auto;padding:8px 16px;border:none;border-radius:10px;cursor:pointer;
    background:linear-gradient(135deg,#34d399,#10b981);color:#04140d;font-weight:700;font-size:13px}
  .bar .cnt{color:var(--mut);font-size:13px;margin-left:auto}
  .box{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:auto;box-shadow:0 20px 60px #0008;flex:none;min-height:140px;max-height:72vh}
  table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:13px}
  col:nth-child(1){width:5%}col:nth-child(2){width:15%}col:nth-child(3){width:8%}
  col:nth-child(4){width:13%}col:nth-child(5){width:10%}col:nth-child(6){width:9%}
  col:nth-child(7){width:9%}col:nth-child(8){width:10%}col:nth-child(9){width:21%}
  th,td{padding:9px 10px;text-align:left;border-bottom:1px solid var(--line);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  th{position:sticky;top:0;background:#0e1c16;color:var(--mut);font-weight:600;z-index:1}
  tbody tr:hover{background:#0e1c16}
  .t{font-variant-numeric:tabular-nums}
  .p{color:var(--green)}
  .dur{color:#fbbf24;font-variant-numeric:tabular-nums}
  .cli,.src{color:var(--txt)}
  .ref{color:var(--mut)}
  .empty{color:var(--mut);padding:30px;text-align:center}
  /* 移动端：统计卡 3 列,明细表在窄屏下横向滚动 */
  @media (max-width:640px){
    .stats{grid-template-columns:repeat(3,1fr)}
    .sides{grid-template-columns:1fr}
    .box table{min-width:760px}
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>📊 访问日志</h1>
      <div class="meta">共 ${rows.length} 条<a href="/logs?logout=1">退出登录</a></div>
    </header>
    <div id="stats"></div>
    <div id="trend" class="panel" hidden></div>
    <div id="cross" class="panel" hidden></div>
    <div class="bar">
      <input id="f" type="search" placeholder="按路径筛选，如 page-3 / /">
      <label><input id="bot" type="checkbox"> 隐藏机器人</label>
      <label><input id="valid" type="checkbox"> 仅有效访问</label>
      <button id="csv" type="button">导出 CSV</button>
      <span class="cnt" id="cnt"></span>
    </div>
    <div class="box">
      <table>
        <colgroup>
          <col><col><col><col><col><col><col><col><col>
        </colgroup>
        <thead><tr>
          <th>#</th><th>时间</th><th>停留</th><th>路径</th><th>渠道</th><th>省</th><th>市</th><th>客户端</th><th>来源</th>
        </tr></thead>
        <tbody>
          ${rows.length ? body : '<tr><td colspan="9" class="empty">暂无访问记录</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
<script>
  const DATA = ${dataJson};
  const statsEl = document.getElementById('stats');
  const fEl = document.getElementById('f');
  const botEl = document.getElementById('bot');
  const validEl = document.getElementById('valid');
  const cntEl = document.getElementById('cnt');
  const tbody = document.querySelector('tbody');

  function fmtDur(s){ s=parseInt(s,10)||0; if(s<=0) return '—'; const m=Math.floor(s/60),sec=s%60; return m>0? m+'分'+sec+'秒':sec+'秒'; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderStats(rows){
    const total=rows.length;
    const uv=new Set(rows.map(r=>r.uv_key||'')).size;
    const newUv=new Set(rows.filter(r=>r.uv_id && Number(r.is_new)===1).map(r=>r.uv_id)).size;
    const durs=rows.map(r=>parseInt(r.duration,10)||0).filter(d=>d>0);
    const avg=durs.length?Math.round(durs.reduce((a,b)=>a+b,0)/durs.length):0;
    const by=k=>{const m={};rows.forEach(r=>{const v=(r[k]||'').trim();if(v)m[v]=(m[v]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);};
    const tile=(l,v)=>'<div class="tile"><div class="tv">'+esc(v)+'</div><div class="tl">'+esc(l)+'</div></div>';
    const side=(l,arr)=>arr.length?'<div class="side"><div class="side-h">'+esc(l)+'</div>'+arr.map(([k,c])=>'<div class="side-row"><span class="side-k" title="'+esc(k)+'">'+esc(k)+'</span><span class="side-c">'+c+'</span></div>').join('')+'</div>':'';
    statsEl.innerHTML='<div class="stats">'+tile('总访问',total)+tile('独立访客',uv)+tile('新客',newUv)+tile('回访',Math.max(0,uv-newUv))+tile('平均停留',fmtDur(avg))+'</div><div class="sides">'+side('热门页面',by('visit_path'))+side('热门渠道',by('source'))+'</div>';
  }

  function applyFilter(){
    const q=(fEl.value||'').trim().toLowerCase();
    const hideBot=botEl.checked, onlyValid=validEl.checked;
    let shown=0;
    DATA.forEach((r,i)=>{
      const tr=tbody.children[i];
      if(!tr) return;
      const hitPath=!q || (r.visit_path||'').toLowerCase().includes(q);
      const hitBot=!hideBot || r.is_bot!==1;
      const hitValid=!onlyValid || (parseInt(r.duration,10)||0)>0;
      const hit=hitPath && hitBot && hitValid;
      tr.style.display=hit?'':'none';
      if(hit) shown++;
    });
    cntEl.textContent='显示 '+shown+' / '+DATA.length+' 条';
  }

  function exportCsv(){
    const p='bot='+(botEl.checked?1:0)+'&min_dur='+(validEl.checked?1:0);
    window.location.href='/api/export-csv?'+p;
  }

  function cnKey(dt){ return new Date(dt.getTime()+8*3600*1000).toISOString().slice(0,10); }

  function renderTrend(rows){
    const el=document.getElementById('trend');
    const byDay={};
    rows.forEach(r=>{ const d=(r.visit_time||'').slice(0,10); if(d) byDay[d]=(byDay[d]||0)+1; });
    const days=[];
    for(let i=13;i>=0;i--){ const k=cnKey(new Date(Date.now()-i*86400000)); days.push({k,c:byDay[k]||0}); }
    const max=Math.max(1,...days.map(d=>d.c));
    const bars=days.map(d=>{
      const h=Math.round(d.c/max*100);
      return '<div class="bwrap" title="'+esc(d.k)+' — '+d.c+' 次">'+
        (d.c?'<div class="bval">'+d.c+'</div>':'<div class="bval" style="color:transparent">0</div>')+
        '<div class="bcol" style="height:'+(d.c?h:2)+'%"></div>'+
        '<div class="blab">'+esc(d.k.slice(8))+'</div></div>';
    });
    el.innerHTML='<div class="panel-h">近 14 天访问趋势</div><div class="bars">'+bars.join('')+'</div>';
    el.hidden=false;
  }

  function renderCross(rows){
    const el=document.getElementById('cross');
    const srcMap={};
    rows.forEach(r=>{
      const src=(r.source||'').trim()||'未知';
      const p=(r.visit_path||'').trim()||'/';
      srcMap[src]=srcMap[src]||{};
      const m=srcMap[src][p]||(srcMap[src][p]={c:0,s:0});
      m.c++; m.s+=parseInt(r.duration,10)||0;
    });
    const srcs=Object.entries(srcMap).sort((a,b)=>{
      const sum=x=>Object.values(x[1]).reduce((y,z)=>y+z.c,0);
      return sum(b)-sum(a);
    }).slice(0,5);
    if(!srcs.length){ el.hidden=true; return; }
    let html='<div class="panel-h">渠道 × 落地页（访问 / 平均停留）</div><div class="cross"><table><thead><tr><th>渠道</th><th>页面</th><th>访问</th><th>平均停留</th></tr></thead><tbody>';
    srcs.forEach(([src,paths])=>{
      const top=Object.entries(paths).sort((a,b)=>b[1].c-a[1].c).slice(0,3);
      top.forEach(([p,v],i)=>{
        if(i===0) html+='<tr><td rowspan="'+top.length+'" title="'+esc(src)+'">'+esc(src)+'</td><td title="'+esc(p)+'">'+esc(p)+'</td><td>'+v.c+'</td><td>'+fmtDur(Math.round(v.s/v.c))+'</td></tr>';
        else html+='<tr><td title="'+esc(p)+'">'+esc(p)+'</td><td>'+v.c+'</td><td>'+fmtDur(Math.round(v.s/v.c))+'</td></tr>';
      });
    });
    html+='</tbody></table></div>';
    el.innerHTML=html; el.hidden=false;
  }

  renderStats(DATA);
  renderTrend(DATA);
  renderCross(DATA);
  applyFilter();
  fEl.addEventListener('input',applyFilter);
  botEl.addEventListener('change',applyFilter);
  validEl.addEventListener('change',applyFilter);
  document.getElementById('csv').addEventListener('click',exportCsv);
</script>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const SECRET = env.LOG_SECRET || "Abc123456Log2026";
  const url = new URL(request.url);

  // 退出：清除 cookie 并跳回登录
  if (url.searchParams.get("logout") !== null) {
    return new Response(null, {
      status: 303,
      headers: {
        "Location": "/logs",
        "Set-Cookie": `auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      }
    });
  }

  // 提交登录
  if (request.method === "POST") {
    let pwd = "";
    try { const f = await request.formData(); pwd = f.get("password") || ""; } catch (e) {}
    if (pwd === SECRET) {
      return new Response(null, {
        status: 303,
        headers: {
          "Location": "/logs",
          "Set-Cookie": `auth=${SECRET}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        }
      });
    }
    return new Response(loginHtml(true), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  // 未登录 → 登录页
  if (!isAuthed(request, SECRET)) {
    return new Response(loginHtml(false), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  // 已登录 → 查表渲染（提高上限以支持筛选/统计；销售站点流量低，内存安全）
  const { results } = await env.DB.prepare(
    "SELECT * FROM visit_record ORDER BY ts DESC, id DESC LIMIT 1000"
  ).run();
  const rows = results || [];
  return new Response(tableHtml(rows), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
