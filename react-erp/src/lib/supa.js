/* Supabase read client (test only - the live app still reads Google Sheets). No library, plain fetch. */
import { api, isAdmin, lastWriteAt } from './core.js';
const VIEW = { erp_product_master: 'erp_v_product_master', erp_stock_register: 'erp_v_stock_register', erp_product_photos: 'erp_v_product_photos' };
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

/* ---------- Products list from the database (same result shape as Apps Script prod.list) ---------- */
const mem = {};
async function allRows(table0, select) {
  const table = isAdmin() ? table0 : (VIEW[table0] || table0);
  const m = mem[table]; if (m && Date.now() - m.at < 30000) return m.rows;
  let rows = [], off = 0;
  for (;;) { const r = await supaSelect(table, { select, limit: 1000, offset: off, order: '_row' }); rows = rows.concat(r.rows); if (r.rows.length < 1000) break; off += 1000; }
  mem[table] = { at: Date.now(), rows }; return rows;
}
export function supaClearCache() { Object.keys(mem).forEach(k => delete mem[k]); }
const nn = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(x) ? 0 : x; };
export const DB_DEFAULT = true; /* one-click rollback: set false and redeploy; per-browser override: localStorage ccDb 0/1 */
export const supaOn = () => { if (Date.now() - lastWriteAt() < 120000) return false; /* just saved something here: read live Sheets for 2 min so new data shows at once */ try { const v = localStorage.getItem('ccDb'); return v === '1' ? true : v === '0' ? false : DB_DEFAULT; } catch (e) { return DB_DEFAULT; } };
export async function prodListDb(p) {
  const q = String(p.q || '').trim().toLowerCase(), cat = p.category || '', st = p.status || 'active', low = !!p.low;
  const size = Math.min(Math.max(+p.size || 20, 5), 50), page = Math.max(+p.page || 1, 1);
  const [pm, sr, ph] = await Promise.all([
    allRows('erp_product_master', 'productid,name,category,brand,model,sku,barcode,description,reorderlevel,trackingtype,active,sellprice,createdat'),
    allRows('erp_stock_register', 'productid,physical,available,reserved,sold,returned,damaged'),
    allRows('erp_product_photos', 'productid,fileid')
  ]);
  const sm = {}; sr.forEach(s => { sm[s.productid] = s; });
  const pc = {}; ph.forEach(x => { if (x.fileid) pc[x.productid] = (pc[x.productid] || 0) + 1; });
  const toks = q.split(/\s+/).filter(Boolean);
  let rows = pm.filter(x => {
    if (!x.productid) return false;
    if (st === 'active' && x.active !== 'YES') return false;
    if (st === 'inactive' && x.active === 'YES') return false;
    if (cat && x.category !== cat) return false;
    if (toks.length) { const hay = [x.productid, x.name, x.category, x.brand, x.model, x.sku, x.barcode].join(' ').toLowerCase(); if (!toks.every(t => hay.indexOf(t) >= 0)) return false; }
    if (low) { const s = sm[x.productid]; if (!(nn(x.reorderlevel) > 0 && nn(s && s.available) <= nn(x.reorderlevel))) return false; }
    return true;
  });
  rows.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const total = rows.length;
  const out = rows.slice((page - 1) * size, page * size).map(x => {
    const s = sm[x.productid] || {};
    return { ProductID: x.productid, Name: x.name, Category: x.category, Brand: x.brand, Model: x.model, SKU: x.sku, Barcode: x.barcode, Description: x.description, ReorderLevel: nn(x.reorderlevel), TrackingType: x.trackingtype, Active: x.active, SellPrice: nn(x.sellprice), CreatedAt: x.createdat, stock: { physical: nn(s.physical), available: nn(s.available), reserved: nn(s.reserved), sold: nn(s.sold), returned: nn(s.returned), damaged: nn(s.damaged) }, photos: pc[x.productid] || 0 };
  });
  return { rows: out, total, page, size };
}
