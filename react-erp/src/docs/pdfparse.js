/* Purchase PDF bill reader - same parser as the live ERP (JS_PurImport.html). Never invents data. */
import { qLoadJs } from '../lib/core.js';
const PI_NUM = /\d[\d,]*\.\d{1,2}/g;
export const piN = s => { const v = parseFloat(String(s || '').replace(/,/g, '')); return isFinite(v) ? v : 0; };
export const piNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const PI_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function piDate(s) {
  const mn = String(s || '').match(/(\d{1,2})[-\/. ]([A-Za-z]{3})[a-z]*[-\/., ]+(\d{2,4})/);
  if (mn && PI_MON[mn[2].toLowerCase()]) { let y = +mn[3]; if (y < 100) y += 2000; return y + '-' + String(PI_MON[mn[2].toLowerCase()]).padStart(2, '0') + '-' + String(+mn[1]).padStart(2, '0'); }
  const m = String(s || '').match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/); if (!m) return '';
  let y = +m[3]; if (y < 100) y += 2000; const mo = +m[2], d = +m[1];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
const PI_SKIP_VENDOR = /^(tax\s*invoice|invoice|original|duplicate|triplicate|bill of supply|gstin|e-?way|page|\(?(original|duplicate)|cash|credit)/i;
/** lines: array of text lines of ONE invoice page. Returns a draft. Never invents data. */
export function piParseLines(lines) {
  const L = lines.map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean), T = L.join('\n'), warn = [];
  const o = { vendor: '', gstin: '', invoiceNo: '', invoiceDate: '', terms: '', orderNo: '', subtotal: 0, sgst: 0, cgst: 0, igst: 0, grandTotal: 0, lines: [], warnings: warn };
  // invoice no / date / order no / terms
  const DATE_RE = '(\\d{1,2}[-\\/.]\\d{1,2}[-\\/.]\\d{2,4}|\\d{1,2}[- ][A-Za-z]{3}[a-z]*[-, ]+\\d{2,4})', LBL = /^(dated?|delivery|dispatch|mode|terms|buyer|reference|other|invoice|date|no)\.?$/i;
  let m = T.match(/(?:Invoice|Bill|Inv|Tax\s*Invoice)\s*(?:No|Number|#)\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-\._]{2,30})/i); if (m && !LBL.test(m[1])) o.invoiceNo = m[1];
  m = T.match(new RegExp('(?:Invoice\\s*|Bill\\s*)?Dated?\\s*[:\\-]?\\s*' + DATE_RE, 'i')); if (m) o.invoiceDate = piDate(m[1]);
  // Tally style: labels on one row ("Invoice No.  Dated"), values on the next row ("KSIT/5841/26-27  25-Nov-26")
  if (!o.invoiceNo || !o.invoiceDate) {
    const hi2 = L.findIndex(t => /Invoice\s*(No|Number)\.?\s+Dated?\b/i.test(t));
    if (hi2 >= 0 && L[hi2 + 1]) { const nx = L[hi2 + 1], dm = nx.match(new RegExp(DATE_RE, 'i')); if (dm && !o.invoiceDate) o.invoiceDate = piDate(dm[1]); const nm = nx.match(/(?:^|\s)([A-Z0-9][A-Z0-9\/\-\._]{2,30})(?=\s+\d{1,2}[- ][A-Za-z]{3}|\s+\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\s*$)/i); if (nm && !o.invoiceNo && !LBL.test(nm[1])) o.invoiceNo = nm[1]; }
  }
  if (!o.invoiceDate) { const dm = T.match(new RegExp('\\bdt\\.?\\s*' + DATE_RE, 'i')); if (dm) o.invoiceDate = piDate(dm[1]); }
  m = T.match(/(?:Order|PO|P\.O\.)\s*(?:No|Number)\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,25})/i); if (m && !LBL.test(m[1])) o.orderNo = m[1];
  m = T.match(/(?:Terms|Payment Terms)\s*[:\-]?\s*(\d+\s*Days?)/i) || T.match(/Terms of Payment[^\n]*\n[^\n]*?\b(\d+\s*Days?)\b/i); if (m) o.terms = m[1];
  // vendor GSTIN: first GSTIN that is not right after a buyer-type label
  const gre = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g; let gm;
  const OWN = /BEMPC0588L/;
  while ((gm = gre.exec(T))) { if (OWN.test(gm[0])) continue; const before = T.slice(Math.max(0, gm.index - 60), gm.index); if (!/(bill\s*to|buyer|consignee|ship\s*to|party|customer|recipient|sold\s*to)[^]*$/i.test(before) || o.gstin === '') { if (!/(bill\s*to|buyer|consignee|ship\s*to|sold\s*to)[^]*$/i.test(before)) { o.gstin = gm[0]; break; } } }
  // vendor name: 1) "For XYZ" signature  2) "certified that XYZ has supplied"  3) name saved earlier for this GSTIN  4) mail sender  5) top line
  const me = /C\s*COMPUTER/i, clean = v => String(v || '').replace(/[|"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  let vf = (T.match(/^For\s+(?:M\/s\.?\s*)?([A-Z][A-Za-z0-9 &.,'()\-]{2,60})$/m) || [])[1];
  if (vf && me.test(vf)) vf = (T.match(/^For\s+(?!.*C\s*COMPUTER)(?:M\/s\.?\s*)?([A-Z][A-Za-z0-9 &.,'()\-]{2,60})$/m) || [])[1];
  if (!vf) { const c = T.match(/certified that\s+(.{3,60}?)\s+has supplied/i); if (c && !me.test(c[1])) vf = c[1]; }
  if (!vf && o.gstin) vf = piVendorMap()[o.gstin];
  if (!vf && PI_HINT.from) { const f = clean(String(PI_HINT.from).replace(/<.*>/, '')); if (f.length > 3 && !/@|gmail|account|noreply|^sales$|^tax invoice$/i.test(f)) vf = f.replace(/^Account\s+\w+\s+/i, ''); }
  if (!vf) for (let i = 0; i < Math.min(L.length, 12); i++) { const t = clean(L[i]).replace(/\s+(Invoice\s*(No|Number)\.?|Dated?|Delivery Note|Mode\/Terms.*|Voucher No.*)(\s+(Dated?|Delivery Note.*))?$/i, '').trim(); if (PI_SKIP_VENDOR.test(t) || /invoice|voucher|shree|shri|jay |jai |namah|ganesh|printed on|user\s*:/i.test(t) || /^[\d\W]+$/.test(t) || t.length < 4) continue; vf = t.replace(/\s*\(.*$/, ''); break; }
  o.vendor = clean(vf);
  // find table
  let hi = L.findIndex(t => /(description|particulars|item)/i.test(t) && /(qty|quantity)/i.test(t));
  if (hi < 0) hi = L.findIndex(t => /(description|particulars)/i.test(t));
  let end = L.findIndex((t, i) => i > hi && /^(sub\s*total|total\b|grand\s*total|amount in words|taxable|add\s*:|less\s*:)/i.test(t));
  if (hi < 0) warn.push('Item table not found - please add the items by hand.');
  else {
    if (end < 0) end = L.length;
    let cur = null;
    const flush = () => { if (cur) { if (cur.has) o.lines.push(cur); cur = null; } };
    const SER = /^[A-Z0-9][A-Z0-9\-\/]{7,24}$/i;
    const fill = (c, t) => {   // numbers of one item line: HSN, GST %, qty, rate, amount (+ a serial printed after the amount)
      const qm = t.match(/(\d+(?:\.\d+)?)\s*(Nos|No|Pcs|Pc|Unit|Units|Set|Sets|Pkt|Box|Mtr|Mtrs|Meter|Kg|Ltr|Pair|Roll|Rolls|Bdl|Ea|Each)\b/i);
      const hs = (t.match(/\b(\d{4,8})\b/g) || []).find(h => h !== c.sr) || '';
      if (hs && !c.hsn) c.hsn = hs;
      const g = (t.match(/(\d{1,2}(?:\.\d+)?)\s*%/) || [])[1]; if (g) c.gst = g;
      const dec = (t.match(PI_NUM) || []).map(piN), qty = piN(qm[1]), amount = dec.length ? dec[dec.length - 1] : 0;
      let pre = t.slice(0, Math.min(...[hs ? t.indexOf(hs) : 1e9, t.indexOf(qm[0]), (t.search(/\d{1,2}(?:\.\d+)?\s*%/) + 1 || 1e9) - 1].filter(x => x >= 0)));
      if (c.desc === '' || c.has === false) { pre = pre.replace(/^\d{1,3}\s+/, c.desc === '' ? '' : '$&'); }
      if (/[A-Za-z]/.test(pre)) c.desc = (c.desc + ' ' + pre).trim();
      const lastNum = (t.match(PI_NUM) || []).pop(), tail = lastNum ? t.slice(t.lastIndexOf(lastNum) + lastNum.length).trim().split(/\s+/) : [];
      tail.forEach(x => { if (SER.test(x) && /\d/.test(x)) c.serialCand.push(x); });
      c.qty = qty; c.amount = amount; c.listRate = dec.length > 1 ? dec[0] : 0; c.rate = qty ? Math.round(amount / qty * 100) / 100 : c.listRate; c.has = true;
    };
    for (let i = hi + 1; i < end; i++) {
      const t = L[i], sr = t.match(/^(\d{1,3})\.?\s+(?=[A-Za-z])(.*)$/), hasQ = /(\d+(?:\.\d+)?)\s*(Nos|No|Pcs|Pc|Unit|Units|Set|Sets|Pkt|Box|Mtr|Mtrs|Meter|Kg|Ltr|Pair|Roll|Rolls|Bdl|Ea|Each)\b/i.test(t);
      const next = o.lines.length + (cur && cur.has ? 1 : 0) + 1;
      if (sr && +sr[1] === next && !(cur && !cur.has)) {
        flush(); cur = { sr: sr[1], desc: '', hsn: '', gst: '', qty: 0, rate: 0, amount: 0, serialCand: [], productId: '', has: false };
        if (hasQ) fill(cur, sr[2]); else cur.desc = sr[2].replace(/\s+\d{4,8}\s*$/, m => { cur.hsn = m.trim(); return ''; }).trim();
      } else if (cur && !cur.has && hasQ) fill(cur, t);
      else if (cur) {
        if (SER.test(t) && /\d/.test(t) && !/\s/.test(t)) cur.serialCand.push(t);
        else if (cur.has && /^\d{3,7}$/.test(t) && cur.serialCand.length < Math.max(1, Math.round(cur.qty))) cur.serialCand.push(t);
        else if (!cur.has && !/^(previous|outstanding|page|continued)/i.test(t)) cur.desc += ' ' + t;
        else if (cur.has && /^[A-Za-z]/.test(t) && !/^(previous|outstanding|page|continued|sub|total|sgst|cgst|igst)/i.test(t)) cur.desc += ' ' + t;
      }
    }
    flush();
  }
  // generic fallback for unknown bill layouts: any row with words + a quantity/unit + money amounts
  if (!o.lines.length) {
    const BAD = /^(sub\s*total|total|grand|amount|taxable|sgst|cgst|igst|gst|tax|round|bank|a\/c|ifsc|branch|gstin|pan|state|phone|ph\b|mob|email|e-mail|terms|declaration|for\b|authori|signature|invoice|date|dated|buyer|consignee|ship|bill to|place|vehicle|transport|e-way|irn|ack|page|hsn|sr\b|sl\b|s\.no|no\.|description|particulars|previous|outstanding)/i;
    let n = 0;
    L.forEach(t => {
      if (BAD.test(t)) return;
      const dec = (t.match(PI_NUM) || []).map(piN), qm = t.match(/(\d+(?:\.\d+)?)\s*(Nos|No|Pcs|Pc|Unit|Units|Set|Sets|Pkt|Box|Mtr|Mtrs|Meter|Kg|Ltr|Pair|Roll|Rolls|Bdl|Ea|Each)\b/i);
      if (dec.length < 1 || !qm || !/[A-Za-z]{3}/.test(t)) return;
      const qty = piN(qm[1]); if (!qty) return;
      const amount = dec[dec.length - 1]; if (!amount) return;
      const cut = Math.min(...[t.indexOf(qm[0]), (t.search(/\d{1,2}(?:\.\d+)?\s*%/) + 1 || 1e9) - 1, (t.search(/\s\d{4,8}\s/) + 1 || 1e9) - 1].filter(x => x > 0));
      const desc = t.slice(0, cut).replace(/^\d{1,3}\.?\s+(?=[A-Za-z])/, '').replace(/\s+/g, ' ').trim();
      if (!/[A-Za-z]{3}/.test(desc)) return;
      const hs = (t.match(/\b(\d{4,8})\b/g) || [])[0] || '', g = (t.match(/(\d{1,2}(?:\.\d+)?)\s*%/) || [])[1] || '';
      o.lines.push({ sr: String(++n), desc, hsn: hs, gst: g, qty, rate: Math.round(amount / qty * 100) / 100, amount, serialCand: [], productId: '', has: true });
    });
    if (o.lines.length) { const ix = warn.indexOf('Item table not found - please add the items by hand.'); if (ix >= 0) warn.splice(ix, 1); warn.push('Aa bill no format alag chhe - items andaje vanchya chhe. Badhu barabar check karo.'); }
  }
  // totals (never use Previous Balance / Outstanding)
  const last = re => { const x = L.find(t => re.test(t) && !/(previous|outstanding|balance)/i.test(t)); if (!x) return 0; const d = x.match(PI_NUM); return d ? piN(d[d.length - 1]) : (piN((x.match(/\d[\d,]*/g) || []).pop())); };
  o.subtotal = last(/^sub\s*total/i); o.sgst = last(/\bSGST\b/i); o.cgst = last(/\bCGST\b/i); o.igst = last(/\bIGST\b/i);
  o.grandTotal = last(/(grand\s*total|net\s*amount|total\s*amount|invoice\s*total)/i);
  const sum = o.lines.reduce((a, l) => a + l.amount, 0);
  if (!o.subtotal && sum) { const sl = L.find(t => /^[\d,]+\.\d{1,2}$/.test(t) && Math.abs(piN(t) - sum) <= 1); if (sl) o.subtotal = piN(sl); }
  if (!o.subtotal && sum && o.grandTotal && Math.abs(sum + o.sgst + o.cgst + o.igst - o.grandTotal) <= 2) o.subtotal = Math.round(sum * 100) / 100;
  if (!o.grandTotal) { const gl = L.find(t => /^total\b/i.test(t) && /\b(pcs|nos|no|unit|units|set|sets)\b/i.test(t)); const gn = gl ? (gl.match(PI_NUM) || []) : []; if (gn.length) o.grandTotal = piN(gn[gn.length - 1]); }
  if (!o.grandTotal && o.subtotal && (o.sgst + o.cgst + o.igst)) o.grandTotal = Math.round((o.subtotal + o.sgst + o.cgst + o.igst) * 100) / 100;
  if (!o.invoiceNo) warn.push('Invoice number not found - please type it.');
  if (!o.invoiceDate) warn.push('Invoice date not found - please set it.');
  if (!o.lines.length) warn.push('No item lines were read.');
  if (o.subtotal && o.lines.length && Math.abs(sum - o.subtotal) > 1) warn.push('Item total (' + sum.toFixed(2) + ') does not match Sub Total (' + o.subtotal.toFixed(2) + '). Check the lines.');
  if (o.grandTotal && o.subtotal && Math.abs(o.subtotal + o.sgst + o.cgst + o.igst - o.grandTotal) > 2) warn.push('Sub Total + tax does not match Grand Total. Check the bill.');
  o.lines.forEach(l => {   // serials printed inside the description as a comma list: move them to the serial box
    const m = l.desc.match(/(?:^|\s)((?:[A-Z0-9][A-Z0-9\-\/]{7,24})(?:\s*,\s*[A-Z0-9][A-Z0-9\-\/]{7,24})+)\s*,?\s*$/i);
    if (m) { const toks = m[1].split(/\s*,\s*/).filter(x => /\d/.test(x)); if (toks.length >= 2) { l.serialCand = l.serialCand.concat(toks); l.desc = l.desc.slice(0, l.desc.lastIndexOf(m[1])).trim(); } }
  });
  o.lines.forEach(l => { l.desc = l.desc.replace(/\s+/g, ' ').trim(); if (l.serialCand.length) l.serial = l.serialCand.join('\n'); });
  const gr = o.subtotal ? Math.round((o.sgst + o.cgst + o.igst) / o.subtotal * 100) : 0;
  if ([5, 12, 18, 28].includes(gr)) o.lines.forEach(l => { if (!l.gst) l.gst = String(gr); });
  return o;
}
export let PI_HINT = {};
export function setPiHint(h) { PI_HINT = h || {}; }
export function piVendorMap() { try { return JSON.parse(localStorage.getItem('ccPiVendors') || '{}'); } catch (e) { return {}; } }
export function piVendorSave(g, v) { if (!g || !v) return; try { const m = piVendorMap(); m[g] = v; localStorage.setItem('ccPiVendors', JSON.stringify(m)); } catch (e) { } }
/** pages: array of line-arrays. Same invoice number on several pages (Original / Transporter copy) = ONE invoice. */
export function piParsePages(pages) {
  const out = [], seen = {};
  pages.forEach(pl => {
    const d = piParseLines(pl), k = piNorm(d.invoiceNo) || ('P' + out.length);
    if (seen[k]) { seen[k].copies++; return; }
    d.copies = 1; seen[k] = d; out.push(d);
  });
  return out;
}
export async function piPdfPages(file) {
  if (!window.pdfjsLib) { await qLoadJs(['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js']); }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, pages = [];
  for (let n = 1; n <= Math.min(pdf.numPages, 12); n++) {
    const tc = await (await pdf.getPage(n)).getTextContent(), rows = [];
    tc.items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = it.transform[5], x = it.transform[4]; let r = rows.find(q => Math.abs(q.y - y) < 3); if (!r) { r = { y, it: [] }; rows.push(r); } r.it.push({ x, w: it.width || 0, s: it.str }); });
    rows.sort((a, b) => b.y - a.y);
    pages.push(rows.map(r => { r.it.sort((a, b) => a.x - b.x); let s = '', px = null; r.it.forEach(i => { s += (px !== null && i.x - px > 6 ? '  ' : (px !== null ? ' ' : '')) + i.s; px = i.x + i.w; }); return s; }));
  }
  return pages;
}
export async function piSha(file) { try { const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return ''; } }
export const piDataUrl = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });

