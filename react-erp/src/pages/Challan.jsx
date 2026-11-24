/* ===== AI Bill Scanner (Challan Book) - read photo, review, owner confirms, then save. Same logic as JS_Challan.html ===== */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography, Chip, Alert, Card, CardContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { api, inr, rid, toast, work, shrinkImage, pickFile, debounce } from '../lib/core.js';
import { PageHead, Skel, DataTable, openDialog } from '../lib/ui.jsx';

const CH_MODES = ['Cash', 'HDFC', 'IDBI', 'Wallet'];
const blank = () => ({ desc: '', serial: '', qty: 1, rate: 0, disc: 0, gst: 0, amount: 0, productId: '', pname: '', itemId: '', tracking: '' });
const big = u => openDialog('Bill photo', () => <img src={u} alt="" style={{ width: '100%' }} />, { maxWidth: 'md' });

export default function Challan() {
  const [imgs, setImgs] = useState([]), [list, setList] = useState(null), [key, setKey] = useState(null), [reading, setReading] = useState(false), [k, setK] = useState('');
  const loadList = () => api('chal.list', {}, { loader: false }).then(setList, e => setList({ err: e.message }));
  const keyStatus = () => api('ai.key.status', {}, { loader: false }).then(r => setKey(!!r.set), () => setKey(true));
  useEffect(() => { loadList(); keyStatus(); }, []);
  const add = async files => { const l = imgs.slice(); for (const f of files) { if (l.length >= 4) { toast('Vadhu ma vadhu 4 photo', 'bad'); break; } try { l.push(await shrinkImage(f, 1600, 0.8)); } catch (e) { toast(e.message, 'bad'); } } setImgs(l); };
  const read = () => work(async () => {
    setReading(true);
    let r; try { r = await api('chal.scan', { images: imgs }, { loader: false }); } finally { setReading(false); }
    const f = r.fields || {}, un = new Set((f.unclear || []).map(String));
    const m0 = { cash: 'Cash', upi: '', card: '', bank: '', credit: '' }[String(f.paymentMode || '').toLowerCase()];
    const d = {
      billNo: f.billNo || '', billDate: /^\d{4}-\d{2}-\d{2}$/.test(f.billDate || '') ? f.billDate : '', name: (f.customer || {}).name || (r.customer || {}).name || '', mobile: (f.customer || {}).mobile || '', address: (f.customer || {}).address || (r.customer || {}).address || '',
      lines: (f.lines || []).map(l => ({ desc: [l.desc, l.brand, l.model].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(), serial: l.serial || '', qty: +l.qty || 1, rate: +l.rate || 0, disc: +l.discount || 0, gst: +l.gstPct || 0, amount: +l.amount || ((+l.qty || 1) * (+l.rate || 0) - (+l.discount || 0)), productId: '', pname: '', itemId: '', tracking: '' })),
      cgst: +f.cgst || 0, sgst: +f.sgst || 0, igst: +f.igst || 0, total: +f.grandTotal || 0, paid: +f.paid || 0, mode: m0 === undefined ? '' : m0, modeRaw: f.paymentMode || '', notes: f.notes || '', un, dup: r.duplicate, cust: r.customer, text: r.text, engine: r.engine
    };
    if (!d.lines.length) d.lines.push(blank());
    review(d, imgs, () => { setImgs([]); loadList(); });
  });
  return <Box>
    <PageHead title="AI Bill Scanner" />
    {key === false && <Card sx={{ mb: 2, border: '2px solid #f59e0b' }}><CardContent><Typography variant="h6" fontWeight={800}>🔑 Gemini key ek vaar mukvani chhe</Typography><Typography variant="caption">Google AI Studio ma copy kareli key ahi paste karo. Te server ma chhupi rahese, koi ne nahi dekhay.</Typography>
      <Stack direction="row" gap={1} sx={{ mt: 1 }}><TextField fullWidth type="password" autoComplete="off" placeholder="Key paste karo (Ctrl+V)" value={k} onChange={e => setK(e.target.value)} /><Button variant="contained" onClick={() => work(async () => { await api('ai.key.save', { key: k.trim() }); setK(''); toast('Key save thai ✓', 'ok'); keyStatus(); })}>Save</Button></Stack></CardContent></Card>}
    <Card><CardContent>
      <Typography variant="h6" fontWeight={800}>1. Challan no photo</Typography><Typography variant="caption">Akho bill dekhay, sidho ane saru ajvalu hoy evo photo pado. 1 bill na vadhu ma vadhu 4 photo.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 1.2, my: 1.5 }}>
        {imgs.length ? imgs.map((u, i) => <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb', aspectRatio: '3/4', bgcolor: '#f8fafc' }}>
          <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => big(u)} />
          <IconButton size="small" onClick={() => setImgs(imgs.filter((x, j) => j !== i))} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: '#dc2626', color: '#fff', '&:hover': { bgcolor: '#b91c1c' } }}><CloseIcon fontSize="small" /></IconButton>
          <Button size="small" onClick={async () => { const f = await pickFile(true); if (f) { const u2 = await shrinkImage(f, 1600, 0.8); setImgs(imgs.map((x, j) => j === i ? u2 : x)); } }} sx={{ position: 'absolute', bottom: 4, left: 4, right: 4, bgcolor: 'rgba(15,23,42,.75)', color: '#fff' }}>🔄 Badlo</Button>
        </Box>) : <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1/-1' }}>Haju koi photo nathi.</Typography>}
      </Box>
      <Stack direction="row" gap={1}><Button size="large" variant="contained" onClick={async () => { const f = await pickFile(true); if (f) add([f]); }}>📷 Photo pado</Button><Button size="large" variant="outlined" onClick={async () => { const fs = await pickFile(false, 'image/*', true); if (fs && fs.length) add(fs); }}>🖼 Upload</Button></Stack>
      <Button fullWidth size="large" variant="contained" color="success" sx={{ mt: 1.5, py: 1.6 }} disabled={!imgs.length || reading} onClick={read}>{reading ? '🤖 AI vanche chhe... (10-30 second)' : '🤖 2. AI thi bill vancho'}</Button>
    </CardContent></Card>
    <Card sx={{ mt: 2 }}><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Chhella save thayela bill</Typography>
      {!list ? <Skel /> : list.err ? <small>{list.err}</small> : <DataTable rows={list} empty="Haju koi bill nathi" onRow={x => work(async () => { const us = await api('chal.photo', { id: x.id }, { loader: true }); openDialog('Bill photo', () => <>{us.map((u, i) => <img key={i} src={u} alt="" style={{ width: '100%', marginBottom: 8 }} />)}</>, { maxWidth: 'md' }); })}
        cols={[{ h: 'Bill', k: x => <><b>{x.billNo}</b><br /><small>{x.date}</small></> }, { h: 'Customer', k: x => <>{x.name}<br /><small>{x.mobile}</small></> }, { h: 'Total', k: x => inr(x.total), align: 'right' }, { h: 'Baki', k: x => x.pending ? <b style={{ color: '#dc2626' }}>{inr(x.pending)}</b> : '✓', align: 'right' }]} />}
    </CardContent></Card>
  </Box>;
}

/* ---------- 3. review ---------- */
function review(d, imgs, done) {
  const _rid = rid(), st = { re: () => { } };
  openDialog('3. Bill check karo', () => <Review d={d} imgs={imgs} st={st} />, {
    maxWidth: 'lg', actions: close => <><Button color="inherit" onClick={close}>Cancel</Button><Button onClick={() => { const e = document.getElementById('cbNo'); if (e) e.focus(); }}>✏ Edit</Button>
      <Button variant="contained" color="success" onClick={() => work(async () => {
        const bad = d.lines.find(l => l.tracking && l.tracking !== 'QTY' && l.productId && !l.itemId);
        if (bad) throw new Error('"' + (bad.pname || bad.desc) + '" mate serial pasand karo.');
        const r = await api('chal.save', { billNo: d.billNo, billDate: d.billDate, customer: { name: d.name, mobile: d.mobile, address: d.address }, lines: d.lines.map(({ free, ...l }) => l), cgst: d.cgst, sgst: d.sgst, igst: d.igst, grandTotal: d.total, paid: d.paid, payMode: d.mode, notes: d.notes, images: imgs }, { rid: _rid });
        close(); done();
        openDialog('✅ Google Sheet ma save thayu', () => <Alert severity="info" sx={{ fontSize: 15 }}>Bill <b>{d.billNo}</b> save thayu.<br />{r.orderId && <>Sales order: {r.orderId} (stock ochhu thayu)<br /></>}{d.paid ? <>Cash book ma: {inr(d.paid)}<br /></> : null}{r.pending ? <>Udhar ma: <b>{inr(r.pending)}</b></> : 'Koi udhar nathi'}</Alert>, { maxWidth: 'sm' });
      })}>✅ Confirm & Save</Button></>
  });
}
function Review({ d, imgs, st }) {
  const [, setN] = useState(0); const re = () => setN(n => n + 1); st.re = re;
  useEffect(() => { d.lines.forEach((l, i) => chSuggest(d, i, re)); }, []);
  const un = k => d.un.has(k);
  const ys = k => un(k) ? { '& .MuiOutlinedInput-root': { bgcolor: '#fffbeb', '& fieldset': { borderColor: '#f59e0b', borderWidth: 2 } } } : undefined;
  const L = (lab, k) => <>{lab}{k && un(k) && <span style={{ color: '#b45309' }}> ⚠ check karo</span>}</>;
  const H = (k, v) => { d[k] = v; re(); };
  const items = d.lines.reduce((a, l) => a + (+l.amount || 0), 0), tax = (+d.cgst || 0) + (+d.sgst || 0) + (+d.igst || 0), tot = +d.total || 0, calc = items + tax, ok = !tot || Math.abs(calc - tot) <= 1 || Math.abs(items - tot) <= 1;
  const mobChange = async () => { try { const r = await api('cust.search', { q: String(d.mobile).replace(/\D/g, '') }, { loader: false }); const c = (r || [])[0]; d.custMsg = c ? '✓ Juno customer: ' + c.name : 'Navo customer banse'; if (c && !d.name) d.name = c.name; re(); } catch (e) { } };
  return <Stack gap={1.5}>
    <Stack direction="row" gap={1} sx={{ overflowX: 'auto' }}>{imgs.map((u, i) => <img key={i} src={u} alt="" onClick={() => big(u)} style={{ height: 120, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'zoom-in' }} />)}</Stack>
    {d.dup && <Alert severity="error">⚠ Aa bill number pehla save thayelo chhe: {d.dup}. Farithi save nahi thay.</Alert>}
    {d.engine === 'ocr' && <Alert severity="info">AI key nathi, etle sado OCR vaparyo. Niche vanchelu lakhan chhe – vigat hathe bharo.<pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto', fontSize: 12 }}>{d.text || ''}</pre></Alert>}
    {d.un.size > 0 && <Alert severity="warning">⚠ Pila box ma lakhelu AI ne chokhkhu nathi vanchayu – photo sathe melvi ne sudharo.</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField id="cbNo" fullWidth label={L('Bill No *', 'billNo')} value={d.billNo} onChange={e => H('billNo', e.target.value)} sx={ys('billNo')} /><TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label={L('Tarikh *', 'billDate')} value={d.billDate} onChange={e => H('billDate', e.target.value)} sx={ys('billDate')} /></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label={L('Customer *', 'customer.name')} value={d.name} onChange={e => H('name', e.target.value)} sx={ys('customer.name')} /><TextField fullWidth label={L('Mobile *', 'customer.mobile')} inputProps={{ inputMode: 'numeric' }} value={d.mobile} onChange={e => H('mobile', e.target.value)} onBlur={mobChange} sx={ys('customer.mobile')} /></Stack>
    <TextField label={L('Address', 'customer.address')} value={d.address} onChange={e => H('address', e.target.value)} sx={ys('customer.address')} />
    {(d.custMsg || d.cust) && <Chip sx={{ alignSelf: 'flex-start' }} label={d.custMsg || '✓ Juno customer: ' + d.cust.name} />}
    <Typography variant="h6" fontWeight={800}>Items</Typography>
    {d.lines.map((l, i) => <Line key={i} d={d} l={l} i={i} re={re} un={un} ys={ys} L={L} />)}
    <Box><Button size="small" variant="outlined" onClick={() => { d.lines.push(blank()); re(); }}>+ Line umero</Button></Box>
    <Paper variant="outlined" sx={{ p: 2 }}><Stack gap={1.5}>
      <Stack direction="row" gap={1.5}><TextField fullWidth type="number" label="CGST ₹" value={d.cgst || ''} onChange={e => H('cgst', +e.target.value || 0)} /><TextField fullWidth type="number" label="SGST ₹" value={d.sgst || ''} onChange={e => H('sgst', +e.target.value || 0)} /><TextField fullWidth type="number" label="IGST ₹" value={d.igst || ''} onChange={e => H('igst', +e.target.value || 0)} /></Stack>
      <Stack direction="row" gap={1.5}><TextField fullWidth type="number" label={L('Grand Total ₹ *', 'grandTotal')} value={d.total || ''} onChange={e => H('total', +e.target.value || 0)} sx={ys('grandTotal')} /><TextField fullWidth type="number" label={L('Payment malyu ₹', 'paid')} value={d.paid || ''} onChange={e => H('paid', +e.target.value || 0)} sx={ys('paid')} /></Stack>
      <Stack direction="row" gap={1.5}><TextField select fullWidth label={<>Kya aavya{d.modeRaw && !d.mode ? <span style={{ color: '#b45309' }}> (bill ma: {d.modeRaw})</span> : null}</>} value={d.mode} onChange={e => H('mode', e.target.value)}><MenuItem value="">--</MenuItem>{CH_MODES.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField><TextField fullWidth disabled label="Baki (udhar)" value={inr(Math.max(0, tot - (+d.paid || 0)))} /></Stack>
      <Typography fontWeight={700}>Items no total: {inr(items)}{tax ? ' + GST ' + inr(tax) + ' = ' + inr(calc) : ''} {tot ? (ok ? <span style={{ color: '#16a34a' }}>✓ Grand Total sathe male chhe</span> : <span style={{ color: '#dc2626' }}>⚠ Grand Total sathe nathi maltu – check karo</span>) : null}</Typography>
      <TextField label="Note" value={d.notes} onChange={e => H('notes', e.target.value)} />
    </Stack></Paper>
  </Stack>;
}
function Line({ d, l, i, re, un, ys, L }) {
  const set = (k, v) => { l[k] = v; if (['qty', 'rate', 'disc'].includes(k)) l.amount = Math.max(0, (+l.qty || 0) * (+l.rate || 0) - (+l.disc || 0)); re(); };
  const p = 'lines.' + i + '.';
  return <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack direction="row" gap={1}><TextField fullWidth placeholder="Item" value={l.desc} onChange={e => set('desc', e.target.value)} sx={ys(p + 'desc')} /><IconButton color="error" onClick={() => { d.lines.splice(i, 1); re(); }}><CloseIcon /></IconButton></Stack>
    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(5,1fr)' }, mt: 1 }}>
      <TextField type="number" label={L('Qty', p + 'qty')} value={l.qty} onChange={e => set('qty', +e.target.value || 0)} sx={ys(p + 'qty')} />
      <TextField type="number" label={L('Rate', p + 'rate')} value={l.rate} onChange={e => set('rate', +e.target.value || 0)} sx={ys(p + 'rate')} />
      <TextField type="number" label="Disc" value={l.disc || ''} onChange={e => set('disc', +e.target.value || 0)} />
      <TextField type="number" label="GST%" value={l.gst || ''} onChange={e => set('gst', +e.target.value || 0)} />
      <TextField type="number" label={L('Amount', p + 'amount')} value={l.amount} onChange={e => set('amount', +e.target.value || 0)} sx={ys(p + 'amount')} />
    </Box>
    {l.serial && <Typography variant="caption" display="block" sx={{ mt: .5 }}>Bill ma serial: <b>{l.serial}</b>{un(p + 'serial') && <span style={{ color: '#b45309' }}> ⚠ check karo</span>}</Typography>}
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}><Box sx={{ flex: 1, minWidth: 150 }}>{l.productId ? <>📦 <b>{l.pname}</b> <small>(stock mathi ochhu thase)</small></> : <small>Stock sathe jodelu nathi (service / bahar no maal)</small>}</Box>
      <Button size="small" variant="outlined" onClick={() => chPick(d, i, re)}>{l.productId ? 'Badlo' : '📦 Stock product'}</Button>{l.productId && <Button size="small" onClick={() => { Object.assign(l, { productId: '', pname: '', itemId: '', tracking: '' }); re(); }}>Hatavo</Button>}</Stack>
    {l.productId && l.tracking !== 'QTY' && <TextField select fullWidth sx={{ mt: 1 }} label="Kayo serial vechyo *" value={l.itemId} onChange={e => set('itemId', e.target.value)}><MenuItem value="">-- pasand karo --</MenuItem>{(l.free || []).map(x => <MenuItem key={x.itemId} value={x.itemId}>{x.serial || x.itemId}</MenuItem>)}</TextField>}
  </Paper>;
}
async function chSetProd(l, p) {
  Object.assign(l, { productId: p.ProductID, pname: p.Name, tracking: p.TrackingType, itemId: '', free: [] });
  if (p.TrackingType !== 'QTY') { try { l.free = await api('serial.free', { productId: p.ProductID }, { loader: false }); const s = String(l.serial || '').toUpperCase(); const hit = l.free.find(x => s && String(x.serial).toUpperCase() === s); if (hit) l.itemId = hit.itemId; } catch (e) { l.free = []; } }
}
async function chSuggest(d, i, re) {   // suggestion only - owner can change or remove it
  const l = d.lines[i]; if (!l || !l.desc) return;
  const tok = l.desc.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 1);
  for (const q of [tok.slice(0, 4).join(' '), tok.slice(0, 2).join(' ')]) {
    if (!q) continue; try { const r = await api('prod.quick', { q }, { loader: false }); if (r.length === 1) { await chSetProd(l, r[0]); re(); return; } } catch (e) { }
  }
}
function PickBody({ l, onPick }) {
  const [q, setQ] = useState(l.desc.split(' ').slice(0, 3).join(' ')), [r, setR] = useState(null);
  const run = useRef(debounce(async v => { try { setR(await api('prod.quick', { q: v }, { loader: false })); } catch (e) { setR([]); } }, 250)).current;
  useEffect(() => { run(q); }, []);
  return <Stack gap={1}><TextField autoFocus placeholder="Product shodho" value={q} onChange={e => { setQ(e.target.value); run(e.target.value); }} />
    {r === null ? <Skel /> : r.length ? r.map(p => <Paper key={p.ProductID} variant="outlined" sx={{ p: 1.2, cursor: 'pointer' }} onClick={() => onPick(p)}><b>{p.Name}</b><br /><Chip size="small" label={`${p.Category} · ${p.TrackingType}`} /></Paper>) : <i>Koi product nathi</i>}</Stack>;
}
function chPick(d, i, re) {
  const l = d.lines[i];
  const dl = openDialog('Stock product pasand karo', () => <PickBody l={l} onPick={async p => { await chSetProd(l, p); dl.close(); re(); }} />, { maxWidth: 'sm' });
}
