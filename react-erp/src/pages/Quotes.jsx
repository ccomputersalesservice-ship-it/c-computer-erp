/* ===================== QUOTATIONS (same logic as JS_Views4.html) =====================
   Server is the source of truth for every number. The screen only previews totals while typing. */
import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, MenuItem, Paper, Stack, TextField, Typography, Select, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api, S, inr, nf, rid, toast, work, isAdmin, dtm, LT, debounce, loadThumbs, qLoadJs } from '../lib/core.js';
import { PageHead, Skel, Loading, DataTable, Pager, Section, openDialog, promptBox, ProductPicker } from '../lib/ui.jsx';
import { go } from '../lib/nav.js';
import { rupeesWords, PARTICO, qNm, QIC, QPCIMG, qDNV, qDNV2, qDGD, qDocCss, qHd, qBf, qFt, qScope, qDocHtml, qPrintHtml, qPdfTimed } from '../docs/quote.js';

export const QST = ['Draft', 'Sent', 'Follow-up Required', 'Approved', 'Rejected', 'Expired', 'Converted'];
const QCOL = { Draft: 'warning', Sent: 'info', 'Follow-up Required': 'warning', Approved: 'success', Rejected: 'error', Expired: 'error', Converted: 'secondary' };
const QPill = ({ s }) => <Chip size="small" label={s} color={QCOL[s] || 'default'} sx={{ fontWeight: 700 }} />;
const qfl = { q: '', status: '', page: 1 };
const PC_SLOTS = ['Processor', 'Motherboard', 'RAM', 'SSD', 'HDD', 'Graphics Card', 'Cabinet', 'SMPS', 'Monitor', 'Keyboard', 'Mouse'];
export const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
export const openQuote = id => go('quote', { id });

/* ---------- list + dashboard ---------- */
export default function Quotes() {
  const a = isAdmin();
  const [d, setD] = useState(null), [list, setList] = useState(null), [, setN] = useState(0);
  const load = () => api('quote.list', qfl).then(setList, e => toast(e.message, 'bad'));
  const re = useState(() => debounce(() => { qfl.page = 1; load(); }, 250))[0];
  useEffect(() => { api('quote.dash', {}).then(setD, e => toast(e.message, 'bad')); load(); }, []);
  const filter = s => { qfl.status = s; qfl.page = 1; setN(n => n + 1); load(); };
  const bc = s => s === 'Converted' ? '#7c3aed' : s === 'Approved' ? '#16a34a' : s === 'Rejected' || s === 'Expired' ? '#ef4444' : '#1f6feb';
  return <Box>
    <PageHead title="Quotations"><Button variant="contained" startIcon={<AddIcon />} onClick={() => go('quote', { newq: 1 })}>New Quotation</Button>{a && <Button variant="outlined" onClick={qSettings}>Quotation settings</Button>}</PageHead>
    {!d ? <Skel /> : <>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' } }}>
        {QST.map(s => <Paper key={s} variant="outlined" onClick={() => filter(s)} sx={{ p: 1.5, cursor: 'pointer', borderLeft: `4px solid ${bc(s)}` }}><Typography variant="caption" color="text.secondary">{s}</Typography><Typography variant="h6" fontWeight={800}>{nf(d.counts[s])}</Typography>{a && <Typography variant="caption">{inr(d.values[s])}</Typography>}</Paper>)}
        {a && <Paper variant="outlined" sx={{ p: 1.5, borderLeft: '4px solid #16a34a' }}><Typography variant="caption" color="text.secondary">Conversion rate</Typography><Typography variant="h6" fontWeight={800}>{d.conversionRate}%</Typography></Paper>}
        {d.pendingApproval && a ? <Paper variant="outlined" onClick={() => filter('')} sx={{ p: 1.5, cursor: 'pointer', borderLeft: '4px solid #f59e0b' }}><Typography variant="caption" color="text.secondary">Discount approvals waiting</Typography><Typography variant="h6" fontWeight={800}>{d.pendingApproval}</Typography></Paper> : null}
      </Box>
      {d.followups.length > 0 && <Section sx={{ my: 2 }} title={`Follow-ups due (${d.followups.length})`}><DataTable rows={d.followups} onRow={r => openQuote(r.id)} cols={[{ h: 'Quotation', k: r => <b>{r.id}</b> }, { h: 'Customer', k: r => <>{r.name}{r.mobile && <><br /><small>{r.mobile}</small></>}</> }, { h: 'Amount', k: r => inr(r.total), align: 'right' }, { h: 'Due', k: r => r.followDate }, { h: 'Assigned', k: r => r.by }, { h: 'Note', k: r => r.followNote }]} /></Section>}
      {a && d.staff && d.staff.length > 0 && <Section sx={{ my: 2 }} title="Staff-wise quotations"><DataTable rows={d.staff} cols={[{ h: 'Staff', k: r => <b>{r.name}</b> }, { h: 'Quotations', k: r => nf(r.count), align: 'right' }, { h: 'Value', k: r => inr(r.value), align: 'right' }, { h: 'Converted', k: r => nf(r.converted), align: 'right' }]} /></Section>}
    </>}
    <Stack direction="row" gap={1} sx={{ my: 2 }} flexWrap="wrap">
      <TextField size="small" sx={{ flex: '1 1 220px' }} placeholder="Quote no / name / mobile" defaultValue={qfl.q} onChange={e => { qfl.q = e.target.value; re(); }} />
      <TextField size="small" select sx={{ minWidth: 180 }} value={qfl.status} onChange={e => filter(e.target.value)} SelectProps={{ displayEmpty: true }}><MenuItem value="">{LT('all')}</MenuItem>{QST.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
    </Stack>
    {!list ? <Skel /> : <><DataTable rows={list.rows} onRow={x => openQuote(x.id)} empty="No quotations yet. Tap New Quotation."
      cols={[{ h: 'Quotation', k: x => <><b>{x.id}</b><br /><small>{dtm(x.date, x.at)}</small></>, nw: true }, { h: 'Customer', k: x => <>{x.name}{x.mobile && <><br /><small>{x.mobile}</small></>}</> }, { h: 'Amount', k: x => inr(x.total), align: 'right' }]
        .concat(a ? [{ h: 'Profit', k: x => <span style={{ color: '#16a34a' }}>{inr(x.profit)}</span>, align: 'right' }] : [])
        .concat([{ h: 'Valid until', k: x => dtm(x.validUntil) }, { h: 'By', k: x => x.by }, { h: 'Status', k: x => <Stack direction="row" gap={0.5} flexWrap="wrap"><QPill s={x.status} />{x.discStatus === 'Pending' && <Chip size="small" color="warning" label="Discount?" />}</Stack> }])} />
      <Pager res={list} onPage={p => { qfl.page = p; load(); }} /></>}
  </Box>;
}

/* ---------- live preview of totals (mirror of the server formula) ---------- */
export function qcalc(e) {
  let gross = 0, ld = 0; const base = e.lines.map(l => { const g = (+l.qty || 0) * (+l.unitPrice || 0), d = Math.min(Math.max(0, +l.lineDisc || 0), g); gross += g; ld += d; return g - d; });
  const after = gross - ld, bill = Math.min(Math.max(0, +e.billDisc || 0), after); let taxable = 0, tax = 0, cost = 0; const brk = {};
  e.lines.forEach((l, i) => {
    const t = after > 0 ? base[i] - bill * base[i] / after : 0, rate = e.gst ? (l.gstRate === '' || l.gstRate == null ? +e.gstRate : +l.gstRate) : 0, tx = r2(t * rate / 100);
    l._tx = tx; l._tot = r2(t + tx); taxable += r2(t); tax += tx; cost += (+l.cost || 0) * (+l.qty || 0);
    const b = brk[rate] = brk[rate] || { rate, taxable: 0, tax: 0 }; b.taxable += r2(t); b.tax += tx;
  });
  const exact = taxable + tax, total = Math.round(exact);
  return { gross: r2(gross), ld: r2(ld), bill: r2(bill), disc: r2(ld + bill), taxable: r2(taxable), tax: r2(tax), round: r2(total - exact), total, cost: r2(cost), profit: r2(taxable - cost), brk: Object.values(brk).filter(b => b.rate > 0) };
}
function qIntra(e) { if (e.taxType === 'IGST') return false; const g = (e.gstNo || '').trim(); if (/^\d{2}/.test(g)) return g.slice(0, 2) === (e.stateCode || '24'); return true; }
/* vendor list: each line "name ... price" -> {name, cost (with GST), base} */
export function qBulkParse(txt, g) { const out = []; String(txt || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(ln => { const mt = ln.match(/^(.*?)[\s:=-]*₹?\s*([\d,]+(?:\.\d+)?)\s*\+?\s*$/); if (mt && mt[1].trim()) out.push({ name: mt[1].trim(), cost: Math.round(+mt[2].replace(/,/g, '') * (1 + g / 100) * 100) / 100, base: +mt[2].replace(/,/g, '') }); }); return out; }

/* ---------- editor state (one quotation at a time, like QE in the live ERP) ---------- */
let QE = null, reQ = () => { };
const mapLine = l => ({ kind: l.kind, part: l.part, productId: l.productId, name: l.name, brand: l.brand, model: l.model, spec: l.spec, qty: l.qty, unitPrice: l.unitPrice, lineDisc: l.lineDisc || 0, gstRate: l.gstRate, cost: l.cost, available: l.available, belowMin: l.belowMin });
const qLocked = () => QE.status === 'Converted';
const bk = () => (QE.bulk = QE.bulk || { txt: '', g: 18, gw: 'all', pf: '', pm: '', cq: '' });
const qBulkG = () => { const b = bk(); if (b.gw === 'none') return 0; const v = String(b.g == null ? '' : b.g).trim(); return v === '' ? 18 : (+v || 0); };
const QSET = 'TOTAL COMPLETE SET';
function qSetLine(make) { let s = QE.lines.find(l => l.name === QSET); if (!s && make) { s = { _bulk: 1, kind: 'Custom', part: '', productId: '', name: QSET, brand: '', model: '', spec: '', qty: 1, unitPrice: 0, lineDisc: 0, gstRate: '', cost: 0 }; QE.lines.push(s); } else if (s && make) { QE.lines.splice(QE.lines.indexOf(s), 1); QE.lines.push(s); } return s; }
function qProfitApply() {
  const b = bk(), pf = +b.pf || 0, pm = +b.pm || 0, rd = 10, cq = +b.cq || 0, st = qSetLine(false);
  if (st) {   /* line-by-line mode: parts stay at no price, the TOTAL COMPLETE SET line gets cost + profit */
    const pt = QE.lines.filter(l => l !== st && +l.cost > 0); if (!pt.length) return 0;
    const tc = pt.reduce((a, l) => a + l.cost * l.qty, 0), up = cq ? cq : pm ? tc * (1 + pm / 100) : tc + pf;
    pt.forEach(l => { l.unitPrice = 0; l.belowMin = false; }); st.qty = 1; st.cost = 0; st.unitPrice = Math.ceil(up / rd - 1e-9) * rd;
    return (cq || pm || pf) ? pt.length : 0;
  }
  const ls = QE.lines.filter(l => +l.cost > 0);
  if (!ls.length || (!pf && !pm && !cq)) return 0;
  const tc = ls.reduce((a, l) => a + l.cost * l.qty, 0), pf2 = cq ? cq - tc : pf;
  ls.forEach(l => { const up = pm && !cq ? l.cost * (1 + pm / 100) : l.cost + pf2 * (l.cost * l.qty / tc) / l.qty; l.unitPrice = Math.ceil(up / rd - 1e-9) * rd; l.belowMin = false; });
  return ls.length;
}
const prodLine = (r, part, qty) => ({ kind: 'Product', part: part || '', productId: r.productId, name: r.name, brand: r.brand, model: r.model, spec: r.spec, qty: qty || 1, unitPrice: r.sellPrice, lineDisc: 0, gstRate: '', cost: r.cost, available: r.available, belowMin: !!(r.cost && r.sellPrice && r.sellPrice < r.cost) });
async function qAddProduct(pid) {
  const r = (await api('quote.prod', { ids: [pid] }))[0]; if (!r) return toast('Product not found', 'bad');
  const ex = QE.lines.find(l => l.productId === pid && !l.part);
  if (ex) ex.qty = (+ex.qty || 0) + 1; else QE.lines.push(Object.assign(prodLine(r), { productId: pid }));
  if (r.sellPrice === 0) toast('Selling price of ' + r.name + ' is 0. Type the price.', 'bad');
  reQ();
}
function qApply(q) { Object.assign(QE, { id: q.id, status: q.status, discStatus: q.discStatus, orderId: q.orderId, followDate: q.followDate, followNote: q.followNote, followBy: q.followBy, log: q.log, shop: q.shop, validUntil: q.validUntil, billDisc: q.billDisc, createdBy: q.createdBy, taxType: q.taxType, gst: q.gst, lines: q.lines.map(mapLine) }); QE._fd = q.followDate || ''; QE._fn = q.followNote || ''; reQ(); }
const qsave = () => work(async () => {
  const x = QE, a = isAdmin(), body = { id: x.id || undefined, name: x.name, mobile: x.mobile, address: x.address, gstNo: x.gstNo, customerId: x.customerId, gst: x.gst, gstRate: x.gstRate, taxType: x.taxType, date: x.date, validUntil: x.validUntil, billDisc: x.billDisc, note: x.note, terms: x.terms, format: x.format, followDate: x.followDate,
    lines: x.lines.map(l => ({ kind: l.kind, part: l.part, productId: l.productId, name: l.name, brand: l.brand, model: l.model, spec: l.spec, qty: l.qty, unitPrice: l.unitPrice, lineDisc: l.lineDisc, gstRate: l.gstRate === '' ? undefined : l.gstRate, cost: a ? l.cost : undefined })) };
  const r = await api('quote.save', body, { rid: rid(), loader: true }); toast('Saved ' + r.id); S.params = { id: r.id }; qApply(r);
});
async function qEnsureSaved() { if (!QE.id) await qsave(); if (!QE.id) { toast('Save the quotation first', 'bad'); return false; } return true; }
async function qDocData() { const q = await api('quote.get', { id: QE.id }); const ids = q.lines.map(l => l.productId).filter(Boolean); try { await Promise.race([loadThumbs(ids), new Promise(r => setTimeout(r, 2500))]); } catch (e) { } q.forTick = QE.forTick || {}; return q; }
const qlog = (event, detail) => api('quote.log', { id: QE.id, event, detail }, { rid: rid() }).catch(() => { });
async function qDoc(kind, inv) { if (!await qEnsureSaved()) return; const fmt = QE.format, q = await qDocData(); qPrintHtml(qDocHtml(q, fmt, inv)); qlog(inv ? 'Invoice' : kind, fmt); }
const qpdf = () => work(async () => {
  if (!await qEnsureSaved()) return;
  toast('PDF bani rahyu che, 2-3 second...');
  try {
    const q = await qDocData(), file = await qPdfTimed(q), u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
    qlog('PDF', 'A4 file'); toast('PDF download thayu: ' + file.name);
  } catch (e) { toast('Choose "Save as PDF" in the print window'); return qDoc('PDF'); }
});
/* WhatsApp: the FULL quotation (same design as PDF) goes as a PDF file */
const qwa = () => work(async () => {
  if (!await qEnsureSaved()) return;
  const q = await qDocData(), d = (q.mobile || '').replace(/\D/g, '').slice(-10);
  toast('PDF bani rahyu che, 2-3 second...');
  let file = null; try { file = await qPdfTimed(q); } catch (e) { file = null; }
  const sm = q.lines.some(l => l.name === QSET), items = q.lines.slice(0, 25).map(l => sm && l.name !== QSET && !(+l.unitPrice) ? `• ${l.name}${l.spec ? ' (' + l.spec + ')' : ''}` : `• ${l.name}${l.spec ? ' (' + l.spec + ')' : ''} x${l.qty} = ${inr(l.qty * l.unitPrice - (l.lineDisc || 0))}`).join('\n');
  const msg = file ? `Hello ${q.name},\nThank you for visiting C COMPUTER – The Computer House.\n\n*Quotation ${q.id}* – *Total: ${inr(q.total)}*\nValid until: ${dtm(q.validUntil)}\n\nQuotation attached. Please reply to confirm.\nC COMPUTER, Katargam, Surat · ${q.shop.phone}`
    : `Hello ${q.name},\nThank you for visiting C COMPUTER – The Computer House.\n\n*Quotation ${q.id}*\n${items}\n\n*Total: ${inr(q.total)}*${q.gst ? ' (incl. GST)' : ''}\nValid until: ${dtm(q.validUntil)}\n\nPlease reply to confirm.\nC COMPUTER, Katargam, Surat · ${q.shop.phone}`;
  qlog('WhatsApp', file ? 'PDF shared' : 'opened (message not auto-sent)');
  const phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (file && phone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: msg, title: 'Quotation ' + q.id }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    const go2 = f => async () => { try { await navigator.share({ files: [f], text: f === file ? msg : '', title: 'Quotation ' + q.id }); mm.close(); } catch (e) { if (e && e.name === 'AbortError') return; toast('Share nathi thatu. PDF download karo', 'bad'); } };
    const mm = openDialog('WhatsApp par moklo', () => <><p style={{ margin: '0 0 10px' }}>Quotation ready che. Niche no button dabavo, pachi <b>WhatsApp</b> select karo.</p><Stack gap={1.2}><Button size="large" variant="contained" color="success" onClick={go2(file)}>📄 PDF moklo</Button>{file.jpg && <Button size="large" variant="outlined" onClick={go2(file.jpg)}>🖼 Photo (Image) moklo</Button>}</Stack></>, { sticky: true, maxWidth: 'xs' });
    return;
  }
  if (file) { const u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); toast('PDF download thayu. WhatsApp ma 📎 thi attach karo, pachi Send'); }
  else toast('WhatsApp khule che - Send daba');
  const url = `https://wa.me/${d.length === 10 ? '91' + d : ''}?text=${encodeURIComponent(msg)}`;
  setTimeout(() => { window.open(url, '_blank'); }, file ? 1500 : 400);
});
function qPreload() {   /* load the PDF libraries quietly in the background, so the PDF button is fast */
  const a = () => window.html2canvas ? 0 : qLoadJs(['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js']), b = () => window.jspdf && window.jspdf.jsPDF ? 0 : qLoadJs(['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js']);
  Promise.resolve().then(a).then(b).catch(() => { });
}

/* ---------- small dialogs ---------- */
function qSettings() {
  work(async () => {
    const s = await api('quote.set.get', {}), v = Object.assign({}, s);
    const F = (k, l, ta) => <TextField key={k} fullWidth size="small" label={l} defaultValue={s[k]} multiline={!!ta} minRows={ta ? 4 : undefined} onChange={e => { v[k] = e.target.value; }} />;
    const m = openDialog('Quotation settings', () => <Stack gap={1.5} sx={{ pt: 1 }}>{F('QUOTE_SHOP_ADDR', 'Shop address (on PDF)')}{F('QUOTE_PHONE', 'Shop phone / WhatsApp')}{F('QUOTE_GSTIN', 'Shop GST number (blank if none)')}
      <Stack direction="row" gap={1}>{F('QUOTE_STATE', 'Shop state code (Gujarat 24)')}{F('QUOTE_GST_RATE', 'Default GST %')}</Stack>
      <Stack direction="row" gap={1}>{F('QUOTE_MAX_DISC_PCT', 'Staff discount limit % (above needs admin approval)')}{F('QUOTE_VALID_DAYS', 'Valid days')}</Stack>
      {F('QUOTE_TERMS', 'Terms & conditions', 1)}{F('QUOTE_BANK', 'Payment details (bank / UPI) shown on PDF', 1)}</Stack>,
      { actions: () => <Button variant="contained" onClick={() => work(async () => { const out = {}; Object.keys(s).forEach(k => out[k] = v[k]); await api('quote.set.save', { values: out }, { rid: rid(), loader: true }); m.close(); toast('Saved'); })}>Save</Button> });
  });
}
function qCustom(k) {
  const v = { n: '', d: '', q: '1', p: '' };
  const m = openDialog(k === 'Service' ? 'Add service' : 'Add custom item', () => <Stack gap={1.5} sx={{ pt: 1 }}><TextField autoFocus label="Name *" onChange={e => v.n = e.target.value} /><TextField label="Description" onChange={e => v.d = e.target.value} />
    <Stack direction="row" gap={1}><TextField label="Qty" defaultValue="1" inputProps={{ inputMode: 'decimal' }} onChange={e => v.q = e.target.value} /><TextField label="Price ₹" inputProps={{ inputMode: 'decimal' }} onChange={e => v.p = e.target.value} /></Stack></Stack>,
    { maxWidth: 'sm', actions: () => <Button variant="contained" onClick={() => { const n = v.n.trim(); if (!n) return toast('Enter a name', 'bad'); QE.lines.push({ kind: k, part: '', productId: '', name: n, brand: '', model: '', spec: v.d, qty: +v.q || 1, unitPrice: +v.p || 0, lineDisc: 0, gstRate: '', cost: 0 }); m.close(); reQ(); }}>Add</Button> });
}
function qPickTpl(kind) {
  return new Promise(async res => {
    let list; try { list = (await api('quote.tpl.list', {})).filter(t => !kind || t.kind === kind); } catch (e) { toast(e.message, 'bad'); return res(null); }
    if (!list.length) { toast('No saved templates yet'); return res(null); }
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    const m = openDialog('Choose template', () => <Stack divider={<Divider />}>{list.map((t, i) => <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1 }}><b>{t.name}</b><Stack direction="row" gap={1}><Button size="small" variant="contained" onClick={() => { fin(t); m.close(); }}>Use</Button><Button size="small" color="error" variant="outlined" onClick={() => work(async () => { await api('quote.tpl.del', { id: t.id }, { rid: rid() }); fin(null); m.close(); toast('Deleted'); })}>Delete</Button></Stack></Stack>)}</Stack>, { maxWidth: 'sm', onClose: () => fin(null) });
  });
}
const qtpl = () => work(async () => { const t = await qPickTpl(''); if (!t) return; const r = await api('quote.prod', { ids: t.lines.map(l => l.productId) }); t.lines.forEach(l => { const p = r.find(x => x.productId === l.productId); if (p) QE.lines.push(prodLine(p, l.part, l.qty)); }); reQ(); toast('Template added with today\'s prices'); });
const qsavetpl = () => work(async () => { const ls = QE.lines.filter(l => l.productId); if (!ls.length) return toast('Add catalogue products first', 'bad'); const n = await promptBox('Save as template', 'Template name'); if (!n) return; await api('quote.tpl.save', { name: n, kind: 'Favourite', lines: ls.map(l => ({ productId: l.productId, part: l.part, qty: l.qty })) }, { rid: rid(), loader: true }); toast('Template saved'); });
function qpc() {
  const slots = {}; let paint = () => { };
  const Body = () => { const [, setN] = useState(0); paint = () => setN(n => n + 1); let t = 0; PC_SLOTS.forEach(s => { if (slots[s]) t += slots[s].sellPrice * (slots[s].qty || 1); });
    return <Stack gap={1.5}>{PC_SLOTS.map(s => <Box key={s}><Typography variant="caption" fontWeight={700}>{s}</Typography>
      {slots[s] ? <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, border: '1px solid #e5e7eb', borderRadius: 2 }}><span><b>{slots[s].name}</b><br /><small>Stock {nf(slots[s].available)}</small></span><span>{inr(slots[s].sellPrice)} <Button size="small" color="error" onClick={() => { delete slots[s]; paint(); }}>✕</Button></span></Stack>
        : <ProductPicker placeholder={'Search ' + s} onPick={async p => { const r = (await api('quote.prod', { ids: [p.ProductID] }))[0]; if (r) { slots[s] = Object.assign(r, { qty: 1 }); paint(); } }} />}</Box>)}
      <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}><span>Selected total</span><b>{inr(t)}</b></Stack></Stack>; };
  const m = openDialog('PC Build quotation', () => <Body />, { actions: () => <>
    <Button variant="outlined" onClick={() => work(async () => { const list = PC_SLOTS.filter(s => slots[s]); if (!list.length) return toast('Choose at least one part', 'bad'); const n = await promptBox('Save as template', 'Template name (example: Office PC i3)'); if (!n) return; await api('quote.tpl.save', { name: n, kind: 'PC', lines: list.map(s => ({ productId: slots[s].productId, part: s, qty: 1 })) }, { rid: rid(), loader: true }); toast('Template saved'); })}>Save as template</Button>
    <Button variant="outlined" onClick={() => work(async () => { const t = await qPickTpl('PC'); if (!t) return; const r = await api('quote.prod', { ids: t.lines.map(l => l.productId) }); t.lines.forEach(l => { const p = r.find(x => x.productId === l.productId); if (p && PC_SLOTS.includes(l.part)) slots[l.part] = Object.assign(p, { qty: 1 }); }); paint(); })}>Load template</Button>
    <Button variant="contained" onClick={() => { const list = PC_SLOTS.filter(s => slots[s]); if (!list.length) return toast('Choose at least one part', 'bad'); for (const s of list) QE.lines.push(prodLine(slots[s], s)); m.close(); reQ(); }}>Add to quotation</Button></> });
}
const QTYPES = [   /* [label, name regex, search words, category/name regex] */
  ['cpu', /\b(i[3579][- ]?\d*|ryzen|\d{4,5}k[fs]?f?|processor|cpu|pentium|celeron|core)\b/, ['processor', 'cpu', 'intel', 'ryzen', 'i5', 'i3'], 'processor|cpu|ryzen|intel core'],
  ['mb', /\b(motherboard|mother board|mobo|[bhzaxq]\d{3}m?e?|mb)\b/, ['motherboard', 'mother board', 'board', 'h110', 'h61'], 'motherboard|mother board|mobo'],
  ['ram', /\b(ram|ddr\d?|sodimm|memory)\b/, ['ram', 'ddr4', 'ddr5', 'memory'], '\\bram\\b|ddr|memory'],
  ['ssd', /\b(ssd|nvme|m\.?2|sata ssd)\b/, ['ssd', 'nvme'], 'ssd|nvme'],
  ['hdd', /\b(hdd|hard ?disk|hard drive)\b/, ['hdd', 'hard disk'], 'hdd|hard ?disk|hard drive'],
  ['smps', /\b(smps|psu|power supply)\b/, ['smps', 'psu', 'power supply'], 'smps|psu|power supply'],
  ['cab', /\b(cabinet|case|chassis)\b/, ['cabinet', 'case'], 'cabinet|case|chassis'],
  ['fan', /\b(fan|cooler|heatsink|cooling)\b/, ['cooler', 'fan'], 'cooler|fan|heatsink|cooling'],
  ['gpu', /\b(gpu|graphic|graphics|rtx|gtx|radeon)\b/, ['graphics', 'gpu', 'rtx'], 'graphic|gpu|rtx|gtx|radeon'],
  ['kb', /\b(keyboard)\b/, ['keyboard'], 'keyboard'], ['ms', /\b(mouse)\b/, ['mouse'], 'mouse'], ['mon', /\b(monitor|display|led)\b/, ['monitor'], 'monitor|display']
];
/* background photo matcher: shared search cache, one fallback search per type, only 2 searches per line */
const QPQ = {};
const qQuick = q => QPQ[q] || (QPQ[q] = api('prod.quick', { q }, { loader: false }).then(r => r || []).catch(() => []));
async function qBulkPhotos(lines) {
  const GEN = new Set(['yr', 'yrs', 'year', 'box', 'imp', 'with', 'and', 'the', 'new', 'gen']);
  try {
    const found = await Promise.all(lines.map(async ln => {
      const toks = ln.name.toLowerCase().split(/[\s,\/()+-]+/).filter(x => x.length > 1 && !GEN.has(x));
      const qs = [...new Set([ln.name.split(/\s+/).slice(0, 3).join(' ')].concat(toks.filter(x => /\d/.test(x) && x.length >= 4).slice(0, 1)))];
      const pool = {}; (await Promise.all(qs.map(qQuick))).forEach(r => r.forEach(p => { pool[p.ProductID] = p; }));
      const wt = x => /\d/.test(x) ? 2 : 1, tot = toks.reduce((a, x) => a + wt(x), 0) || 1;
      const sc = p => { const t = (p.Name + ' ' + (p.Brand || '') + ' ' + (p.Model || '')).toLowerCase(); return toks.filter(x => t.includes(x)).reduce((a, x) => a + wt(x), 0) / tot; };
      const best = Object.values(pool).map(p => [sc(p), p]).filter(x => x[0] >= 0.3).sort((x, y) => y[0] - x[0]).slice(0, 5).map(x => x[1]);
      const ty = QTYPES.find(t => t[1].test(ln.name.toLowerCase()));
      let fb = []; if (ty) { const pl = {}; (await Promise.all(ty[2].slice(0, 2).map(qQuick))).forEach(r => r.forEach(p => { pl[p.ProductID] = p; })); fb = Object.values(pl).filter(p => { const t = QTYPES.find(x => x[1].test(String(p.Name || '').toLowerCase())); return t && t[0] === ty[0]; }).slice(0, 12); }
      return { best, fb };
    }));
    await loadThumbs([...new Set(found.flatMap(f => f.best.concat(f.fb)).map(p => p.ProductID))]);
    lines.forEach((ln, i) => { const f = found[i], hp = p => S.thumbs[p.ProductID], prod = f.best.find(hp) || f.fb.find(hp) || f.best[0]; if (prod) { ln.kind = 'Product'; ln.productId = prod.ProductID; ln.brand = prod.Brand; ln.model = prod.Model; ln.available = prod.available; } });
    reQ();
  } catch (e) { }
}
const qbulk = mode => work(async () => {
  /* "one" = Single item (total set): every part listed with NO price + one TOTAL COMPLETE SET line.  "sep" = Separate items: every part gets its own price. */
  const crm = mode === 'one', txt = (bk().txt || '').split('\n').map(x => x.trim()).filter(Boolean), g = qBulkG(); let n = 0, m = 0;
  QE.lines = QE.lines.filter(l => !l._bulk);   /* pressing the button again replaces the earlier bulk lines, no duplicates */
  const items = [];
  for (const ln of txt) { const mt = ln.match(/^(.*?)[\s:=-]*₹?\s*([\d,]+(?:\.\d+)?)\s*\+?\s*$/); if (!mt || !mt[1].trim()) continue; const price = +mt[2].replace(/,/g, ''); items.push({ name: mt[1].trim(), cost: Math.round(price * (1 + g / 100) * 100) / 100 }); }
  /* lines are added at once (fast); catalogue photos are matched in the background and appear a moment later */
  const added = [];
  items.forEach(it => { const ln = { _bulk: 1, kind: 'Custom', part: '', productId: '', name: it.name, brand: '', model: '', spec: '', qty: 1, unitPrice: crm ? 0 : it.cost, lineDisc: 0, gstRate: '', cost: it.cost }; QE.lines.push(ln); added.push(ln); n++; });
  qBulkPhotos(added);
  if (crm && n) qSetLine(true);   /* ONE final line carries the total price */
  const pn = n ? qProfitApply() : 0;
  reQ(); toast(n ? (crm ? `${n} items added, last line TOTAL COMPLETE SET. Photos are loading...` : `${n} lines added. Photos are loading...`) + (pn ? ' Profit added too.' : ' Now add profit.') : 'No valid line found. Last number of each line must be the price.', n ? '' : 'bad');
});

/* ---------- editor page ---------- */
const EDCSS = `.qdoc{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;max-width:980px;margin:0 auto;overflow:hidden}
.qpv input,.qpv textarea,.qpv select{font:inherit;border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#fff;color:#0f172a;max-width:100%}
.qpv .rw input,.qpv .rw textarea{flex:1;min-width:0}.qpv .pdl input{padding:2px 6px}.qd-in{padding:0 4px}
.qd-box{border:1px solid #e5e7eb;border-radius:8px;background:#fff;overflow:hidden}.qd-cb h4{margin:0;background:#eceff1;padding:12px 14px;font-size:15px;border-bottom:1px solid #e5e7eb}
.qd-for{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px 8px;padding:14px}.qd-chip{display:flex;align-items:center;gap:6px;font-size:15px;cursor:pointer}.qd-chip input{width:16px;height:16px}
.qd-items{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:6px}.qd-add{padding:10px 12px;background:#f0fdf4}
.qd-t{width:100%;border-collapse:collapse}.qd-t th{background:#16a34a;color:#fff;text-align:center;padding:8px 4px}.qd-t td{vertical-align:top;padding:6px 4px;border-bottom:1px solid #eef2f7}.qd-t .c{text-align:center}.qd-t .r{text-align:right}
.qd-t .qi{width:48px;height:40px;object-fit:contain;float:left;margin-right:8px}.qtag{font-size:11px;background:#eef2f9;border-radius:6px;padding:2px 7px;color:#475569}.qint{color:#64748b}
.qd-tot{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;flex:1}.qrow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;gap:10px}
.qd-gt{font-size:18px;background:#6b7280;color:#fff;border-radius:6px;padding:8px 10px!important;margin-top:6px}.qd-empty{padding:20px;text-align:center;color:#64748b}
@media(max-width:700px){.qpv .pcw{display:none!important}.qpv .cu{flex-direction:column}.qpv .pcw,.qpv .bf{width:100%!important}.qpv .two{flex-direction:column}.qpv .tc{flex-direction:column}.qpv .tc .b{border-left:0}.qpv .bn{flex-direction:column;align-items:stretch}.qpv .hd .tx{display:none}.qdoc{padding:8px}}`;
const SCOPED = qScope(qDocCss(false, qDNV, qDNV2, qDGD), '.qpv');
const H = ({ h, ...p }) => <span {...p} dangerouslySetInnerHTML={{ __html: h }} />;
const FOR = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'CCTV', 'Accessories', 'Gaming PC', 'Others'];
const isoAdd = (d, n) => { const x = new Date((d || new Date().toISOString().slice(0, 10)) + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export function Quote({ params }) {
  const [, setN] = useState(0), [ready, setReady] = useState(false);
  useEffect(() => {
    reQ = () => setN(n => n + 1);
    work(async () => {
      const p = params || {}; let q = null; const cfg = await api('quote.cfg', {});
      if (p.id) q = await api('quote.get', { id: p.id });
      QE = q ? { id: q.id, status: q.status, date: q.date, validUntil: q.validUntil, name: q.name, mobile: q.mobile, address: q.address, gstNo: q.gstNo, customerId: q.customerId, gst: q.gst, taxType: q.taxType, gstRate: (q.lines[0] && q.lines[0].gstRate) || 18, billDisc: q.billDisc, note: q.note, terms: q.terms, format: q.format || 'premium', discStatus: q.discStatus, orderId: q.orderId, followDate: q.followDate, followNote: q.followNote, followBy: q.followBy, log: q.log, shop: q.shop, createdBy: q.createdBy, lines: q.lines.map(mapLine) }
        : { id: '', status: 'Draft', date: new Date().toISOString().slice(0, 10), validUntil: '', name: '', mobile: '', address: '', gstNo: '', customerId: '', gst: false, taxType: '', gstRate: 18, billDisc: 0, note: '', terms: '', format: 'premium', lines: [], log: [], discStatus: 'OK' };
      QE.stateCode = cfg.state; QE.maxDisc = cfg.maxDiscPct; if (!q) QE.gstRate = cfg.gstRate; QE._fd = QE.followDate || ''; QE._fn = QE.followNote || '';
      const ids = QE.lines.map(l => l.productId).filter(Boolean); if (ids.length) loadThumbs(ids).then(() => reQ(), () => { });
      setReady(true); qPreload();
    });
    return () => { reQ = () => { }; };
  }, []);
  if (!ready || !QE) return <Loading />;
  return <QuoteBody />;
}

function QuoteBody() {
  const a = isAdmin(), e = QE, lock = qLocked(), c = qcalc(e), intra = qIntra(e), sh = e.shop || {}, saved = !!e.id, st = e.status;
  if (!e.validUntil && !e.id) { e.validUntil = isoAdd(e.date, 2); e._vAuto = true; }   /* valid for 2 days, same as the Terms */
  e.forTick = e.forTick || {};
  const set = (k, v, redraw) => { e[k] = v; if (redraw !== false) reQ(); };
  const inp = (k, o) => <input {...(o || {})} value={e[k] == null ? '' : e[k]} disabled={lock} onChange={ev => set(k, ev.target.value)} />;
  const mobBlur = async () => {   // existing customer: fill details automatically
    const d = String(e.mobile || '').replace(/\D/g, '').slice(-10); if (d.length !== 10 || e.name) return;
    try { const r = await api('cust.search', { q: d }); if (r[0]) { e.name = r[0].name; e.address = e.address || r[0].address; e.customerId = r[0].id; reQ(); toast('Customer found: ' + r[0].name); } } catch (x) { }
  };
  if (!e._tInit) { e._tInit = true; if (!String(e.terms || '').trim()) e.terms = (String(sh.terms || '').split('\n').map(x => x.trim()).filter(x => x && !/warrant|payment|advance|bank|upi|a\/c|account no|ifsc/i.test(x)).map(x => x.replace(/^\d+[.)]\s*/, '')).join('\n') || 'Quotation prices are valid for 2 days only.\nProduct price and availability are subject to stock and market price changes.'); }
  const termsTxt = e.terms || '';
  const lim = l => (l.productId && S.thumbs[l.productId]) || (l.name === QSET ? '' : PARTICO((l.part || '') + ' ' + l.name));
  const btns = <>
    <Button variant="outlined" onClick={() => go('quotes')}>Back</Button>
    <Button variant="contained" startIcon={<AddIcon />} onClick={() => work(async () => { if (!lock && e.lines.length) await qsave(); go('quote', { newq: 1 }); })}>New Quotation</Button>
    <Button variant="contained" color="success" onClick={qwa}>WhatsApp</Button>
    <Button variant="outlined" onClick={qpdf}>PDF</Button>
    <Button variant="outlined" onClick={() => work(() => qDoc('Print'))}>Print</Button>
    {saved && <Button variant="outlined" onClick={() => work(async () => { const r = await api('quote.dup', { id: e.id }, { rid: rid(), loader: true }); toast('Duplicated as ' + r.id); go('quote', { id: r.id }); })}>Duplicate</Button>}
    {saved && lock && <Button variant="outlined" onClick={() => work(() => qDoc('PDF', true))}>Invoice</Button>}
    {!lock && <Button variant="contained" startIcon={<AddIcon />} onClick={qsave}>Save</Button>}
  </>;
  return <Box>
    <PageHead title={e.id || 'New Quotation'}>{btns}</PageHead>
    <style>{SCOPED + EDCSS}</style>
    <div className="qdoc qpv">
      <div dangerouslySetInnerHTML={{ __html: qHd().replace('class="lg"', 'class="plg"') }} />
      <div className="qd-in">
        <div className="bn"><div className="ti"><div className="l"><H h={QIC('doc', '#fff', 34)} /><div><h1>QUOTATION</h1><small>TECHNOLOGY YOU CAN TRUST</small></div></div>
          <svg className="sl" viewBox="0 0 46 62" preserveAspectRatio="none"><path d="M0 0 H14 L46 0 L26 62 H0 Z" fill={qDGD} /><path d="M0 0 H8 L-12 62 H0 Z" fill={qDNV} /><path d="M0 0 H12 L-8 62 H0 Z" fill={qDNV} /></svg></div>
          <div className="mt"><div className="qn">Quotation No. : {e.id || 'Auto on save'}</div>
            <div className="pdl"><H h={QIC('cal', qDNV, 16)} /><span>Quotation Date : <input type="date" value={e.date || ''} disabled={lock} onChange={ev => { e.date = ev.target.value; if (e._vAuto && !e.id) e.validUntil = ''; reQ(); }} /></span></div>
            <div className="pdl"><H h={QIC('cal', qDNV, 16)} /><span>Valid Till : <input type="date" value={e.validUntil || ''} disabled={lock} onChange={ev => { e._vAuto = false; set('validUntil', ev.target.value); }} /></span></div></div></div>
        <div className="cu"><div className="cb"><div className="tag"><H h={QIC('user', '#fff', 15)} />Customer Information</div><div className="bx">
          <div className="rw"><b>Customer Name</b>{inp('name', { placeholder: 'Customer Name' })}</div>
          <div className="rw"><b>Mobile Number</b>{inp('mobile', { placeholder: 'Mobile Number', inputMode: 'numeric', maxLength: 13, onBlur: mobBlur })}</div>
          <div className="rw"><b>Address</b><textarea rows={2} placeholder="Customer Address" disabled={lock} value={e.address || ''} onChange={ev => set('address', ev.target.value)} /></div>
          {e.gst && <div className="rw"><b>GSTIN</b><input maxLength={15} placeholder="Customer GST number (optional)" style={{ textTransform: 'uppercase' }} disabled={lock} value={e.gstNo || ''} onChange={ev => set('gstNo', ev.target.value.toUpperCase())} /></div>}</div></div>
          <div className="pcw"><img src={QPCIMG} alt="" /></div>
          <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: qBf() }} /></div>
        <div className="qd-box qd-cb" style={{ margin: '0 0 12px' }}><h4>Quotation For</h4><div className="qd-for">{FOR.map(f => <label key={f} className="qd-chip"><input type="checkbox" checked={!!e.forTick[f]} onChange={ev => { e.forTick[f] = ev.target.checked; reQ(); }} /> {f}</label>)}</div></div>
        <div className="qd-items">
          {!lock && <div className="qd-add"><ProductPicker placeholder="Search product by name / model / barcode / serial, Enter to scan" onPick={p => work(() => qAddProduct(p.ProductID))} />
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}><Button size="small" variant="contained" onClick={() => qCustom('Custom')}>+ ADD PRODUCT</Button><Button size="small" variant="outlined" onClick={() => qCustom('Service')}>+ Service</Button><Button size="small" variant="outlined" onClick={qpc}>PC Build</Button><Button size="small" variant="outlined" onClick={qtpl}>Templates</Button><Button size="small" variant="outlined" onClick={qsavetpl}>Save as template</Button></Stack></div>}
          {e.lines.length ? <div style={{ overflowX: 'auto' }}><table className="qd-t"><thead><tr><th>#</th><th>Product / Description</th><th>Qty</th><th>Rate (₹)</th><th>Amount (₹)</th><th>X</th></tr></thead><tbody>
            {e.lines.map((l, i) => { const u = lim(l); return <tr key={i}><td className="c">{i + 1}</td><td style={{ minWidth: 180 }}>{u && <img className="qi" src={u} alt="" />}
              {l.productId || lock ? <b>{qNm(l)}</b> : <textarea rows={2} style={{ width: '100%' }} value={l.name} onChange={ev => { l.name = ev.target.value; reQ(); }} />}
              {l.part && <> <span className="qtag">{l.part}</span></>}
              {(l.brand || l.model || l.spec) && <><br /><small>{[l.brand, l.model].filter(Boolean).join(' · ')}{l.spec ? (l.brand || l.model ? ' · ' : '') + String(l.spec).slice(0, 80) : ''}</small></>}
              {l.belowMin && a && <><br /><small style={{ color: '#dc2626' }}>⚠ Below minimum selling price</small></>}
              {l.productId && l.available != null && l.qty > l.available && <><br /><small style={{ color: '#b45309' }}>⚠ Only {nf(l.available)} in stock</small></>}</td>
              <td className="c"><input inputMode="decimal" style={{ width: 50 }} value={l.qty} disabled={lock} onChange={ev => { l.qty = ev.target.value; reQ(); }} /></td>
              <td className="r"><input inputMode="decimal" style={{ width: 80 }} value={l.unitPrice} disabled={lock} onChange={ev => { l.unitPrice = ev.target.value; reQ(); }} /></td>
              <td className="r"><b>{inr(l._tot)}</b>{+l.lineDisc ? <><br /><small className="qint">- {inr(l.lineDisc)} disc</small></> : null}</td>
              <td>{!lock && <Button size="small" color="error" variant="contained" sx={{ minWidth: 30, px: 1 }} onClick={() => { e.lines.splice(i, 1); reQ(); }}>✕</Button>}</td></tr>; })}
          </tbody></table></div> : <div className="qd-empty">Search a product above, or add a custom item / service.</div>}</div>
        <div className="two"><div className="lf"><div className="dt"><h4><H h={QIC('truck', qDNV, 22)} />Delivery Terms</h4><ul><li><b>Expected Delivery</b>: 1 – 2 Days</li><li><b>Installation</b>: On Request</li><li><b>Delivery Area</b>: Surat &amp; Nearby</li></ul></div>
          <div className="ty">Thank You! <small style={{ fontWeight: 400 }}>for choosing C COMPUTER</small></div>
          <div style={{ margin: '6px 0' }}><small>Note / description</small><br />{inp('note', { style: { width: '100%' } })}</div>
          {c.total ? <small>Amount in words: <b>Rupees {rupeesWords(c.total)} Only</b></small> : null}</div>
          <div className="qd-tot"><div className="qrow"><span>Subtotal</span><b>{inr(c.gross)}</b></div>
            {c.ld ? <div className="qrow"><span>Item discounts</span><b>- {inr(c.ld)}</b></div> : null}
            <div className="qrow"><span><b>Discount (₹)</b></span><input inputMode="decimal" placeholder="0" style={{ width: 110, textAlign: 'right' }} disabled={lock} value={e.billDisc === 0 || e.billDisc == null ? '' : e.billDisc} onChange={ev => set('billDisc', ev.target.value)} /></div>
            <div className="qrow"><span><b>GST</b></span><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><select disabled={lock} value={e.gst ? '1' : '0'} onChange={ev => set('gst', ev.target.value === '1')}><option value="0">No GST</option><option value="1">With GST</option></select>{e.gst && <><input inputMode="decimal" style={{ width: 54 }} disabled={lock} value={e.gstRate} onChange={ev => set('gstRate', ev.target.value)} /> %</>}</span></div>
            {e.gst && <><div className="qrow"><span>Taxable amount</span><b>{inr(c.taxable)}</b></div>
              {c.brk.map(b => intra ? <React.Fragment key={b.rate}><div className="qrow"><span>CGST {b.rate / 2}%</span><b>{inr(r2(b.tax / 2))}</b></div><div className="qrow"><span>SGST {b.rate / 2}%</span><b>{inr(b.tax - r2(b.tax / 2))}</b></div></React.Fragment> : <div key={b.rate} className="qrow"><span>IGST {b.rate}%</span><b>{inr(b.tax)}</b></div>)}
              <small>{intra ? 'Same state: CGST + SGST' : 'Other state: IGST'}</small></>}
            {c.round ? <div className="qrow"><span>Round off</span><b>{inr(c.round)}</b></div> : null}
            <div className="qrow qd-gt"><span>Grand Total (₹)</span><b>{inr(c.total)}</b></div>
            {!a && e.lines.some(l => l.belowMin) && <p style={{ color: '#dc2626', fontSize: 12 }}>⚠ Some prices are below the minimum selling price.</p>}
            {(+c.disc / Math.max(1, c.gross) * 100) > (+e.maxDisc || 5) && !a && <p style={{ color: '#b45309', fontSize: 12 }}>Discount is high. The admin must approve it before you can send this quotation.</p>}</div></div>
        <div className="tc"><div className="a"><h4><H h={QIC('doc', qDNV, 22)} />Terms &amp; Conditions</h4><textarea rows={6} placeholder="Dar line ma ek term lakho" disabled={lock} style={{ width: '100%' }} value={termsTxt} onChange={ev => set('terms', ev.target.value)} /><small style={{ color: '#64748b' }}>Navi line ma navo term lakho. Aa quotation ma j save thase.</small></div><div className="b"><h4>Authorized Signature</h4><div className="ln"></div><small>For C COMPUTER</small></div></div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: qFt(sh).replace('class="ft"', 'class="pft"').replace(/class="it"/g, 'class="pit"') }} />
    </div>
    <Stack direction="row" gap={1} justifyContent="center" flexWrap="wrap" sx={{ my: 2 }}>{!lock && <Button variant="contained" startIcon={<AddIcon />} onClick={qsave}>Save</Button>}<Button variant="contained" color="error" onClick={qpdf}>PDF</Button><Button variant="outlined" onClick={() => work(() => qDoc('Print'))}>Print</Button><Button variant="contained" color="success" onClick={qwa}>WhatsApp</Button></Stack>
    {!lock && a && <BulkCard c={c} />}
    {!lock && a && <CostCard c={c} />}
    {saved && <StatusCard />}
    {saved && <Section sx={{ mt: 1.5 }} title="PDF design"><TextField select fullWidth size="small" value={e.format || 'premium'} onChange={ev => set('format', ev.target.value)}><MenuItem value="simple">1. Simple (no photos)</MenuItem><MenuItem value="premium">2. With product photos</MenuItem><MenuItem value="detailed">3. Photos + full specifications</MenuItem></TextField>
      <Typography variant="caption">PDF: in the print window choose "Save as PDF". WhatsApp opens with the message ready; attach the saved PDF yourself.</Typography></Section>}
    {e.log && e.log.length > 0 && <Section sx={{ mt: 1.5 }} title="History"><DataTable rows={e.log} cols={[{ h: 'When', k: r => dtm('', r.dt) }, { h: 'Who', k: r => r.who }, { h: 'What', k: r => <><b>{r.event}</b> {r.detail}</> }]} /></Section>}
  </Box>;
}

const Tile = ({ l, v, bg, color }) => <Paper sx={{ flex: '1 1 150px', p: 1.2, borderRadius: 3, bgcolor: bg }}><Typography variant="caption" color="text.secondary">{l}</Typography><Typography variant="h6" fontWeight={800} sx={{ color }}>{v}</Typography></Paper>;
function BulkCard({ c }) {
  const b = bk(), g = qBulkG(), L = qBulkParse(b.txt, g), base = L.reduce((s, x) => s + x.base, 0), landed = L.reduce((s, x) => s + x.cost, 0);
  const pf = +b.pf || 0, pm = +b.pm || 0, cq = +b.cq || 0, tc = landed || c.cost, profit = cq ? cq - tc : pm ? tc * pm / 100 : pf, quote = tc + profit;
  const up = k => ev => { b[k] = ev.target.value; reQ(); };
  const commit = () => { if (QE.lines.some(l => +l.cost > 0) && qProfitApply()) { reQ(); toast('Profit auto lagi gayo'); } };
  return <Section sx={{ mt: 1.5 }} title={<>BULK PRODUCT → PURCHASE COST → AUTO QUOTATION <small style={{ fontWeight: 400 }}>(internal, admin only)</small></>}>
    <Typography variant="caption" color="text.secondary">Vendor ni list paste karo, dar line ma product name ane chhelle price. Purchase GST kya lagavvo te niche select karo.</Typography>
    <TextField fullWidth multiline minRows={5} sx={{ my: 1 }} placeholder={'I5 10 GEN 2050\n16 GB RAM DDR4 8000\nMOTHERBOARD 4500+'} value={b.txt} onChange={up('txt')} />
    <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
      <TextField size="small" label="Purchase GST %" sx={{ flex: '1 1 140px' }} value={b.g} onChange={up('g')} />
      <TextField size="small" select label="GST kya par lagavo" sx={{ flex: '1 1 170px' }} value={b.gw === 'none' ? 'none' : 'all'} onChange={up('gw')}><MenuItem value="all">Badhi line par</MenuItem><MenuItem value="none">GST nahi (0%)</MenuItem></TextField>
      <Tile l="Base Purchase Total" v={inr(base)} /><Tile l="Purchase GST" v={inr(landed - base)} /><Tile l="Final Landed Cost" v={inr(landed)} /></Stack>
    <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ my: 1.5 }}>
      {[['pf', 'Add Profit ₹'], ['pm', 'OR Margin %'], ['cq', 'Customer Quotation ₹']].map(([k, l]) => <TextField key={k} size="small" label={l} sx={{ flex: '1 1 170px' }} inputProps={{ inputMode: 'decimal' }} value={b[k]} onChange={up(k)} onBlur={commit} />)}</Stack>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1 }}><Button variant="contained" onClick={() => qbulk('one')}>Single item (total set)</Button><Button variant="contained" onClick={() => qbulk('sep')}>Separate items</Button>
      <Button variant="outlined" onClick={() => { const ls = QE.lines.filter(l => +l.cost > 0); if (!ls.length) return toast('Cost is not set on any line', 'bad'); const n = qProfitApply(); if (!n) return toast('Enter profit ₹, margin % or Customer Quotation', 'bad'); reQ(); toast('Profit added to ' + n + ' lines'); }}>Apply profit to all lines</Button></Stack>
    <Typography variant="caption">Final Purchase: {inr(tc)} | Customer Quote: {inr(quote)} | Profit: {inr(profit)} | Margin: {quote > 0 ? r2(profit / quote * 100) : 0}%</Typography>
  </Section>;
}
function CostCard({ c }) {
  const ic = QE.ic = QE.ic || { n: '', b: '', g: 18, s: '' }, b = +ic.b || 0, g = +ic.g || 0, l = Math.round(b * (1 + g / 100) * 100) / 100, s = +ic.s || 0;
  const up = k => ev => { ic[k] = ev.target.value; reQ(); };
  return <Section sx={{ mt: 1.5 }} title={<>INTERNAL COSTING — C COMPUTER <small style={{ fontWeight: 400 }}>(cost, profit ane margin print / PDF ma nahi aave)</small></>}>
    <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
      <TextField size="small" label="Product" sx={{ flex: '2 1 200px' }} value={ic.n} onChange={up('n')} />
      <TextField size="small" label="Base Cost" sx={{ flex: '1 1 120px' }} inputProps={{ inputMode: 'decimal' }} value={ic.b} onChange={up('b')} />
      <TextField size="small" select label="Purchase GST" sx={{ flex: '1 1 110px' }} value={+ic.g} onChange={up('g')}>{[0, 5, 12, 18, 28].map(x => <MenuItem key={x} value={x}>{x}%</MenuItem>)}</TextField>
      <Tile l="Landed" v={inr(l)} />
      <TextField size="small" label="Selling Price" sx={{ flex: '1 1 120px' }} inputProps={{ inputMode: 'decimal' }} value={ic.s} onChange={up('s')} /></Stack>
    <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 1.5 }}>
      <Button variant="contained" onClick={() => { const n = String(ic.n).trim(); if (!n) return toast('Enter product name', 'bad'); if (!s) return toast('Enter selling price', 'bad'); QE.lines.push({ kind: 'Custom', part: '', productId: '', name: n, brand: '', model: '', spec: '', qty: 1, unitPrice: s, lineDisc: 0, gstRate: '', cost: l }); QE.ic = null; reQ(); toast('Added to quotation'); }}>Add to quotation</Button>
      <Typography variant="caption">Profit: {inr(s - l)} | Margin: {s > 0 ? r2((s - l) / s * 100) : 0}%</Typography></Stack>
    <Divider sx={{ my: 1.2 }} />
    <div className="qrow"><span>This quotation: Purchase cost</span><b>{inr(c.cost)}</b></div><div className="qrow"><span>Expected profit</span><b style={{ color: '#16a34a' }}>{inr(c.profit)}</b></div><div className="qrow"><span>Margin</span><b>{c.taxable > 0 ? r2(c.profit / c.taxable * 100) : 0}%</b></div>
  </Section>;
}
function StatusCard() {
  const e = QE, a = isAdmin(), lock = qLocked();
  const qst = s => work(async () => { const r = await api('quote.status', { id: e.id, status: s, followDate: e._fd, followNote: e._fn }, { rid: rid(), loader: true }); qApply(r); toast('Status: ' + r.status); });
  const convert = () => { const m = openDialog('Convert to sale?', () => <p>This creates a normal <b>Pending</b> sale with the same products and prices. <b>Stock is not reduced</b> until the sale is delivered. A quotation can be converted only once.</p>, { maxWidth: 'sm', actions: () => <Button variant="contained" color="success" onClick={() => work(async () => { const r = await api('quote.convert', { id: e.id }, { rid: rid(), loader: true }); m.close(); qApply(r); toast('Sale ' + r.orderId + ' created'); })}>Yes, convert</Button> }); };
  return <Section sx={{ mt: 1.5 }} title={<Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">Status: <QPill s={e.status} />{e.discStatus === 'Pending' ? <Chip size="small" color="warning" label="Discount needs admin approval" /> : e.discStatus === 'Approved' ? <Chip size="small" color="success" label="Discount approved" /> : null}</Stack>}>
    {a && e.discStatus === 'Pending' && <Button sx={{ mb: 1 }} variant="contained" color="success" onClick={() => work(async () => { const r = await api('quote.approve', { id: e.id }, { rid: rid(), loader: true }); qApply(r); toast('Discount approved'); })}>Approve discount</Button>}
    {lock ? <Typography>Converted to sale <b>{e.orderId}</b>. This quotation is locked.</Typography>
      : <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="outlined" onClick={() => qst('Sent')}>Mark Sent</Button><Button variant="outlined" onClick={() => qst('Follow-up Required')}>Follow-up</Button><Button variant="outlined" onClick={() => qst('Approved')}>Approved</Button><Button variant="outlined" onClick={() => qst('Rejected')}>Rejected</Button><Button variant="contained" color="success" onClick={convert}>Convert to Sale</Button></Stack>}
    <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
      <TextField size="small" type="date" label="Next follow-up date" InputLabelProps={{ shrink: true }} disabled={lock} value={e._fd || ''} onChange={ev => { e._fd = ev.target.value; reQ(); }} />
      <TextField size="small" label="Follow-up note" sx={{ flex: 1 }} disabled={lock} value={e._fn || ''} onChange={ev => { e._fn = ev.target.value; reQ(); }} /></Stack>
    <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1 }}>{!lock && <Button size="small" variant="outlined" onClick={() => work(async () => { const r = await api('quote.status', { id: e.id, followDate: e._fd, followNote: e._fn }, { rid: rid(), loader: true }); qApply(r); toast('Follow-up saved'); })}>Save follow-up</Button>}<Typography variant="caption">Assigned: {e.followBy || e.createdBy || ''}</Typography></Stack>
  </Section>;
}
