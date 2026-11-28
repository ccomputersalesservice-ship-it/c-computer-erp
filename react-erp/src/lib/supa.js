/* Supabase read client (test only - the live app still reads Google Sheets). No library, plain fetch. */
import { api, isAdmin, lastWriteAt, dbHook } from './core.js';
const VIEW = { erp_product_master: 'erp_v_product_master', erp_stock_register: 'erp_v_stock_register', erp_product_photos: 'erp_v_product_photos', erp_replace: 'erp_v_replace', erp_builds: 'erp_v_builds', erp_build_components: 'erp_v_build_components', erp_brec_main: 'erp_v_brec_main', erp_brec_parts: 'erp_v_brec_parts', erp_customers: 'erp_v_customers_lite', erp_serial_register: 'erp_v_serial_register', erp_sales_orders: 'erp_v_sales_orders_lite' };
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

/* ---------- Purchase list from the database (Admin only; same result shape as Apps Script pur.list) ---------- */
export async function purListDb(p) {
  const q = String(p.q || '').trim().toLowerCase(), st = String(p.status || '');
  const size = Math.min(Math.max(+p.size || 20, 5), 50), page = Math.max(+p.page || 1, 1);
  const [ph, pi, im] = await Promise.all([
    allRows('erp_purchases', 'purchaseid,vendor,billno,purchasedate,createdat,status,createdby,billfileid'),
    allRows('erp_purchase_items', 'purchaseid,qtyordered,qtyreceived,purchaseprice'),
    allRows('erp_purimp', 'purchaseid,grandtotal').catch(() => [])
  ]);
  const by = {}; pi.forEach(l => { (by[l.purchaseid] = by[l.purchaseid] || []).push(l); });
  const gt = {}; im.forEach(x => { if (x.purchaseid && nn(x.grandtotal) > 0) gt[x.purchaseid] = nn(x.grandtotal); });
  const toks = q.split(/\s+/).filter(Boolean);
  const rows = ph.filter(h => {
    if (!h.purchaseid) return false;
    if (st && h.status !== st) return false;
    if (toks.length) { const hay = (h.purchaseid + ' ' + h.vendor + ' ' + h.billno).toLowerCase(); if (!toks.every(t => hay.indexOf(t) >= 0)) return false; }
    return true;
  });
  rows.sort((a, b) => a.purchaseid < b.purchaseid ? 1 : -1);
  return {
    total: rows.length, page, size,
    rows: rows.slice((page - 1) * size, page * size).map(h => {
      const ls = by[h.purchaseid] || []; let o = 0, r = 0, amt = 0;
      ls.forEach(l => { o += nn(l.qtyordered); r += nn(l.qtyreceived); amt += nn(l.qtyreceived) * nn(l.purchaseprice); });
      return { purchaseId: h.purchaseid, vendor: h.vendor, billNo: h.billno, date: h.purchasedate, at: h.createdat || '', status: h.status, lines: ls.length, qtyOrdered: o, qtyReceived: r, by: h.createdby, hasBill: !!h.billfileid, amount: gt[h.purchaseid] || amt };
    })
  };
}

/* ---------- Sales list from the database (Admin only; same result shape as Apps Script ord.list) ---------- */
export async function ordListDb(p) {
  const q = String(p.q || '').trim().toLowerCase(), st = String(p.status || ''), cid = String(p.customerId || '');
  const size = Math.min(Math.max(+p.size || 20, 5), 50), page = Math.max(+p.page || 1, 1);
  const [oh, ol, cu, pm] = await Promise.all([
    allRows('erp_sales_orders', 'orderid,orderdate,createdat,updatedat,status,customerid,total,staffname'),
    allRows('erp_sales_items', 'orderid,itemid,mfrserial,productid'),
    allRows('erp_customers', 'customerid,name,mobile'),
    allRows('erp_product_master', 'productid,name,model')
  ]);
  const lines = {}; ol.forEach(l => { (lines[l.orderid] = lines[l.orderid] || []).push(l); });
  const cust = {}; cu.forEach(c => { cust[c.customerid] = c; });
  const prod = {}; pm.forEach(x => { prod[x.productid] = x; });
  const toks = q.split(/\s+/).filter(Boolean);
  const rows = oh.filter(o => {
    if (!o.orderid) return false;
    if (st && o.status !== st) return false;
    if (!st && o.status === 'Deleted') return false;
    if (cid && o.customerid !== cid) return false;
    if (toks.length) {
      const c = cust[o.customerid] || {}, hay = [o.orderid, c.name, c.mobile];
      (lines[o.orderid] || []).forEach(l => { const pr = prod[l.productid]; hay.push(l.itemid, l.mfrserial, pr ? pr.name + ' ' + pr.model : ''); });
      const h = hay.join(' ').toLowerCase(); if (!toks.every(t => h.indexOf(t) >= 0)) return false;
    }
    return true;
  });
  rows.sort((a, b) => a.orderid < b.orderid ? 1 : -1);
  return {
    total: rows.length, page, size,
    rows: rows.slice((page - 1) * size, page * size).map(o => {
      const c = cust[o.customerid] || {}, ls = lines[o.orderid] || [], f = ls[0] ? prod[ls[0].productid] : null;
      return { orderId: o.orderid, date: o.orderdate, at: o.createdat || o.updatedat || '', status: o.status, total: nn(o.total), pricePending: nn(o.total) === 0 && o.status !== 'Cancelled', staff: o.staffname, customer: c.name || '', mobile: c.mobile || '', items: ls.length, first: f ? f.name : '', productIds: ls.slice(0, 3).map(l => l.productid) };
    })
  };
}


/* ---------- Replacement / Build / Build Record lists (same shapes as Apps Script rpl.list, build.list, brec.list) ---------- */
export async function rplListDb(p) {
  const q = String(p.q || '').trim().toLowerCase();
  const rows = await allRows('erp_replace', 'repid,date,custname,mobile,product,sizegb,brand,billno,oldserial,newserial,status,company,fileids,note,log,createdby');
  return rows.slice().reverse().filter(x => !q || [x.custname, x.mobile, x.billno, x.oldserial, x.newserial, x.repid].join(' ').toLowerCase().indexOf(q) >= 0).slice(0, 200).map(x => ({
    id: x.repid, date: x.date, name: x.custname, mobile: x.mobile, product: x.product, size: x.sizegb, brand: x.brand, billNo: x.billno,
    oldSerial: x.oldserial, newSerial: x.newserial, status: x.status, company: x.company, note: x.note,
    log: (() => { try { return JSON.parse(x.log || '[]'); } catch (e) { return []; } })(), photos: x.fileids ? x.fileids.split(',').length : 0, by: x.createdby }));
}
export async function buildListDb(p) {
  const q = String(p.q || '').trim().toLowerCase(), st = String(p.status || '');
  const [bs, bc, cu] = await Promise.all([allRows('erp_builds', 'buildid,name,customerid,status,createdby,createdat'), allRows('erp_build_components', 'buildid,status'), allRows('erp_customers', 'customerid,name,mobile')]);
  const cnt = {}; bc.forEach(c => { if (c.status === 'Active') cnt[c.buildid] = (cnt[c.buildid] || 0) + 1; });
  const cust = {}; cu.forEach(c => { cust[c.customerid] = c; });
  return bs.filter(b => { if (st && b.status !== st) return false; const c = cust[b.customerid] || {}; return !q || [b.buildid, b.name, c.name || '', c.mobile || ''].join(' ').toLowerCase().indexOf(q) >= 0; })
    .sort((a, b) => a.buildid < b.buildid ? 1 : -1).slice(0, 100).map(b => { const c = cust[b.customerid] || {}; return { buildId: b.buildid, name: b.name, status: b.status, customer: c.name || '', mobile: c.mobile || '', components: cnt[b.buildid] || 0, createdAt: b.createdat, by: b.createdby }; });
}
export async function brecListDb(p) {
  const q = String(p.q || '').trim().toLowerCase();
  const [mm, pp] = await Promise.all([allRows('erp_brec_main', 'recid,kind,title,brand,custname,custmobile,status,createdby,createdat'), allRows('erp_brec_parts', 'recid,status')]);
  const cnt = {}; pp.forEach(x => { if (x.status !== 'Replaced') cnt[x.recid] = (cnt[x.recid] || 0) + 1; });
  return mm.filter(r => r.status !== 'Deleted' && (!q || [r.recid, r.title, r.brand, r.custname, r.custmobile].join(' ').toLowerCase().indexOf(q) >= 0))
    .sort((a, b) => a.recid < b.recid ? 1 : -1).slice(0, 100).map(r => ({ recId: r.recid, kind: r.kind, title: r.title, customer: r.custname, mobile: r.custmobile, parts: cnt[r.recid] || 0, status: r.status, createdAt: r.createdat, by: r.createdby }));
}
export async function serialListDb(p) {
  const q = String(p.q || '').trim().toLowerCase(), st = String(p.status || ''), pid = String(p.productId || '');
  const size = Math.min(Math.max(+p.size || 25, 5), 100), page = Math.max(+p.page || 1, 1);
  const [sr, pm] = await Promise.all([allRows('erp_serial_register', 'itemid,mfrserial,barcode,productid,status,purchaseid,orderid,buildid,createdat'), allRows('erp_product_master', 'productid,name,model')]);
  const prod = {}; pm.forEach(x => { prod[x.productid] = x; });
  const toks = q.split(/\s+/).filter(Boolean);
  const rows = sr.filter(it => {
    if (!it.itemid) return false;
    if (st && it.status !== st) return false;
    if (pid && it.productid !== pid) return false;
    if (toks.length) { const pr = prod[it.productid]; const hay = [it.itemid, it.mfrserial, it.barcode, it.orderid, pr ? pr.name + ' ' + pr.model : ''].join(' ').toLowerCase(); if (!toks.every(t => hay.indexOf(t) >= 0)) return false; }
    return true;
  });
  rows.sort((a, b) => a.itemid < b.itemid ? 1 : -1);
  return { rows: rows.slice((page - 1) * size, page * size).map(it => { const p0 = prod[it.productid] || {}; return { itemId: it.itemid, serial: it.mfrserial, barcode: it.barcode, productId: it.productid, productName: p0.name || '', model: p0.model || '', status: it.status, purchaseId: it.purchaseid, orderId: it.orderid, buildId: it.buildid, createdAt: it.createdat }; }), total: rows.length, page, size };
}
export async function custListDb(p) {
  const q = String(p.q || '').trim().toLowerCase();
  const size = Math.min(Math.max(+p.size || 25, 5), 100), page = Math.max(+p.page || 1, 1);
  const [cu, so] = await Promise.all([allRows('erp_customers', 'customerid,name,mobile,address,createdat'), allRows('erp_sales_orders', 'orderid,customerid')]);
  const counts = {}; so.forEach(o => { counts[o.customerid] = (counts[o.customerid] || 0) + 1; });
  const rows = cu.filter(c => c.customerid && (!q || [c.name, c.mobile, c.customerid].join(' ').toLowerCase().indexOf(q) >= 0));
  rows.sort((a, b) => a.customerid < b.customerid ? 1 : -1);
  return { total: rows.length, page, size, rows: rows.slice((page - 1) * size, page * size).map(c => ({ id: c.customerid, name: c.name, mobile: c.mobile, address: c.address, createdAt: c.createdat, orders: counts[c.customerid] || 0 })) };
}
const DBL = { 'cust.list': ['ccDbCust', custListDb], 'serial.list': ['ccDbSer', serialListDb], 'rpl.list': ['ccDbRpl', rplListDb], 'build.list': ['ccDbBld', buildListDb], 'brec.list': ['ccDbBrec', brecListDb] };
dbHook.fn = (action, payload) => {
  const d = DBL[action]; if (!d || !supaOn()) return null;
  try { const v = localStorage.getItem(d[0]); if (v !== '1' && v !== null) return null; if (v === null && (!DBL_DEFAULT_ON || DBL_TEST[d[0]])) return null; } catch (e) { return null; }
  return d[1](payload);
};
let DBL_DEFAULT_ON = true; const DBL_TEST = {}; /* Sheets-vs-DB check passed */
