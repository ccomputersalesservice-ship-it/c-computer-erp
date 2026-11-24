/* Replacement register (warranty replacement of customer SSD / products) - same logic as JS_Replace.html */
import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete, Box, Button, MenuItem, Paper, Stack, TextField, Typography, Chip, IconButton, Card, CardContent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { api, rid, toast, work, shrinkImage, pickFile, debounce, todayStr } from '../lib/core.js';
import { PageHead, Skel, openDialog, Loading } from '../lib/ui.jsx';
import { rpTime, rpHtml, REP_GU } from '../docs/replace.js';
import { docPdfWa } from '../docs/invoice.jsx';

const REP_ST = ['Received', 'Sent to Company', 'Replacement Received', 'Given to Customer', 'Rejected'];
const REP_SH = { 'Received': '🏪 Shop ma', 'Sent to Company': '🏭 Service center ma', 'Replacement Received': '📦 Navu aavyu', 'Given to Customer': '✅ Aapi didhu', 'Rejected': '❌ Reject' };
const REP_CLR = { 'Received': '#f59e0b', 'Sent to Company': '#3b82f6', 'Replacement Received': '#8b5cf6', 'Given to Customer': '#16a34a', 'Rejected': '#dc2626' };
const SIZES = ['120 GB', '128 GB', '240 GB', '256 GB', '480 GB', '512 GB', '1 TB', '2 TB'];
const PRODS = ['SSD', 'HDD', 'RAM', 'Pendrive', 'Memory Card', 'Keyboard', 'Mouse', 'Monitor'];
const RP = { list: [], f: '' };
const companies = () => [...new Set((RP.list || []).map(y => y.company).filter(Boolean))];

export default function Replace() {
  const empty = () => ({ mobile: '', name: '', date: todayStr(), product: 'SSD', size: '', brand: '', billNo: '', company: '', oldSerial: '', note: '' });
  const [v, setV] = useState(empty()), [imgs, setImgs] = useState([]), [list, setList] = useState(null), [q, setQ] = useState(''), [f, setF] = useState(RP.f);
  const load = qq => api('rpl.list', { q: qq || '' }, { loader: false }).then(r => { RP.list = r; setList(r); }, e => setList({ err: e.message }));
  useEffect(() => { load(''); }, []);
  const qd = useRef(debounce(load, 300)).current;
  const S_ = (k, x) => setV(o => ({ ...o, [k]: x }));
  const mob = useRef(debounce(async mo => {
    if (mo.length < 10) return;
    try { const r = await api('cust.search', { q: mo }, { loader: false }); const c = (r || []).find(x => String(x.mobile || x.Mobile || '').replace(/\D/g, '').slice(-10) === mo); if (c) { setV(o => o.name.trim() ? o : { ...o, name: c.name || c.Name }); toast('Customer: ' + (c.name || c.Name), 'ok'); } } catch (e) { }
  }, 300)).current;
  const add = async files => { const l = imgs.slice(); for (const x of files) { if (l.length >= 4) { toast('Vadhu ma vadhu 4 photo', 'bad'); break; } try { l.push(await shrinkImage(x, 1600, 0.8)); } catch (e) { toast(e.message, 'bad'); } } setImgs(l); };
  const save = () => work(async () => {
    const t = s => String(s || '').trim();
    if (t(v.name).length < 2) return toast('Customer naam lakho', 'bad');
    if (t(v.mobile) && t(v.mobile).length !== 10) return toast('Mobile 10 ank no lakho', 'bad');
    const r = await api('rpl.save', { name: t(v.name), mobile: t(v.mobile), date: t(v.date), product: t(v.product), size: t(v.size), brand: t(v.brand), billNo: t(v.billNo), company: t(v.company), oldSerial: t(v.oldSerial), note: t(v.note), images: imgs }, { rid: rid() });
    toast('Save thayu ✓ ' + r.id, 'ok'); setV(empty()); setImgs([]); load(q);
  });
  const rows = list && !list.err ? list : [];
  const cnt = {}; rows.forEach(x => { cnt[x.status] = (cnt[x.status] || 0) + 1; });
  const vis = rows.filter(x => !f || x.status === f);
  return <Box>
    <PageHead title="Replacement" />
    <Card><CardContent><Stack gap={1.5}>
      <Typography variant="h6" fontWeight={800}>➕ Navi Replacement entry</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label="Customer mobile" placeholder="10 ank" inputProps={{ inputMode: 'numeric', maxLength: 10 }} value={v.mobile} onChange={e => { const m = e.target.value.replace(/\D/g, '').slice(0, 10); S_('mobile', m); mob(m); }} /><TextField fullWidth label="Customer naam *" value={v.name} onChange={e => S_('name', e.target.value)} /></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth type="date" label="Tarikh *" InputLabelProps={{ shrink: true }} value={v.date} onChange={e => S_('date', e.target.value)} /><Autocomplete fullWidth freeSolo options={PRODS} inputValue={v.product} onInputChange={(e, x) => S_('product', x)} renderInput={p => <TextField {...p} label="Product" />} /></Stack>
      <Box><Typography variant="subtitle2" sx={{ mb: .5 }}>Ketla GB</Typography><Stack direction="row" gap={.8} flexWrap="wrap" sx={{ mb: 1 }}>{SIZES.map(s => <Chip key={s} label={s} color={v.size === s ? 'primary' : 'default'} onClick={() => S_('size', s)} />)}</Stack><TextField fullWidth placeholder="Jem ke 256 GB" value={v.size} onChange={e => S_('size', e.target.value)} /></Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label="Brand / Model" placeholder="Jem ke EVM, Crucial" value={v.brand} onChange={e => S_('brand', e.target.value)} /><TextField fullWidth label="Bill no." value={v.billNo} onChange={e => S_('billNo', e.target.value)} /></Stack>
      <Autocomplete freeSolo options={companies()} inputValue={v.company} onInputChange={(e, x) => S_('company', x)} renderInput={p => <TextField {...p} label="Kai company / service center" placeholder="Jem ke EVM Service Center, Rashi, Supertron" />} />
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label="Juno serial no." value={v.oldSerial} onChange={e => S_('oldSerial', e.target.value)} /><TextField fullWidth label="Note" placeholder="Shu problem chhe" value={v.note} onChange={e => S_('note', e.target.value)} /></Stack>
      <Box><Typography variant="subtitle2">Bill / product no photo (vadhu ma vadhu 4)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 1, my: 1 }}>{imgs.length ? imgs.map((u, i) => <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb', aspectRatio: '3/4' }}><img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><IconButton size="small" onClick={() => setImgs(imgs.filter((x, j) => j !== i))} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: '#dc2626', color: '#fff' }}><CloseIcon fontSize="small" /></IconButton></Box>) : <small style={{ color: '#64748b' }}>Haju photo nathi</small>}</Box>
        <Stack direction="row" gap={1}><Button variant="contained" onClick={async () => { const x = await pickFile(true); if (x) add([x]); }}>📷 Photo pado</Button><Button variant="outlined" onClick={async () => { const fs = await pickFile(false, 'image/*', true); if (fs && fs.length) add(fs); }}>🖼 Upload</Button></Stack></Box>
      <Button fullWidth size="large" variant="contained" color="success" onClick={save} sx={{ py: 1.5 }}>💾 Save Replacement</Button>
    </Stack></CardContent></Card>
    <Card sx={{ mt: 2 }}><CardContent>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}><Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>Replacement list</Typography><TextField size="small" placeholder="🔍 Naam / mobile / serial" value={q} onChange={e => { setQ(e.target.value); qd(e.target.value); }} sx={{ maxWidth: 240 }} /></Stack>
      {!list ? <Skel /> : list.err ? <small>{list.err}</small> : <>
        <Stack direction="row" gap={.8} flexWrap="wrap" sx={{ mb: 1.5 }}><Chip label={`Badha (${rows.length})`} color={!f ? 'primary' : 'default'} onClick={() => { RP.f = ''; setF(''); }} />{REP_ST.filter(k => cnt[k]).map(k => <Chip key={k} label={`${REP_SH[k]} (${cnt[k]})`} onClick={() => { RP.f = k; setF(k); }} sx={f === k ? { bgcolor: REP_CLR[k], color: '#fff' } : undefined} />)}</Stack>
        {vis.length ? vis.map(x => <Stack key={x.id} direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} sx={{ py: 1, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => rpOpen(x, () => load(q))}>
          <Box><b>{x.name}</b> {x.mobile ? '· ' + x.mobile : ''}<br /><Typography variant="caption">{x.date}{rpTime(x) ? ' ' + rpTime(x) : ''} · {x.product} {x.size || ''} {x.brand || ''}{x.billNo ? ' · Bill ' + x.billNo : ''}{x.company ? ' · 🏭 ' + x.company : ''}{x.photos ? ' · 📷' + x.photos : ''}{x.by && <><br />👤 {x.by}</>}</Typography></Box>
          <Chip size="small" label={REP_SH[x.status] || x.status} sx={{ bgcolor: REP_CLR[x.status] || '#64748b', color: '#fff', fontWeight: 700 }} /></Stack>) : <small>Haju koi entry nathi</small>}
      </>}
    </CardContent></Card>
  </Box>;
}

function rpPrint(x) { const w = window.open('', '_blank'); if (!w) return toast('Popup block thayu — browser ma popups allow karo', 'bad'); w.document.open(); w.document.write(rpHtml(x)); w.document.close(); }
function rpWaPdf(x) {
  const msg = `Namaste ${x.name}, C COMPUTER thi. Tamara ${x.product} ${x.size || ''} ni replacement receipt (${x.id}) mokli chhe. Status: ${(REP_GU[x.status] || x.status).replace(/^\S+\s/, '')}. Aabhar! – C COMPUTER, 8160088439`;
  return docPdfWa(rpHtml(x), x.name + ' - Replacement ' + x.id, x.mobile, msg);
}
function Photos({ x }) {
  const [ph, setPh] = useState(null), [err, setErr] = useState('');
  useEffect(() => { if (x.photos) api('rpl.photo', { id: x.id }, { loader: false }).then(setPh, e => setErr(e.message)); }, []);
  if (!x.photos) return null; if (err) return <small>{err}</small>; if (!ph) return <small>⏳ Photo aave chhe…</small>;
  return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 1 }}>{ph.map((u, i) => <img key={i} src={u} alt="" style={{ width: '100%', borderRadius: 8, cursor: 'pointer', border: '1px solid #e5e7eb' }} onClick={() => openDialog('Bill photo', () => <img src={u} alt="" style={{ width: '100%' }} />, { maxWidth: 'md' })} />)}</Box>;
}
function OpenBody({ x, v }) {
  const [, setN] = useState(0); const set = (k, y) => { v[k] = y; setN(n => n + 1); };
  const row = (k, val) => val ? <tr><td style={{ color: '#64748b', padding: '4px 10px 4px 0' }}>{k}</td><td><b>{val}</b></td></tr> : null;
  const addNI = async fs => { for (const f of fs) { if (v.NI.length >= 4) break; try { v.NI.push(await shrinkImage(f, 1600, 0.8)); } catch (e) { toast(e.message, 'bad'); } } setN(n => n + 1); };
  return <Stack gap={1.5}>
    <table style={{ fontSize: 14 }}><tbody>{row('Tarikh', x.date + (rpTime(x) ? ' · ' + rpTime(x) : ''))}{row('Mobile', x.mobile)}{row('Product', x.product + ' ' + (x.size || ''))}{row('Brand', x.brand)}{row('Bill no.', x.billNo)}{row('Company', x.company)}{row('Juno serial', x.oldSerial)}{row('Navo serial', x.newSerial)}{row('Note', x.note)}{row('Entry', x.by)}</tbody></table>
    <Photos x={x} />
    <TextField select label="Status badlo" value={v.status} onChange={e => set('status', e.target.value)}>{REP_ST.map(s => <MenuItem key={s} value={s}>{REP_GU[s]}</MenuItem>)}</TextField>
    <Autocomplete freeSolo options={companies()} inputValue={v.company} onInputChange={(e, y) => set('company', y)} renderInput={p => <TextField {...p} id="rpCo" label="Kai company / service center ne aapyu" />} />
    <TextField label="Navo serial no. (replacement aave tyare)" value={v.newSerial} onChange={e => set('newSerial', e.target.value)} />
    <Box><Typography variant="subtitle2">Navo photo umero (jem ke service center ni slip, navu SSD)</Typography>
      <Stack direction="row" gap={.8} flexWrap="wrap" sx={{ my: .5 }}>{v.NI.map((u, i) => <Box key={i} sx={{ position: 'relative' }}><img src={u} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} /><IconButton size="small" onClick={() => { v.NI.splice(i, 1); setN(n => n + 1); }} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#dc2626', color: '#fff', width: 20, height: 20 }}><CloseIcon sx={{ fontSize: 12 }} /></IconButton></Box>)}</Stack>
      <Stack direction="row" gap={1}><Button size="small" variant="contained" onClick={async () => { const f = await pickFile(true); if (f) addNI([f]); }}>📷 Photo pado</Button><Button size="small" variant="outlined" onClick={async () => { const fs = await pickFile(false, 'image/*', true); if (fs && fs.length) addNI(fs); }}>🖼 Upload</Button></Stack></Box>
    {(x.log || []).length > 0 && <Box sx={{ fontSize: 12.5, color: '#475569' }}><b>Itihas</b>{x.log.map((l, i) => <div key={i}>• {String(l.t || '').slice(0, 16)} – {REP_GU[l.s] || l.s}{l.co ? ' (' + l.co + ')' : ''}{l.ns ? ' · navo SN ' + l.ns : ''} – {l.by || ''}</div>)}</Box>}
    {x.mobile && <Button variant="outlined" href={`https://wa.me/91${x.mobile}?text=${encodeURIComponent('Namaste ' + x.name + ', C COMPUTER thi. Tamara ' + x.product + ' ' + (x.size || '') + ' nu replacement: ' + (REP_GU[x.status] || x.status).replace(/^\S+\s/, '') + '. Aabhar!')}`} target="_blank">💬 WhatsApp</Button>}
  </Stack>;
}
function rpOpen(x, reload) {
  const v = { status: x.status, company: x.company || '', newSerial: x.newSerial || '', NI: [] };
  openDialog(x.id + ' · ' + x.name, () => <OpenBody x={x} v={v} />, {
    maxWidth: 'sm', actions: close => <>
      <Button variant="contained" sx={{ bgcolor: '#16a34a' }} onClick={() => work(() => rpWaPdf(x))}>📲 WhatsApp PDF</Button>
      <Button variant="contained" sx={{ bgcolor: '#0b1f4b', color: '#f5b800' }} onClick={() => rpPrint(x)}>🖨 Print Receipt</Button>
      <Button variant="contained" color="success" onClick={() => work(async () => {
        if (v.status === 'Sent to Company' && !v.company.trim()) { const e = document.getElementById('rpCo'); if (e) e.focus(); throw new Error('Kai company / service center ne aapyu te lakho'); }
        await api('rpl.status', { id: x.id, status: v.status, newSerial: v.newSerial.trim(), company: v.company.trim(), images: v.NI }, { rid: rid() }); toast('Save ✓', 'ok'); close(); reload();
      })}>Save status</Button></>
  });
}
