// Lee la actividad real de cada red. Devuelve {"YYYY-MM-DD":{p,s,lp}} o null si la red no está soportada aún.
const G = 'https://graph.facebook.com/v26.0';
async function gj(path, token) {
  const r = await fetch(`${G}${path}&limit=100&access_token=${token}`);
  if (!r.ok) throw new Error(`Meta ${r.status} ${path.split('?')[0]}`);
  return (await r.json()).data || [];
}
export async function collect(acc, env) {
  const day = t => new Intl.DateTimeFormat('en-CA', { timeZone: env.TZ || 'UTC' }).format(t);
  const out = {};
  const add = (iso, kind) => {
    const t = Date.parse(String(iso).replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
    if (isNaN(t)) return;
    const o = (out[day(t)] ??= { p: 0, s: 0, lp: 0 });
    if (kind === 's') o.s++; else { o.p++; o.lp = Math.max(o.lp, t); }
  };
  if (acc.platform === 'Instagram') {
    (await gj(`/${acc.ext_id}/media?fields=timestamp`, env.META_TOKEN)).forEach(m => add(m.timestamp, 'p'));
    (await gj(`/${acc.ext_id}/stories?fields=timestamp`, env.META_TOKEN)).forEach(m => add(m.timestamp, 's'));
  } else if (acc.platform === 'Facebook') {
    (await gj(`/${acc.ext_id}/published_posts?fields=created_time`, env.META_TOKEN)).forEach(m => add(m.created_time, 'p'));
  } else return null; // TikTok, DMs, comentarios y campañas: pendiente
  return out;
}
