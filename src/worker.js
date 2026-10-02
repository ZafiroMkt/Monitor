import { collect } from './collectors.js';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const dayStr = (t, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(t);
const UPSERT = `INSERT INTO days(acc,day,p,s,lp) VALUES(?,?,?,?,?) ON CONFLICT(acc,day) DO UPDATE SET p=excluded.p,s=MAX(s,excluded.s),lp=MAX(lp,excluded.lp)`;
const int = (v, d = 0) => Math.max(0, Math.min(9999, parseInt(v) || d));
const str = v => String(v ?? '').trim().slice(0, 120);

function authed(req, env) {
  const h = req.headers.get('authorization') || '';
  if (!env.PANEL_PASSWORD || !h.startsWith('Basic ')) return false;
  try { const s = atob(h.slice(6)); return s.slice(s.indexOf(':') + 1) === env.PANEL_PASSWORD; } catch { return false; }
}

async function sync(env) {
  const { results } = await env.DB.prepare("SELECT * FROM accounts WHERE ext_id!='' LIMIT 10").all();
  for (const a of results) {
    try {
      const days = await collect(a, env);
      if (!days) continue;
      const st = Object.entries(days).map(([d, v]) => env.DB.prepare(UPSERT).bind(a.id, d, v.p, v.s, v.lp));
      if (st.length) await env.DB.batch(st);
    } catch (e) { console.error(a.client, a.platform, e.message); }
  }
}

export default {
  async scheduled(_e, env, ctx) { ctx.waitUntil(sync(env)); },
  async fetch(req, env) {
    if (!authed(req, env)) return new Response('Acceso restringido', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Monitor"' } });
    const u = new URL(req.url), tz = env.TZ || 'UTC';
    if (!u.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const [, , r, id] = u.pathname.split('/'), m = req.method;
    let b = {}; if (m !== 'GET' && m !== 'DELETE') try { b = await req.json(); } catch {}
    if (r === 'state' && m === 'GET') {
      const since = dayStr(Date.now() - 35 * 864e5, tz);
      const [a, d] = await Promise.all([env.DB.prepare('SELECT * FROM accounts').all(), env.DB.prepare('SELECT acc,day,p,s,lp FROM days WHERE day>=?').bind(since).all()]);
      return J({ tz, accounts: a.results, days: d.results });
    }
    if (r === 'account' && m === 'POST') {
      if (!['Instagram', 'TikTok', 'Facebook'].includes(b.platform) || !str(b.handle)) return J({ error: 'datos inválidos' }, 400);
      await env.DB.prepare('INSERT INTO accounts(id,client,platform,handle,ext_id,pe,sg) VALUES(?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(), str(b.client) || 'Cliente', b.platform, str(b.handle), str(b.ext_id), int(b.pe, 2) || 2, int(b.sg, 1)).run();
      return J({ ok: 1 });
    }
    if (r === 'account' && id && m === 'PATCH') {
      const f = ['dm', 'cm', 'ad', 'pe', 'sg'].filter(k => k in b);
      if (!f.length) return J({ error: 'nada que cambiar' }, 400);
      await env.DB.prepare(`UPDATE accounts SET ${f.map(k => k + '=?').join(',')} WHERE id=?`).bind(...f.map(k => int(b[k])), id).run();
      return J({ ok: 1 });
    }
    if (r === 'account' && id && m === 'DELETE') {
      await env.DB.batch([env.DB.prepare('DELETE FROM days WHERE acc=?').bind(id), env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(id)]);
      return J({ ok: 1 });
    }
    if (r === 'log' && m === 'POST') {
      const ts = Number(b.ts) || Date.now(), feed = b.type !== 'story' ? 1 : 0;
      await env.DB.prepare(`INSERT INTO days(acc,day,p,s,lp) VALUES(?,?,?,?,?) ON CONFLICT(acc,day) DO UPDATE SET p=p+excluded.p,s=s+excluded.s,lp=MAX(lp,excluded.lp)`)
        .bind(str(b.acc), dayStr(ts, tz), feed, 1 - feed, feed ? ts : 0).run();
      return J({ ok: 1 });
    }
    return J({ error: 'no encontrado' }, 404);
  }
};
