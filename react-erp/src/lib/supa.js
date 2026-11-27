/* Supabase read client (test only - the live app still reads Google Sheets). No library, plain fetch. */
import { api } from './core.js';
export const SUPA_URL = 'https://feqjjixmxdtkfcfhzmln.supabase.co';
export const SUPA_KEY = 'sb_publishable_QQgMo3Knk2UUtiDVxhXx_w_pgOhE4OT';
let jwt = null, jwtAt = 0;
async function token() {
  if (jwt && Date.now() - jwtAt < 40 * 60 * 1000) return jwt;
  const r = await api('supa.token', {}, { loader: false, fresh: true });
  jwt = r.token; jwtAt = Date.now(); return jwt;
}
/** select('erp_product_master', {select:'name,category', limit:50, order:'name', filter:{active:'eq.YES'}}) */
export async function supaSelect(table, o) {
  o = o || {}; const q = [];
  q.push('select=' + encodeURIComponent(o.select || '*'));
  if (o.limit) q.push('limit=' + o.limit);
  if (o.offset) q.push('offset=' + o.offset);
  if (o.order) q.push('order=' + encodeURIComponent(o.order));
  Object.keys(o.filter || {}).forEach(k => q.push(encodeURIComponent(k) + '=' + encodeURIComponent(o.filter[k])));
  const r = await fetch(SUPA_URL + '/rest/v1/' + table + '?' + q.join('&'), { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + await token(), Prefer: 'count=exact' } });
  if (!r.ok) throw new Error('Database: ' + (await r.text()).slice(0, 160));
  const total = +((r.headers.get('content-range') || '').split('/')[1] || 0);
  return { rows: await r.json(), total };
}
