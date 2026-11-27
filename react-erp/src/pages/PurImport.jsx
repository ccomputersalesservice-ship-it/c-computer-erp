/* ===== Purchase Invoice Import (PDF -> review -> approve). Admin only. Same steps as the live ERP. ===== */
import React, { useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography, Alert, Chip, Autocomplete } from '@mui/material';
import { api, S, inr, LT, rid, toast, work, pickFile, debounce, loadThumbs, shrinkImage } from '../lib/core.js';
import { openDialog, promptBox, Skel, Note, openScanner } from '../lib/ui.jsx';
import { refresh } from '../lib/nav.js';
import { findDupBill, dupText } from '../lib/dupbill.js';
import { uploadPhoto } from './Products.jsx';
import { piParsePages, piPdfPages, piSha, piDataUrl, piVendorSave, setPiHint } from '../docs/pdfparse.js';

const badge = { n: 0, subs: new Set() };
export async function piBadge() { try { const r = await api('purimp.inbox', {}, { loader: false }); badge.n = r.mail.length + r.pending.length; badge.subs.forEach(f => f(badge.n)); } catch (e) { } }

export function PurImportButtons() {
  const [n, setN] = useState(badge.n);
  useEffect(() => { try { const v = (localStorage.getItem('ccPiOpen') || '').split('|'); localStorage.removeItem('ccPiOpen'); if (v[0] && Date.now() - +v[1] < 15000) piOpenPending(v[0]).catch(() => { }); } catch (e) { } }, []);
  useEffect(() => { badge.subs.add(setN); piBadge(); return () => badge.subs.delete(setN); }, []);
  return <>
    <Badge badgeContent={n} color="error"><Button variant="outlined" onClick={mailBills}>📧 Mail bills</Button></Badge>
    <Button variant="contained" color="success" onClick={openImport}>📄 Import bill (PDF / photo)</Button>
  </>;
}

/* ---------- choose a PDF ---------- */
export function openImport() {
  let file = null, setMsg = () => { };
  const Body = () => { const [m, sm] = useState(''); setMsg = sm; return <Stack gap={2}><Alert severity="info">Choose the vendor bill (PDF or photo). I will read it and show it to you. Nothing goes to stock until you press Approve.</Alert><input type="file" accept="application/pdf,image/*" onChange={e => { file = e.target.files[0]; }} /><Button size="small" variant="outlined" onClick={async () => { const c = await pickFile(true); if (c) { file = c; sm('📷 ' + (c.name || 'photo') + ' taiyar'); } }}>📷 Camera</Button>{m && <Chip label={m} />}</Stack>; };
  openDialog('Import bill (PDF / photo)', () => <Body />, {
    maxWidth: 'sm', actions: close => <><Button color="inherit" onClick={close}>Cancel</Button><Button variant="contained" onClick={() => work(async () => {
      const f = file; if (!f) throw new Error('Choose a PDF file first.');
      if (/^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name)) {
        setMsg('Photo vanchu chhu...');
        const url = await shrinkImage(f, 1600, 0.8), hash = await piSha(f), r = await api('pur.scan', { dataUrl: url });
        const lines = (r.lines || []).map(l => ({ desc: l.name, hsn: '', gst: '', qty: l.qty, rate: l.price, amount: Math.round(l.qty * l.price * 100) / 100, serialCand: [], _ser: (l.serials || []).join('\n'), productId: l.productId, pname: l.name, _tried: 1 }))
          .concat((r.pending || []).map(u => ({ desc: u.text, hsn: '', gst: '', qty: u.qty, rate: u.price, amount: Math.round(u.qty * u.price * 100) / 100, serialCand: [], _ser: (u.serials || []).join('\n'), productId: '' })));
        if (!lines.length) throw new Error('Photo mathi item vanchaya nahi. Saaf, sidhu photo lo athva PDF vapro.');
        const d = { vendor: r.vendor || '', gstin: '', invoiceNo: r.billNo || '', invoiceDate: r.date || '', terms: '', orderNo: '', subtotal: 0, sgst: 0, cgst: 0, igst: 0, grandTotal: 0, copies: 1, warnings: ['Photo bill chhe - badhi vigat (name, qty, price, bill no, date) barabar check karo.'], lines };
        close(); return piReview({ drafts: [d], i: 0, hash, url, name: f.name || 'bill.jpg' });
      }
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) throw new Error('Aa PDF ke photo nathi.');
      if (f.size > 5000000) throw new Error('PDF is too big (max 5 MB).');
      setMsg('Reading PDF...');
      const pages = await piPdfPages(f), drafts = piParsePages(pages).filter(d => d.lines.length || d.invoiceNo);
      if (!drafts.length) throw new Error('Could not read text from this PDF (scanned?). Use "New purchase" with the bill photo instead.');
      const hash = await piSha(f), url = await piDataUrl(f);
      close(); piReview({ drafts, i: 0, hash, url, name: f.name });
    })}>Read bill</Button></>
  });
}

/* ---------- review one invoice ---------- */
function piReview(PI) {
  const d = PI.drafts[PI.i];
  d.lines.forEach(l => { l._ser = l._ser !== undefined ? l._ser : (l.serial || ''); });
  const st = { recv: true, red: false, redraw: () => { }, save: null };
  const saveDraft = async quiet => {
    piVendorSave(d.gstin, d.vendor);
    const body = { id: PI.id, vendor: d.vendor, gstin: d.gstin, invoiceNo: d.invoiceNo, invoiceDate: d.invoiceDate, terms: d.terms, subtotal: d.subtotal, tax: d.sgst + d.cgst + d.igst, grandTotal: d.grandTotal, copies: d.copies, fileHash: PI.hash || undefined, warnings: d.warnings, lines: d.lines.map(l => ({ desc: l.desc, hsn: l.hsn, gst: l.gst, qty: l.qty, rate: l.rate, amount: l.amount, serial: l._ser, productId: l.productId })) };
    if (!PI.id) { if (PI.i > 0 && PI.firstId) body.sameFileAs = PI.firstId; else if (PI.mailId) body.mailId = PI.mailId; else { body.pdf = PI.url; body.fileName = PI.name; } }
    const r = await api('purimp.save', body, { rid: PI['rid0' + PI.i] || (PI['rid0' + PI.i] = rid()), loader: false }); PI.id = r.id; try { localStorage.setItem('ccPiOpen', PI.id + '|' + Date.now()); } catch (e) { } if (PI.i === 0) PI.firstId = r.id; if (!quiet) toast('Saved for later', 'ok'); return r.id;
  };
  st.save = saveDraft;
  openDialog('Check bill before saving' + (PI.drafts.length > 1 ? ` (${PI.i + 1}/${PI.drafts.length})` : ''), () => <Review d={d} st={st} />, {
    maxWidth: 'lg', actions: close => <>
      <Button color="error" variant="contained" onClick={() => work(async () => { const r = await promptBox('Reason for rejecting?', 'Reason'); if (!r) return; await saveDraft(true); await api('purimp.reject', { id: PI.id, reason: r }); toast('Rejected', 'ok'); try { localStorage.removeItem('ccPiOpen'); } catch (e) { } close(); if (S.route === 'purchase') refresh(); })}>Reject</Button>
      <Button onClick={() => work(async () => { await saveDraft(false); try { localStorage.removeItem('ccPiOpen'); } catch (e) { } close(); piBadge(); })}>Save for later</Button>
      <Button variant="contained" color="success" onClick={() => work(async () => {
        const need = d.lines.filter(l => !l.productId);
        if (need.length) { st.red = true; st.redraw(); throw new Error('Choose a product (Choose or + New) for the red lines (' + need.length + ' left).'); }
        const id = await saveDraft(true);
        const r = await api('purimp.approve', { id, receiveNow: st.recv, lines: d.lines.map(l => ({ productId: l.productId, qty: l.qty, rate: l.rate, serials: String(l._ser || '').split(/[\s,;]+/).filter(Boolean) })) }, { rid: PI.rid || (PI.rid = rid()) });
        toast('Saved as ' + r.purchaseId, 'ok'); try { localStorage.removeItem('ccPiOpen'); } catch (e) { } close(); piBadge();
        if (PI.i + 1 < PI.drafts.length) { PI.i++; PI.id = null; PI.rid = null; piReview(PI); } else if (S.route === 'purchase') refresh();
      })}>Approve &amp; add to stock</Button>
    </>
  });
}
function Review({ d, st }) {
  const [, setN] = useState(0); const re = () => setN(n => n + 1); st.redraw = re;
  useEffect(() => { let last = '', busy = false; const t = setInterval(async () => { if (busy || !st.save) return; const k = JSON.stringify([d.vendor, d.invoiceNo, d.invoiceDate, d.lines.map(l => [l.desc, l.qty, l.rate, l.productId, l._ser])]); if (k === last) { try { const v = localStorage.getItem('ccPiOpen'); if (v) localStorage.setItem('ccPiOpen', v.split('|')[0] + '|' + Date.now()); } catch (e) { } return; } busy = true; try { await st.save(true); last = k; } catch (e) { } busy = false; }, 5000); return () => clearInterval(t); }, []);
  useEffect(() => { d.lines.forEach((l, i) => { if (!l.productId && !l._tried) { l._tried = 1; piSuggest(d, i, re); } }); }, []);
  const [dup, setDup] = useState(null);
  useEffect(() => { let on = true; const t = setTimeout(async () => { const x = await findDupBill(d.vendor, d.invoiceNo); if (on) setDup(x); }, 400); return () => { on = false; clearTimeout(t); }; }, [d.invoiceNo, d.vendor]);
  const H = (k, v) => { d[k] = v; re(); };
  return <Stack gap={1.5}>
    {d.copies > 1 && <Alert severity="info">This invoice came {d.copies} times in the PDF (Original + Transporter copy). Counted only once.</Alert>}
    {dup && <Alert severity="error" sx={{ fontWeight: 700 }}>{dupText(dup)}</Alert>}
    {d.warnings.map((w, i) => <Alert key={i} severity="error">⚠ {w}</Alert>)}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth label="Vendor *" value={d.vendor} onChange={e => H('vendor', e.target.value)} /><TextField fullWidth label="Invoice No *" value={d.invoiceNo} onChange={e => H('invoiceNo', e.target.value)} /><TextField fullWidth type="date" label="Date *" InputLabelProps={{ shrink: true }} value={d.invoiceDate} onChange={e => H('invoiceDate', e.target.value)} /></Stack>
    <Chip sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: .5 } }} label={<>Vendor GSTIN: {d.gstin || '-'} · Terms: {d.terms || '-'} · Order: {d.orderNo || '-'} · Grand Total: {d.grandTotal ? inr(d.grandTotal) : '-'} <i>(Previous Balance is NOT counted)</i></>} />
    {d.lines.map((l, i) => <LineCard key={i} l={l} red={st.red && !l.productId} re={re} />)}
    <FormControlLabel control={<Checkbox defaultChecked onChange={e => { st.recv = e.target.checked; }} />} label="Goods are in my shop now (add to stock)" />
  </Stack>;
}
function LineCard({ l, red, re }) {
  const set = (k, v) => { l[k] = v; re(); };
  const phSave = async f => { if (!f) return; if (!l.productId) { l._pend = f; l._pendU = URL.createObjectURL(f); toast('Photo taiyar - product choose karo etle save thase', 'ok'); return re(); } try { toast('Photo save thay chhe...'); await uploadPhoto(l.productId, f); l._ph = 1; l._old = 0; l._upU = URL.createObjectURL(f); re(); } catch (e) { toast(e.message, 'bad'); } };
  const paste = async cb => { try { for (const it of await navigator.clipboard.read()) { const ty = it.types.find(x => /^image\//.test(x)); if (ty) return cb(new File([await it.getType(ty)], 'p.png', { type: ty })); } toast('Copy karelu photo nathi. Google ma photo par right-click → Copy image.', 'bad'); } catch (e) { toast('Paste mate "Allow" aapo', 'bad'); } };
  useEffect(() => { if (l.productId && l._pend && !l._ph) { const f = l._pend; l._pend = null; l._pendU = ''; (async () => { try { await uploadPhoto(l.productId, f); l._ph = 1; l._upU = URL.createObjectURL(f); } catch (e) { toast(e.message, 'bad'); } re(); })(); return; } if (!l.productId || l._chk === l.productId) return; l._chk = l.productId; loadThumbs([l.productId]).then(() => { if (S.thumbs[l.productId]) { if (!l._ph) { l._ph = 1; l._old = 1; } } re(); }, () => { }); }, [l.productId, l._pend]);
  const noPh = l.productId && !l._ph;
  const onPaste = ev => { const it = [...((ev.clipboardData || {}).items || [])].find(x => /^image\//.test(x.type)); if (it) { ev.preventDefault(); phSave(it.getAsFile()); } else if (ev.target && ev.target.dataset && ev.target.dataset.pz) toast('Clipboard ma photo nathi. Google ma photo par right-click → Copy image karo.', 'bad'); };
  return <Paper variant="outlined" onPaste={onPaste} sx={{ p: 1.5, border: red ? '2px solid #dc2626' : (noPh ? '2px solid #f59e0b' : undefined) }}>
    <b>{l.desc}</b><br /><Chip size="small" label={`HSN ${l.hsn || '-'} · GST ${l.gst ? l.gst + '%' : '-'}`} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 1 }}><TextField type="number" label="Qty" value={l.qty} onChange={e => set('qty', +e.target.value || 0)} /><TextField type="number" label="Price each (without GST)" inputProps={{ step: 0.01 }} value={l.rate} onChange={e => set('rate', +e.target.value || 0)} /></Stack>
    <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}><Typography sx={{ flex: 1 }}>Product in my stock *: {l.productId ? <>✓ <b>{l.pname || l.productId}</b></> : <i>not chosen</i>}</Typography>
      <Button size="small" variant="contained" onClick={() => piPick(l, re)}>{l.productId ? 'Change' : 'Choose'}</Button><Button size="small" variant="outlined" onClick={() => piNew(l, re)}>+ New</Button></Stack>
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ my: 1, p: noPh || !l.productId ? 1 : 0, borderRadius: 1, bgcolor: noPh || !l.productId ? '#fffbeb' : undefined }}><small style={{ flex: 1, fontWeight: noPh ? 700 : 400 }}>{l._ph ? (l._old ? '✅ Aa product ma photo chhe' : '✅ Photo umeryo') : l._pend ? '✅ Photo taiyar (product choose karo etle save)' : '📷 Photo nathi - photo umero:'}{(l._pendU || l._upU || (l.productId && S.thumbs[l.productId])) && <img src={l._pendU || l._upU || S.thumbs[l.productId]} alt="" onClick={ev => window.open(ev.currentTarget.src, '_blank')} style={{ height: 72, width: 72, objectFit: 'contain', marginLeft: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', verticalAlign: 'middle', cursor: 'zoom-in' }} />}</small>
      <Button size="small" onClick={async () => phSave(await pickFile(true))}>📷 Camera</Button><Button size="small" onClick={async () => phSave(await pickFile(false))}>🖼 Gallery</Button>
      <Button size="small" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(l.desc)}`} target="ccgimg" rel="noopener">🔍 Google</Button><Button size="small" onClick={() => paste(phSave)}>📋 Paste</Button>
      <Box data-pz="1" tabIndex={0} contentEditable suppressContentEditableWarning onInput={e => { e.currentTarget.innerText = ''; }} sx={{ flexBasis: '100%', border: '2px dashed #f59e0b', borderRadius: 1, p: 1, textAlign: 'center', fontSize: 13, color: '#92400e', cursor: 'text', outline: 'none', '&:focus': { bgcolor: '#fef3c7', borderColor: '#d97706' } }}>📋 Ahi click karo, pachi Ctrl+V (mobile: lamba dabavi Paste) dabavo - photo aapo-aap aavi jase</Box></Stack>
    <Button size="small" sx={{ mt: 1 }} onClick={() => openScanner(c => { const cur = String(l._ser || '').trim(); set('_ser', (cur ? cur + '\n' : '') + c); toast('Serial umeryo: ' + c, 'ok'); }, 'Scan serial / barcode')}>📷 Serial scan karo</Button>
    <TextField fullWidth multiline minRows={2} sx={{ mt: 1 }} label={<>Serial numbers (one per line){l.serialCand && l.serialCand.length ? <span style={{ color: '#b45309' }}> ⚠ read from bill - please confirm</span> : null}</>} value={l._ser} onChange={e => set('_ser', e.target.value)} />
  </Paper>;
}
async function piSuggest(d, i, re) {   // suggestion only - owner must confirm
  const l = d.lines[i], tok = l.desc.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !/^(nos|pcs|ssd|hdd)$/i.test(t));
  for (const q of [tok.slice(0, 4).join(' '), tok.slice(1, 4).join(' '), tok.slice(0, 2).join(' ')]) {
    if (!q) continue; try { const r = await api('prod.quick', { q }, { loader: false }); if (r.length === 1) { l.productId = r[0].ProductID; l.pname = r[0].Name + ' (suggested - confirm)'; re(); return; } } catch (e) { }
  }
}
function PickBody({ l, onPick }) {
  const [q, setQ] = useState(l.desc.split(' ').slice(0, 3).join(' ')), [r, setR] = useState(null);
  const run = useRef(debounce(async v => { try { let x = await api('prod.quick', { q: v }, { loader: false }); const w = String(v || '').trim().split(/\s+/)[0]; if (!x.length && w && w !== String(v || '').trim()) x = await api('prod.quick', { q: w }, { loader: false }); setR(x); } catch (e) { setR([]); } }, 250)).current;
  useEffect(() => { run(q); }, []);
  return <Stack gap={1}><TextField autoFocus placeholder="Search product" value={q} onChange={e => { setQ(e.target.value); run(e.target.value); }} />
    {r === null ? <Skel /> : r.length ? r.map(p => <Paper key={p.ProductID} variant="outlined" sx={{ p: 1.2, cursor: 'pointer' }} onClick={() => onPick(p)}><b>{p.Name}</b>{p.Model && <b style={{ color: '#4b5563' }}> · {p.Model}</b>}<br /><Chip size="small" label={`${p.Brand || ''} ${p.Category} · ${p.TrackingType}`} /></Paper>) : <i>Product nathi malyu. Search ma ek j shabd lakho (jem ke Speaker) athva "+ New" vapro.</i>}</Stack>;
}
function piPick(l, re) {
  const dl = openDialog('Choose product', () => <PickBody l={l} onPick={p => { l.productId = p.ProductID; l.pname = p.Name + (p.Model ? ' · ' + p.Model : ''); dl.close(); re(); }} />, { maxWidth: 'sm' });
}
const BR = ['HP', 'Dell', 'Lenovo', 'Acer', 'ASUS', 'Apple', 'MSI', 'LG', 'Samsung', 'Zebronics', 'Logitech', 'Intel', 'AMD', 'Gigabyte', 'Crucial', 'Kingston', 'WD', 'Seagate', 'Consistent', 'EVM', 'TP-Link', 'D-Link', 'Epson', 'Canon', 'Brother', 'Frontech', 'Ant Esports', 'Cosmic Byte', 'iBall', 'Portronics', 'Lapcare', 'Hikvision', 'CP Plus', 'Quantum'];
function NewBody({ v }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  const setPh = f => { if (!f) return; v.phf = f; v.phu = URL.createObjectURL(f); setN(n => n + 1); };
  return <Stack gap={2} sx={{ pt: 1 }} onPaste={ev => { const it = [...((ev.clipboardData || {}).items || [])].find(x => /^image\//.test(x.type)); if (it) { ev.preventDefault(); setPh(it.getAsFile()); } }}>
    <TextField label="Name *" value={v.n} onChange={e => set('n', e.target.value)} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><Autocomplete freeSolo fullWidth options={BR} value={v.b} onInputChange={(e, x) => set('b', x)} renderInput={p => <TextField {...p} label="Brand" />} /><TextField fullWidth label="Model (alag model alag product)" placeholder="e.g. TRANSFORMER, K20" value={v.m} onChange={e => set('m', e.target.value)} /></Stack>
    <Box><Typography variant="subtitle2">Photo (saathe j umero)</Typography><Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
      <Button size="small" variant="outlined" onClick={async () => setPh(await pickFile(true))}>📷 Camera</Button><Button size="small" variant="outlined" onClick={async () => setPh(await pickFile(false))}>🖼 Gallery</Button>
      <Button size="small" variant="outlined" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(v.desc)}`} target="ccgimg" rel="noopener">🔍 Google</Button>
      <Button size="small" variant="outlined" onClick={async () => { try { for (const it of await navigator.clipboard.read()) { const ty = it.types.find(x => /^image\//.test(x)); if (ty) return setPh(new File([await it.getType(ty)], 'p.png', { type: ty })); } toast('Copy karelu photo nathi.', 'bad'); } catch (e) { toast('Paste mate "Allow" aapo', 'bad'); } }}>📋 Paste</Button>
      {v.phu && <><img src={v.phu} alt="" style={{ height: 48, borderRadius: 8, border: '1px solid #e5e7eb' }} /> ✅</>}</Stack></Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField select fullWidth label="Category" value={v.c} onChange={e => set('c', e.target.value)}>{S.boot.categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
      <TextField select fullWidth label="Tracking" value={v.t} onChange={e => set('t', e.target.value)}><MenuItem value="SERIAL">Serial number</MenuItem><MenuItem value="ITEMID">Item ID (serial optional)</MenuItem><MenuItem value="QTY">Quantity only</MenuItem></TextField></Stack>
  </Stack>;
}
function piNew(l, re) {
  const dtok = l.desc.split(/\s+/), gb = BR.find(b => dtok.some(t => t.toLowerCase() === b.toLowerCase())) || '', gm = (dtok.filter(t => /\d/.test(t) && /[A-Za-z]/.test(t) && !/^\d+(GB|TB|MB|W|MM|M|MTR)$/i.test(t)).join(' ') || '');
  const v = { n: l.desc.slice(0, 120), b: gb, m: gm, c: S.boot.categories[0], t: 'SERIAL', desc: l.desc, phf: l._pend || null, phu: l._pendU || '' };
  openDialog('New product from bill', () => <NewBody v={v} />, {
    maxWidth: 'sm', actions: close => <><Button color="inherit" onClick={close}>Cancel</Button><Button variant="contained" onClick={() => work(async () => {
      const r = await api('prod.save', { name: v.n, brand: v.b, model: v.m, category: v.c, trackingType: v.t, reorderLevel: 0, sellPrice: 0, costPrice: l.rate });
      if (v.phf === l._pend) { l._pend = null; l._pendU = ''; }
      l.productId = r.id; l.pname = v.n + (v.m ? ' · ' + v.m : '');
      if (v.phf) { try { await uploadPhoto(r.id, v.phf); l._ph = 1; } catch (er) { toast('Product banyo, pan photo na chadyo: ' + er.message, 'bad'); } }
      close(); re();
    })}>Create</Button></>
  });
}

/* ---------- bills from Gmail + saved-for-later ---------- */
function MailBody({ close }) {
  const [r, setR] = useState(null), [err, setErr] = useState('');
  const draw = () => api('purimp.inbox', {}, { loader: false }).then(setR, e => setErr(e.message));
  useEffect(() => { draw(); }, []);
  MailBody.reload = draw;
  if (err) return <Alert severity="error">{err}</Alert>;
  if (!r) return <Skel />;
  return <Stack gap={1}>
    <Alert severity="info">Mail is checked by itself every 1 hour. Only PDF bills are taken. No mail is changed or deleted.</Alert>
    {r.pending.length > 0 && <><Typography variant="h6" fontWeight={800}>Saved for later</Typography>{r.pending.map(x => <Paper key={x.id} variant="outlined" sx={{ p: 1.5 }}><b>{x.vendor}</b> · {x.invoiceNo}<br /><Chip size="small" label={`${x.date || '-'} · ${x.total ? inr(x.total) : ''}`} /><Box sx={{ textAlign: 'right' }}><Button size="small" variant="contained" onClick={() => work(async () => { await piOpenPending(x.id); close(); })}>Open</Button></Box></Paper>)}</>}
    <Typography variant="h6" fontWeight={800}>New bills in mail</Typography>
    {r.mail.length ? r.mail.map(x => <Paper key={x.id} variant="outlined" sx={{ p: 1.5 }}><b>{x.subject || '(no subject)'}</b><br /><Chip size="small" label={`${x.from} · ${x.date}`} /><br /><small>📄 {x.file}</small>
      <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ mt: 1 }}><Button size="small" onClick={() => work(async () => { await api('purimp.mailignore', { id: x.id }); draw(); piBadge(); })}>Not a bill</Button>
        <Button size="small" variant="contained" color="success" onClick={() => work(async () => { setPiHint({ from: x.from }); try { await piFromServer({ mailId: x.id }); } finally { setPiHint({}); } close(); })}>Open bill</Button></Stack></Paper>) : <i>No new bill in mail.</i>}
  </Stack>;
}
export function mailBills() {
  openDialog('Bills from mail', close => <MailBody close={close} />, {
    maxWidth: 'md', actions: close => <><Button onClick={close}>Close</Button><Button variant="contained" onClick={() => work(async () => { const r = await api('purimp.mailcheck', {}); toast(r.added ? r.added + ' new bill(s) found' : 'No new bill', 'ok'); if (MailBody.reload) await MailBody.reload(); piBadge(); })}>🔄 Check mail now</Button></>
  });
}
async function piFromServer(q) {
  const url = await api('purimp.pdf', q, { loader: true }), blob = await (await fetch(url)).blob();
  const pages = await piPdfPages(blob), drafts = piParsePages(pages).filter(d => d.lines.length || d.invoiceNo);
  if (!drafts.length) throw new Error('Could not read text from this PDF (maybe a scanned photo). Use "New purchase" for this bill.');
  piReview({ drafts, i: 0, hash: await piSha(blob), mailId: q.mailId, name: 'mail.pdf' });
}
export async function piOpenPending(id) {
  const x = await api('purimp.get', { id }, { loader: true });
  const d = { vendor: x.vendor, gstin: x.gstin, invoiceNo: x.invoiceNo, invoiceDate: x.date, terms: x.terms, orderNo: '', subtotal: x.subtotal, sgst: x.tax, cgst: 0, igst: 0, grandTotal: x.grandTotal, copies: x.copies || 1, warnings: x.note ? [x.note] : [],
    lines: x.lines.map(l => ({ desc: l.desc, hsn: l.hsn, gst: l.gst, qty: l.qty, rate: l.rate, amount: l.amount, _ser: l.serial, serialCand: [], productId: l.productId, pname: l.productId, _tried: !!l.productId })) };
  piReview({ drafts: [d], i: 0, id, firstId: id, hash: '' });
}
