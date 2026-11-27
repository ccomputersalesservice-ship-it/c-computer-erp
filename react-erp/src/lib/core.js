/* ================= C COMPUTER ERP (React) - core: state, api, helpers =================
   Same logic as the live ERP (JS_Core.html): same backend URL, same actions, same payloads,
   same read cache (APIC) and same "instant screens" cache (SWR) rules. */
import LOGO_ from './logo.js';

export const LOGO = LOGO_;
export const API_URL = 'https://script.google.com/macros/s/AKfycbyHAzRZ251nUUSz_LfHulU0wG19cA21MWETqXT6njjKpJHfq-WrszL-0Wr0j6ikR4bBMQ/exec';
export const ASSET_BASE = 'https://ccomputersalesservice-ship-it.github.io/c-computer-erp/';
export const CRM_URL = 'https://thriving-kleicha-efb57f.netlify.app';
export const CRM_STAFF_URL = 'https://script.google.com/macros/s/AKfycbxs8l9AL--Btwn1CGVuLZoaOE3CgVRRyWEnuvhHOX8X32Ck38ML6yTulF5s3I_ooXJo/exec?page=staff&u=';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const nf = n => Number(n || 0).toLocaleString('en-IN');
export const todayStr = () => { const d = new Date(Date.now() + 330 * 60000); return d.toISOString().slice(0, 10); };
export const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
export const rid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- app state (same shape as S in the live ERP) ---------- */
export const S = { token: null, user: null, boot: null, lang: 'both', route: 'dash', params: {}, stack: [], thumbs: {} };
const mem = {};
export const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch (e) { return mem[k] || null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del(k) { try { sessionStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  lget(k) { try { return localStorage.getItem(k); } catch (e) { return mem['L' + k] || null; } },
  lset(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem['L' + k] = v; } }
};
export const isAdmin = () => !!(S.user && S.user.role === 'ADMIN');
export const isAcct = () => !!(S.user && S.user.role === 'ACCOUNTS');
export const seesPrice = () => isAdmin() || isAcct();

/* ---------- language (English / Gujarati) ---------- */
export const T = {
  dash: ['Dashboard', 'ડેશબોર્ડ'], products: ['Products', 'પ્રોડક્ટ્સ'], purchase: ['Purchase', 'ખરીદી'], sales: ['Sales', 'વેચાણ'], stock: ['Stock', 'સ્ટોક'],
  serial: ['Serial No.', 'સિરિયલ'], replace: ['Replacement', 'રિપ્લેસમેન્ટ'], customers: ['Customer', 'ગ્રાહક'], reports: ['Reports', 'રિપોર્ટ'], cash: ['Cash Book', 'Cash Book'], fixed: ['Fixed Kharcha', 'Fixed Kharcha'], tasks: ['Order Task', 'Order Task'], crm: ['Service / CRM', 'Service / CRM'], quotes: ['Quotations', 'Quotations'], quote: ['Quotation', 'Quotation'], pcmp: ['Price Compare', 'Price Compare'], pos: ['POS / Quick Order', 'POS / Quick Order'], service: ['Service Records', 'Service Records'], audit: ['Stock Audit', 'સ્ટોક ઓડિટ'], build: ['Build PC', 'બિલ્ડ PC'], brec: ['Build Record', 'Build Record'], chal: ['AI Bill Scanner', 'AI Bill Scanner'],
  print: ['Print Stickers', 'સ્ટીકર પ્રિન્ટ'], users: ['Users & Roles', 'યુઝર્સ'], settings: ['Settings', 'સેટિંગ્સ'], scan: ['Scan', 'સ્કેન'],
  search: ['Search Product, Serial, Customer...', 'પ્રોડક્ટ, સિરિયલ, ગ્રાહક શોધો...'], save: ['Save', 'સાચવો'], cancel: ['Cancel', 'રદ કરો'], close: ['Close', 'બંધ'], add: ['Add', 'ઉમેરો'],
  edit: ['Edit', 'ફેરફાર'], del: ['Delete', 'કાઢો'], login: ['Login', 'લૉગિન'], logout: ['Logout', 'લૉગઆઉટ'], loginid: ['Login ID', 'લૉગિન ID'], pin: ['PIN', 'પિન'],
  name: ['Name', 'નામ'], mobile: ['Mobile', 'મોબાઇલ'], address: ['Address', 'સરનામું'], qty: ['Qty', 'જથ્થો'], price: ['Price', 'કિંમત'], total: ['Total', 'કુલ'], date: ['Date', 'તારીખ'],
  status: ['Status', 'સ્થિતિ'], category: ['Category', 'કેટેગરી'], brand: ['Brand', 'બ્રાન્ડ'], model: ['Model', 'મોડેલ'], vendor: ['Vendor', 'વેન્ડર'], billno: ['Bill No.', 'બિલ નંબર'],
  orders: ['Orders', 'ઓર્ડર'], pending: ['Pending', 'બાકી'], delivered: ['Delivered', 'ડિલિવર્ડ'], reserved: ['Reserved', 'રિઝર્વ'], processing: ['Processing', 'પ્રોસેસિંગ'], ready: ['Ready', 'તૈયાર'],
  cancelled: ['Cancelled', 'રદ'], returned: ['Returned', 'પરત'], available: ['Available', 'ઉપલબ્ધ'], damaged: ['Damaged', 'ડેમેજ'], physical: ['Physical', 'ફિઝિકલ'], sold: ['Sold', 'વેચાયેલ'],
  lowstock: ['Low Stock', 'ઓછો સ્ટોક'], photo: ['Photo', 'ફોટો'], barcode: ['Barcode', 'બારકોડ'], backup: ['Backup', 'બેકઅપ'], sku: ['SKU', 'SKU'], tracking: ['Tracking', 'ટ્રેકિંગ'],
  reorder: ['Reorder Level', 'રીઓર્ડર લેવલ'], active: ['Active', 'ચાલુ'], inactive: ['Inactive', 'બંધ'], desc: ['Description', 'વર્ણન'], actions: ['Action', 'ક્રિયા'],
  totpurchase: ['Total Purchase', 'કુલ ખરીદી'], totsales: ['Total Sales', 'કુલ વેચાણ'], totproducts: ['Total Products', 'કુલ પ્રોડક્ટ'], totstock: ['Total Stock', 'કુલ સ્ટોક'],
  salestrend: ['Sales & Purchase Trend', 'વેચાણ અને ખરીદી ટ્રેન્ડ'], stockcat: ['Stock by Category', 'કેટેગરી પ્રમાણે સ્ટોક'], lowalert: ['Low Stock Alert (Reorder)', 'ઓછો સ્ટોક એલર્ટ'],
  recentorders: ['Recent Orders', 'તાજા ઓર્ડર'], recentpur: ['Recent Purchases', 'તાજી ખરીદી'], recentact: ['Recent Stock Activity', 'તાજી સ્ટોક પ્રવૃત્તિ'], movement: ['Stock Movement', 'સ્ટોક હિલચાલ'],
  newpurchase: ['New Purchase', 'નવી ખરીદી'], neworder: ['New Order', 'નવો ઓર્ડર'], newproduct: ['Add Product', 'પ્રોડક્ટ ઉમેરો'], stockcheck: ['Stock Check', 'સ્ટોક ચેક'], addphoto: ['Add Photo', 'ફોટો ઉમેરો'],
  printsticker: ['Print Sticker', 'સ્ટીકર પ્રિન્ટ'], scanbarcode: ['Scan Barcode', 'બારકોડ સ્કેન'], scanserial: ['Scan Serial', 'સિરિયલ સ્કેન'], searchprod: ['Search Product', 'પ્રોડક્ટ શોધો'],
  thismonth: ['This Month', 'આ મહિનો'], lastmonth: ['Last Month', 'ગયો મહિનો'], thisyear: ['This Year', 'આ વર્ષ'], alltime: ['All Time', 'બધો સમય'], all: ['All', 'બધા'],
  welcome: ['C COMPUTER – The Computer House', 'C COMPUTER – ધ કમ્પ્યુટર હાઉસ'], moves: ['Movement History', 'હિલચાલ ઇતિહાસ'], items: ['Items', 'આઇટમ'], serialno: ['Serial Number', 'સિરિયલ નંબર'],
  itemid: ['Item ID', 'આઇટમ ID'], more: ['More', 'વધુ'], home: ['Home', 'હોમ'], changepin: ['Change PIN', 'પિન બદલો'], customer1: ['Customer', 'ગ્રાહક'], count: ['Count', 'ગણતરી'],
  language: ['Language', 'ભાષા'], viewall: ['View all', 'બધા જુઓ'], next: ['Next', 'આગળ'], prev: ['Back', 'પાછળ'], print1: ['Print', 'પ્રિન્ટ'], preview: ['Preview', 'પ્રીવ્યૂ']
};
export const LANGS = { both: 'EN/ગુ', en: 'EN', gu: 'ગુ' };
/* LI: inline "English / ગુજરાતી"; LT: plain text in current language */
export function LI(k) { const t = T[k]; if (!t) return k; if (S.lang === 'en') return t[0]; if (S.lang === 'gu') return t[1]; return t[0] + ' / ' + t[1]; }
export function LT(k) { const t = T[k]; if (!t) return k; return S.lang === 'gu' ? t[1] : t[0]; }
export const STAT_KEY = { Pending: 'pending', Reserved: 'reserved', Processing: 'processing', Ready: 'ready', Delivered: 'delivered', Cancelled: 'cancelled', Returned: 'returned' };
export const STAT_COLOR = { Pending: 'warning', Reserved: 'info', Processing: 'secondary', Ready: 'info', Delivered: 'success', Cancelled: 'error', Returned: 'warning', Received: 'success', Partial: 'warning', Ordered: 'info', Available: 'success', Sold: 'info', Damaged: 'error', InBuild: 'secondary', Missing: 'error', WrittenOff: 'error', Draft: 'warning', Completed: 'info', Counted: 'warning', Approved: 'success', Rejected: 'error' };
export const TRK = { SERIAL: 'Mfr Serial', ITEMID: 'Item ID', QTY: 'Quantity' };

/* ---------- busy / toast hooks (filled in by the UI layer) ---------- */
export const ui = { busy: () => { }, toast: () => { }, onLogout: () => { } };
export const toast = (msg, type) => ui.toast(msg, type);
export const busy = on => ui.busy(on);

/* ---------- server calls ---------- */
function runRemote(token, action, payload) {
  return fetch(API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ t: token, a: action, p: payload }) }).then(r => r.json());
}
export const remote = { run: runRemote };   // tests may replace this

/* Short memory for repeat reads. Any write clears it. */
export const APIC = new Map();
const API_READ = /^(brec\.get|brec\.list|stock\.list|stock\.moves|prod\.list|prod\.get|cust\.list|cust\.search|ord\.list|ord\.get|pur\.list|pur\.get|serial\.list|serial\.item|quote\.list|quote\.get|quote\.dash|cash\.list|crm\.jobs|crm\.job|rep\.[a-z]+|dash|dash\.ops|aud\.list|print\.history)$/;
let SWR_W = 0;
export const lastWriteAt = () => SWR_W;
const SWR_OK = /^(dash|stock\.list|prod\.list|crm\.jobs|cust\.list|ord\.list|pur\.list|quote\.list|brec\.list|serial\.list|chal\.list)$/;
const swrKey = rk => 'ccswr|' + ((S.user && S.user.loginId) || '') + '|' + rk;
function swrGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function swrPut(k, s) {
  if (s.length > 400000) return;
  try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), s })); }
  catch (e) { try { Object.keys(localStorage).filter(x => x.indexOf('ccswr|') === 0).forEach(x => localStorage.removeItem(x)); localStorage.setItem(k, JSON.stringify({ t: Date.now(), s })); } catch (e2) { } }
}
export function swrClear() { try { Object.keys(localStorage).filter(x => x.indexOf('ccswr|') === 0).forEach(x => localStorage.removeItem(x)); } catch (e) { } }
/* listeners that want to re-render when a fresher copy arrives (the page's reload) */
export const swrListeners = new Set();

export function api(action, payload, opt) {
  opt = opt || {}; payload = Object.assign({}, payload || {});
  const rk = API_READ.test(action) && !opt.fresh ? action + '|' + JSON.stringify(payload) : null;
  if (rk) {
    const c = APIC.get(rk);
    if (c && c.s !== undefined && Date.now() - c.t < 90000) return Promise.resolve(JSON.parse(c.s));
    if (c && c.p) return c.p.then(x => JSON.parse(JSON.stringify(x)));
  } else { APIC.clear(); if (/(save|create|add|new|upd|delete|del$|cancel|approve|reject|receive|status$|upload|transfer|edit|damage|inspect|writeoff|opening|change|ignore|price|mailcheck)/.test(action)) SWR_W = Date.now(); }
  const pr = api_(action, payload, opt);
  if (rk && SWR_OK.test(action) && !opt.noswr) {
    const sk = swrKey(rk), old = swrGet(sk), route = S.route;
    pr.then(d => { const s = JSON.stringify(d); swrPut(sk, s); if (old && old.s !== s) setTimeout(() => swrListeners.forEach(f => f(route)), 0); }, () => { });
    if (old && Date.now() - old.t < 864e5 && old.t > SWR_W) { APIC.set(rk, { p: pr, t: Date.now() }); pr.then(d => { const c = APIC.get(rk); if (c && c.p === pr) { c.s = JSON.stringify(d); c.t = Date.now(); delete c.p; } }, () => APIC.delete(rk)); return Promise.resolve(JSON.parse(old.s)); }
  }
  if (rk) {
    APIC.set(rk, { p: pr, t: Date.now() });
    pr.then(d => { const c = APIC.get(rk); if (c && c.p === pr) { c.s = JSON.stringify(d); c.t = Date.now(); delete c.p; } }, () => APIC.delete(rk));
  } else pr.then(() => APIC.clear(), () => APIC.clear());
  return pr;
}
function api_(action, payload, opt) {
  if (opt.rid) payload._rid = opt.rid;
  if (opt.loader) busy(true);
  return remote.run(S.token, action, payload).then(r => {
    if (opt.loader) busy(false);
    if (r && r.ok) return r.data;
    if (r && r.code === 'AUTH') { ui.onLogout(true); throw new Error(r.error); }
    throw new Error((r && r.error) || 'Unknown error');
  }, () => { if (opt.loader) busy(false); throw new Error('Network problem. Check internet and try again.'); });
}
/* Button helper: busy while working so a double tap cannot save twice; errors become a red toast. */
export async function work(fn) {
  busy(true);
  try { return await fn(); } catch (e) { toast(e.message, 'bad'); } finally { busy(false); }
}

/* ---------- Code 128 barcode ---------- */
const C128 = '212222,222122,222221,121223,121322,131222,122213,122312,132212,221213,221312,231212,112232,122132,122231,113222,123122,123221,223211,221132,221231,213212,223112,312131,311222,321122,321221,312212,322112,322211,212123,212321,232121,111323,131123,131321,112313,132113,132311,211313,231113,231311,112133,112331,132131,113123,113321,133121,313121,211331,231131,213113,213311,213131,311123,311321,331121,312113,312311,332111,314111,221411,431111,111224,111422,121124,121421,141122,141221,112214,112412,122114,122411,142112,142211,241211,221114,413111,241112,134111,111242,121142,121241,114212,124112,124211,411212,421112,421211,212141,214121,412121,111143,111341,131141,114113,114311,411113,411311,113141,114131,311141,411131,211412,211214,211232,2331112'.split(',');
function c128codes(v) {
  v = String(v); const codes = [];
  if (/^\d+$/.test(v) && v.length % 2 === 0) { codes.push(105); for (let i = 0; i < v.length; i += 2) codes.push(parseInt(v.substr(i, 2), 10)); }
  else { codes.push(104); for (const ch of v) { const c = ch.charCodeAt(0) - 32; if (c < 0 || c > 95) throw new Error('Barcode text has unsupported character'); codes.push(c); } }
  let sum = codes[0]; for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103); codes.push(106); return codes;
}
export function barcodeSvg(value, o) {
  o = o || {}; const q = 10; let x = q, rects = '';
  c128codes(value).forEach(c => { const p = C128[c]; for (let i = 0; i < p.length; i++) { const w = +p[i]; if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="100"/>`; x += w; } });
  const tot = x + q;
  return { modules: tot, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tot} 100" preserveAspectRatio="none" shape-rendering="crispEdges" style="${o.style || ''}" fill="#000">${rects}</svg>` };
}

/* ---------- images ---------- */
/* fast: decode the photo once, make the big copy and the small thumbnail from it (no slow base64 round trip) */
export async function shrinkPair(file, max, q, tmax, tq) {
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(bmp, 0, 0, w, h); if (bmp.close) bmp.close();
    const t = Math.min(1, tmax / Math.max(w, h)), c2 = document.createElement('canvas'); c2.width = Math.round(w * t); c2.height = Math.round(h * t); c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height);
    return [c.toDataURL('image/jpeg', q), c2.toDataURL('image/jpeg', tq)];
  } catch (e) { return [await shrinkImage(file, max, q), await shrinkImage(file, tmax, tq)]; }
}
export function shrinkImage(file, max, q) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read photo.'));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => reject(new Error('Not a valid photo.'));
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), w = Math.round(im.width * k), h = Math.round(im.height * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', q));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
export function pickFile(capture, accept, multiple) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept || 'image/*'; if (capture) i.setAttribute('capture', 'environment'); if (multiple) i.multiple = true;
    i.onchange = () => res(multiple ? Array.from(i.files || []) : (i.files && i.files[0])); i.click();
  });
}
/* thumbnails cache shared by all screens */
const thumbWait = new Map();
export async function loadThumbs(ids) {
  ids = Array.from(new Set((ids || []).filter(Boolean)));
  const need = ids.filter(i => S.thumbs[i] === undefined && !thumbWait.has(i));
  if (need.length) {
    const p = api('photo.thumbs', { ids: need.slice(0, 50) }).then(m => { need.forEach(i => { S.thumbs[i] = (m && m[i]) || ''; thumbWait.delete(i); }); }, () => need.forEach(i => thumbWait.delete(i)));
    need.forEach(i => thumbWait.set(i, p));
    await p;
  } else await Promise.all(ids.map(i => thumbWait.get(i)).filter(Boolean));
  return S.thumbs;
}

/* ---------- date + time ---------- */
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dtm(d, at) {
  d = String(d || (at || '').slice(0, 10) || ''); if (!d) return '';
  const p = d.split('-'); let out = p.length === 3 ? `${Number(p[2])} ${MON[Number(p[1]) - 1] || p[1]} ${p[0]}` : d;
  const m = /(\d\d):(\d\d)/.exec(String(at || '').slice(11)); if (m) { let h = Number(m[1]); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; out += `, ${h}:${m[2]} ${ap}`; }
  return out;
}
export function greetWord() { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; }
export function csvDownload(name, head, rows) {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const txt = '﻿' + [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 500);
}
export function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
export function shortNum(v) { return v >= 1e7 ? (v / 1e7).toFixed(1).replace('.0', '') + 'Cr' : v >= 1e5 ? (v / 1e5).toFixed(1).replace('.0', '') + 'L' : v >= 1e3 ? (v / 1e3).toFixed(1).replace('.0', '') + 'k' : String(v); }
export const PAL = ['#4b5563', '#16a34a', '#f59e0b', '#7c3aed', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

/* load an outside script (PDF / barcode libraries), trying each address in turn */
export function qLoadJs(urls) {
  return new Promise((res, rej) => {
    let i = 0;
    const nx = () => {
      if (i >= urls.length) return rej(new Error('Could not load a library. Check internet.'));
      const sc = document.createElement('script'); let done = false;
      const fail = () => { if (done) return; done = true; sc.remove(); nx(); };
      sc.src = urls[i++]; sc.onload = () => { done = true; res(); }; sc.onerror = fail; setTimeout(fail, 8000);
      document.head.appendChild(sc);
    };
    nx();
  });
}
