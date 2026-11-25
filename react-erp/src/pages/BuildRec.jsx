/* ================= Build Record: serial number or photo for every part sold (same logic as JS_BuildRec.html) ================= */
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Box, Button, Stack, TextField, Typography, Paper, Chip, Alert, IconButton, Checkbox, FormControlLabel, Autocomplete, Snackbar, CircularProgress, Table, TableBody, TableRow, TableCell, TableHead, TableContainer } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api, S, isAdmin, rid, toast, work, dtm, shrinkImage, pickFile, debounce } from '../lib/core.js';
import { PageHead, Skel, DataTable, openDialog, openScanner, promptBox, Loading } from '../lib/ui.jsx';
import { refresh } from '../lib/nav.js';

const BR_KINDS = [['SET', 'Aakho Set', 'CPU + Monitor + Keyboard + Mouse'], ['CPU', 'Fakt CPU', 'Cabinet vala PC (monitor vagar)'], ['LAPTOP', 'Laptop', 'Laptop + Charger'], ['OTHER', 'Biju / Part', 'Koi pan ek ke vadhu part']];
const BR_BRANDS = {
  cpu: ['Intel', 'AMD'], mb: ['Gigabyte', 'Asus', 'MSI', 'ASRock', 'Biostar', 'Zebronics', 'Intel'], ram: ['Crucial', 'Kingston', 'Adata', 'Corsair', 'Samsung', 'Hynix', 'Transcend'],
  ssd: ['Crucial', 'Kingston', 'WD', 'Samsung', 'Adata', 'Transcend', 'Zebronics'], hdd: ['Seagate', 'WD', 'Toshiba'], cab: ['Zebronics', 'Ant Esports', 'Cooler Master', 'Circle', 'Frontech', 'Foxin'],
  smps: ['Zebronics', 'Corsair', 'Cooler Master', 'Ant Esports', 'Circle', 'Frontech'], fan: ['Intel', 'AMD', 'Cooler Master', 'Zebronics'], cable: [], kb: ['Logitech', 'HP', 'Dell', 'Lenovo', 'Zebronics', 'Frontech'],
  ms: ['Logitech', 'HP', 'Dell', 'Lenovo', 'Zebronics', 'Frontech'], mon: ['Dell', 'HP', 'Samsung', 'LG', 'Acer', 'Lenovo', 'BenQ', 'Zebronics', 'Philips'],
  lap: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Apple'], chg: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer'], oth: []
};
const BR_INCH = ['15', '17', '18.5', '19', '19.5', '20', '21.5', '22', '23.8', '24', '27', '32'];
const BR_CPU = [['Processor', 'cpu', 'i5 7th Gen'], ['Motherboard', 'mb', 'H110 / B450'], ['RAM', 'ram', '8GB DDR4'], ['SSD', 'ssd', '256GB'], ['Hard Disk', 'hdd', '1TB'], ['Cabinet', 'cab', ''], ['Power Supply (SMPS)', 'smps', '450W'], ['CPU Fan', 'fan', ''], ['Power Cable', 'cable', '']];
const BR_SET = BR_CPU.concat([['Keyboard', 'kb', ''], ['Mouse', 'ms', ''], ['Monitor', 'mon', '22']]);
const BR_LAP = [['Laptop', 'lap', 'i5 / 8GB / 256GB'], ['Charger', 'chg', '']];
let UID = 0;
function brParts(kind) {
  const src = kind === 'SET' ? BR_SET : kind === 'CPU' ? BR_CPU : kind === 'LAPTOP' ? BR_LAP : [];
  return src.map(x => ({ id: ++UID, part: x[0], bk: x[1], ph: x[2], brand: '', spec: '', serial: '', dataUrl: '', thumb: '', skip: false }));
}
const kindName = k => (BR_KINDS.find(x => x[0] === k) || [])[1] || k;

/* ---------- background save chip (user can open any other page meanwhile) ---------- */
const chip = { v: null, subs: new Set() };
const setChip = v => { chip.v = v; chip.subs.forEach(f => f()); };
export function BrChip() {
  const v = useSyncExternalStore(f => { chip.subs.add(f); return () => chip.subs.delete(f); }, () => chip.v);
  if (!v) return null;
  return <Paper elevation={10} sx={{ position: 'fixed', left: 16, bottom: 84, zIndex: 2500, p: 1.5, display: 'flex', alignItems: 'center', gap: 1, maxWidth: 520, bgcolor: v.st === 'ok' ? '#ecfdf5' : v.st === 'bad' ? '#fef2f2' : '#fff' }}>
    {v.st === 'run' && <CircularProgress size={18} />}<Typography variant="body2">{v.msg}</Typography>
    {v.open && <Button size="small" variant="contained" onClick={() => { setChip(null); openBrec(v.open); }}>Kholo</Button>}
    {v.retry && <Button size="small" variant="contained" onClick={v.retry}>Pachu try karo</Button>}
    {v.st !== 'run' && <IconButton size="small" onClick={() => setChip(null)}><CloseIcon fontSize="small" /></IconButton>}
  </Paper>;
}
function brBgSave(payload, id, action, label) {
  action = action || 'brec.create';
  const name = label || (payload.customer.name || '').trim() || 'Build Record';
  setChip({ st: 'run', msg: 'Saving: ' + name + ' ... (page bandh na karo)' });
  window.onbeforeunload = () => 'Save chalu che';
  api(action, payload, { rid: id, loader: false }).then(r => {
    window.onbeforeunload = null;
    setChip({ st: 'ok', msg: (action === 'brec.add' ? 'Part add thayo successfully: ' : 'Build Record saved successfully: ') + name + ' (' + r.recId + ')', open: r.recId });
    if (S.route === 'brec') refresh();
    setTimeout(() => { if (chip.v && chip.v.st === 'ok') setChip(null); }, 20000);
  }).catch(e => {
    window.onbeforeunload = null;
    setChip({ st: 'bad', msg: 'Save na thayu: ' + (e.message || 'error'), retry: () => brBgSave(payload, id, action, label) });
  });
}

export default function BuildRec() {
  const [q, setQ] = useState(''), [r, setR] = useState(null), [find, setFind] = useState(null), [n, setN] = useState(0);
  useEffect(() => { let on = true; setR(null); api('brec.list', { q }).then(x => on && setR(x), e => toast(e.message, 'bad')); return () => { on = false; }; }, [q, n]);
  const qd = useRef(debounce(setQ, 250)).current;
  const sf = useRef(debounce(async v => { v = v.trim(); if (v.length < 3) return setFind(null); try { setFind(await api('brec.find', { q: v })); } catch (e) { setFind({ err: e.message }); } }, 350)).current;
  return <Box>
    <PageHead title="Build Record"><Button variant="contained" startIcon={<AddIcon />} onClick={brNew}>New Build Record</Button></PageHead>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}><TextField placeholder="Customer / mobile / ID" onChange={e => qd(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} /><TextField placeholder="Serial number thi shodho" onChange={e => sf(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} /></Stack>
    {find && (find.err ? <Alert severity="error">{find.err}</Alert> : find.length ? <Box sx={{ mb: 2 }}><DataTable rows={find} onRow={x => openBrec(x.recId)} cols={[{ h: 'Serial', k: x => <b>{x.serial}</b> }, { h: 'Part', k: x => x.part + (x.brand ? ' · ' + x.brand : '') }, { h: 'Customer', k: x => <>{x.customer}{x.mobile && <><br /><small>{x.mobile}</small></>}</> }, { h: 'Staff / Time', k: x => <><b>{x.by}</b><br /><small>{dtm('', x.date)}</small></> }, { h: 'Status', k: x => x.status === 'Active' ? <Chip size="small" color="success" label="Active" /> : <Chip size="small" label="Replaced" /> }]} /></Box> : <Alert severity="info" sx={{ mb: 2 }}>Aa serial malyo nahi.</Alert>)}
    {!r ? <Skel /> : <DataTable rows={r} empty="Haju koi Build Record nathi" onRow={x => openBrec(x.recId)} cols={[{ h: 'ID', k: x => <><b>{x.recId}</b>{x.status === 'Cancelled' && <><br /><Chip size="small" label="Cancelled" /></>}</> }, { h: 'Customer', k: x => <>{x.customer}{x.mobile && <><br /><small>{x.mobile}</small></>}</> }, { h: 'Type', k: x => <>{kindName(x.kind)}{x.title && <><br /><small>{x.title}</small></>}</> }, { h: 'Parts', k: x => x.parts, align: 'right' }, { h: 'Staff / Time', k: x => <><b>{x.by}</b><br /><small>{dtm('', x.createdAt)}</small></> }]} />}
  </Box>;
}

/* ---------- new record ---------- */
function PartRow({ p, re }) {
  const set = (k, v) => { p[k] = v; re(); };
  const isMon = p.bk === 'mon';
  return <Paper variant="outlined" sx={{ p: 1.5, mb: 1, opacity: p.skip ? .45 : 1 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><b>{p.part}</b><FormControlLabel control={<Checkbox checked={p.skip} onChange={e => set('skip', e.target.checked)} />} label="Nathi" /></Stack>
    <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1.3fr 1fr' }, alignItems: 'center' }}>
      <Autocomplete freeSolo options={BR_BRANDS[p.bk] || []} value={p.brand} onInputChange={(e, v) => set('brand', v)} renderInput={x => <TextField {...x} label="Brand" placeholder="Brand" />} />
      {isMon ? <Autocomplete freeSolo options={BR_INCH} value={p.spec} onInputChange={(e, v) => set('spec', v)} renderInput={x => <TextField {...x} label="Inch" placeholder={p.ph} />} /> : <TextField label="Spec / Model" placeholder={p.ph} value={p.spec} onChange={e => set('spec', e.target.value)} />}
      <Stack direction="row" gap={.5}><TextField fullWidth label="Serial No." placeholder="Serial (box par lakhelo)" autoComplete="off" inputProps={{ autoCapitalize: 'characters' }} value={p.serial} onChange={e => set('serial', e.target.value)} /><IconButton onClick={() => openScanner(c => set('serial', String(c).toUpperCase()), p.part + ' - Serial', async f => { await work(async () => { p.dataUrl = await shrinkImage(f, 800, 0.65); p.thumb = await shrinkImage(f, 150, 0.6); re(); }); toast('Serial vanchayo nahi, photo save karyo', 'ok'); })}><QrCodeScannerIcon /></IconButton></Stack>
      <Stack direction="row" gap={1} alignItems="center">{p.thumb ? <img src={p.thumb} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} /> : <span>-</span>}
        <Button size="small" variant="outlined" startIcon={<CameraAltIcon />} onClick={async () => { const f = await pickFile(true); if (f) work(async () => { p.dataUrl = await shrinkImage(f, 800, 0.65); p.thumb = await shrinkImage(f, 150, 0.6); re(); toast('Photo li lidhi', 'ok'); }); }}>{p.thumb ? 'Fari' : 'Photo'}</Button>
        {p.thumb && <IconButton size="small" color="error" onClick={() => { p.dataUrl = ''; p.thumb = ''; re(); }}><CloseIcon fontSize="small" /></IconButton>}</Stack>
    </Box>
    {!p.serial && !p.thumb && !p.skip && <Typography variant="caption" color="error">Serial ke photo jaruri che</Typography>}
  </Paper>;
}
function NewRec({ st }) {
  const [, setN] = useState(0); const re = () => setN(n => n + 1); st.re = re;
  if (!st.kind) return <Box><Typography fontWeight={800} sx={{ mb: 1.5 }}>Shu vechyu?</Typography>
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' } }}>{BR_KINDS.map(k => <Button key={k[0]} variant="outlined" sx={{ flexDirection: 'column', py: 2, textTransform: 'none' }} onClick={() => { st.kind = k[0]; st.parts = brParts(k[0]); re(); }}><b>{k[1]}</b><small>{k[2]}</small></Button>)}</Box></Box>;
  const H = (k, v) => { st[k] = v; re(); };
  return <Stack gap={1.5}>
    <Alert severity="info"><b>{kindName(st.kind)}</b> &nbsp; <Button size="small" onClick={() => { st.kind = ''; re(); }}>badlo</Button></Alert>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label="Customer nu naam *" value={st.cn} onChange={e => H('cn', e.target.value)} autoComplete="off" /><TextField fullWidth label="Mobile" inputProps={{ inputMode: 'numeric', maxLength: 10 }} value={st.cm} onChange={e => H('cm', e.target.value)} autoComplete="off" /></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label="Brand / Title (example: Dell, i5 PC)" value={st.ti} onChange={e => H('ti', e.target.value)} /><TextField fullWidth label="Note" value={st.no} onChange={e => H('no', e.target.value)} /></Stack>
    {st.parts.length ? st.parts.map(p => <PartRow key={p.id} p={p} re={re} />) : <Alert severity="info">Neeche "Photo thi part umero" (serial na hoy to) ke "+ Part umero" dabavo.</Alert>}
    <Stack direction="row" gap={1} flexWrap="wrap"><Button variant="contained" startIcon={<CameraAltIcon />} onClick={async () => { const n = await promptBox('Part nu naam? (example: Cabinet, SMPS, UPS)', 'Cabinet'); if (!n || !n.trim()) return; const f = await pickFile(true); const row = { id: ++UID, part: n.trim().slice(0, 40), bk: 'oth', ph: '', brand: '', spec: '', serial: '', dataUrl: '', thumb: '', skip: false }; if (f) await work(async () => { row.dataUrl = await shrinkImage(f, 800, 0.65); row.thumb = await shrinkImage(f, 150, 0.6); }); st.parts.push(row); re(); }}>Photo thi part umero (serial na hoy to)</Button>
    <Button variant="outlined" onClick={async () => { const n = await promptBox('Part nu naam? (example: Webcam, UPS, Printer)', 'Part'); if (n && n.trim()) { st.parts.push({ id: ++UID, part: n.trim().slice(0, 40), bk: 'oth', ph: '', brand: '', spec: '', serial: '', dataUrl: '', thumb: '', skip: false }); re(); } }}>+ Part umero</Button></Stack>
  </Stack>;
}
function brNew() {
  const st = { kind: '', parts: [], cn: '', cm: '', ti: '', no: '' };
  openDialog('New Build Record', () => <NewRec st={st} />, {
    maxWidth: 'lg', sticky: true, actions: close => <Button variant="contained" onClick={() => {
      if (!st.kind) return;
      const parts = st.parts.filter(x => !x.skip);
      const miss = parts.filter(x => !x.serial.trim() && !x.dataUrl).map(x => x.part);
      if (miss.length) { toast('Serial ke photo nakho: ' + miss.join(', '), 'bad'); return; }
      const payload = { kind: st.kind, title: st.ti, note: st.no, customer: { name: st.cn, mobile: st.cm }, parts: parts.map(x => ({ part: x.part, brand: x.brand, spec: x.spec, serial: x.serial, dataUrl: x.dataUrl || undefined, thumbUrl: x.dataUrl ? x.thumb : undefined })) };
      close(); brBgSave(payload, rid());
    }}>Save</Button>
  });
}

/* ---------- open record ---------- */
const BR_PH = {};
function FullPhoto({ partId, thumb }) {
  const [src, setSrc] = useState(BR_PH[partId] || thumb || ''), [err, setErr] = useState(''), [done, setDone] = useState(!!BR_PH[partId]);
  useEffect(() => { if (BR_PH[partId]) return; api('brec.photo', { partId }).then(s => { BR_PH[partId] = s; setSrc(s); setDone(true); }, e => setErr(e.message)); }, []);
  return <><img src={src} alt="" style={{ width: '100%', borderRadius: 8, filter: done ? '' : 'blur(2px)' }} />{!done && <Alert severity={err ? 'error' : 'info'}>{err || 'Poora photo load thay che...'}</Alert>}</>;
}
export async function openBrec(id) {
  const wait = openDialog(id, () => <Loading />, { maxWidth: 'lg' });
  let b; try { b = await api('brec.get', { id }); } catch (e) { wait.close(); return toast(e.message, 'bad'); }
  wait.close();
  const sp = x => x.part === 'Monitor' && /^[\d.]+$/.test(x.spec) ? x.spec + ' inch' : x.spec;
  const dl = openDialog(b.recId + ' · ' + kindName(b.kind), () => <>
    <Alert severity="info"><b>{b.customer.name}</b>{b.customer.mobile ? ' · ' + b.customer.mobile : ''}<br /><small>Banavyu: <b>{b.by}</b> · {dtm('', b.createdAt)}{b.title ? ' · ' + b.title : ''}{b.note ? ' · ' + b.note : ''}</small></Alert>
    {b.status === 'Cancelled' ? <Alert severity="error" sx={{ mt: 1 }}><b>Aa record Cancel thayelo che.</b> Serial pachha free che. History sachvayeli che.</Alert>
      : <Stack direction="row" gap={1} sx={{ my: 1.5 }}><Button variant="contained" startIcon={<AddIcon />} onClick={() => brAdd(b, dl)}>Part add</Button>{isAdmin() && <Button variant="outlined" onClick={() => brCancel(b, dl)}>Cancel Record</Button>}</Stack>}
    {isAdmin() && <Box sx={{ mb: 1.5 }}><Button variant="outlined" color="error" onClick={() => brDelete(b, dl)}>Delete Record</Button></Box>}
    <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell><b>Part</b></TableCell><TableCell><b>Serial</b></TableCell><TableCell><b>Photo</b></TableCell></TableRow></TableHead>
      <TableBody>{b.parts.map(x => <TableRow key={x.partId}><TableCell><b>{x.part}</b>{x.brand && <><br /><small>{x.brand}</small></>}{sp(x) && <><br /><small>{sp(x)}</small></>}{x.changedFrom && <><br /><small style={{ color: '#b45309' }}>Badlayu: {x.by} · {dtm('', x.at)}</small></>}
        {b.status !== 'Cancelled' && <><br /><Button size="small" variant="outlined" sx={{ mt: .5 }} onClick={() => brChange(b, x, dl)}>Badlo</Button></>}</TableCell>
        <TableCell>{x.serial ? <b>{x.serial}</b> : <small>Serial nathi</small>}</TableCell>
        <TableCell>{x.thumb ? <img src={x.thumb} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => openDialog('Photo', () => <FullPhoto partId={x.partId} thumb={x.thumb} />, { maxWidth: 'md' })} /> : '-'}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
    {b.history.length > 0 && <><Typography fontWeight={800} sx={{ mt: 2, mb: 1 }}>Juna (badlayela) part</Typography><DataTable rows={b.history} cols={[{ h: 'Part', k: x => x.part }, { h: 'Serial', k: x => x.serial || 'Photo' }, { h: 'When', k: x => <small>{dtm('', x.at)}<br />{x.by}</small> }]} /></>}
  </>, { maxWidth: 'lg' });
}
function PhotoPick({ v }) {
  const [, setN] = useState(0);
  return <Stack direction="row" gap={1} alignItems="center">{v.th ? <img src={v.th} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} /> : <span>-</span>}
    <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={async () => { const f = await pickFile(true); if (f) work(async () => { v.du = await shrinkImage(f, 800, 0.65); v.th = await shrinkImage(f, 150, 0.6); setN(n => n + 1); }); }}>Photo</Button></Stack>;
}
function SerialField({ v, k, label }) {
  const [, setN] = useState(0);
  return <Stack direction="row" gap={.5}><TextField fullWidth label={label} autoComplete="off" inputProps={{ autoCapitalize: 'characters' }} value={v[k]} onChange={e => { v[k] = e.target.value; setN(n => n + 1); }} /><IconButton onClick={() => openScanner(c => { v[k] = String(c).toUpperCase(); setN(n => n + 1); }, 'Serial')}><QrCodeScannerIcon /></IconButton></Stack>;
}
function brChange(b, part, parent) {
  const v = { serial: '', brand: part.brand, spec: part.spec, note: '', du: '', th: '' };
  openDialog('Badlo: ' + part.part, () => <Stack gap={1.5} sx={{ pt: 1 }}>
    <Alert severity="info">Juno serial: <b>{part.serial || 'photo'}</b> (history ma rahse)</Alert>
    <SerialField v={v} k="serial" label="Navo Serial No." />
    <Stack direction="row" gap={1.5}><TextField fullWidth label="Brand" defaultValue={v.brand} onChange={e => { v.brand = e.target.value; }} /><TextField fullWidth label="Spec" defaultValue={v.spec} onChange={e => { v.spec = e.target.value; }} /></Stack>
    <Box><Typography variant="subtitle2">Photo</Typography><PhotoPick v={v} /></Box>
    <TextField label="Karan (note)" placeholder="example: kharab thayu" onChange={e => { v.note = e.target.value; }} />
  </Stack>, {
    maxWidth: 'sm', sticky: true, actions: close => <Button variant="contained" onClick={() => work(async () => {
      const serial = v.serial.trim(); if (!serial && !v.du) throw new Error('Navo serial ke photo nakho.');
      await api('brec.change', { partId: part.partId, serial, brand: v.brand, spec: v.spec, note: v.note, dataUrl: v.du || undefined, thumbUrl: v.du ? v.th : undefined }, { rid: rid(), loader: true });
      toast('Part badlayo', 'ok'); close(); parent.close(); openBrec(b.recId);
    })}>Save</Button>
  });
}
function brAdd(b, parent) {
  const v = { part: '', serial: '', brand: '', spec: '', du: '', th: '' };
  const names = [...new Set(BR_SET.map(x => x[0]).concat(['Charger', 'Other']))];
  openDialog('Part add: ' + b.recId, () => <Stack gap={1.5} sx={{ pt: 1 }}>
    <Alert severity="info">Navo part add thase. Juna parts ne kai nahi thay.</Alert>
    <Autocomplete freeSolo options={names} onInputChange={(e, x) => { v.part = x; }} renderInput={x => <TextField {...x} label="Part" placeholder="example: Mouse" />} />
    <SerialField v={v} k="serial" label="Serial No." />
    <Stack direction="row" gap={1.5}><TextField fullWidth label="Brand" onChange={e => { v.brand = e.target.value; }} /><TextField fullWidth label="Spec / inch" onChange={e => { v.spec = e.target.value; }} /></Stack>
    <Box><Typography variant="subtitle2">Photo (jo serial na hoy)</Typography><PhotoPick v={v} /></Box>
  </Stack>, {
    maxWidth: 'sm', sticky: true, actions: close => <Button variant="contained" onClick={() => {
      const part = v.part.trim(), serial = v.serial.trim();
      if (!part) return toast('Part nu naam lakho.', 'bad');
      if (!serial && !v.du) return toast('Serial ke photo nakho.', 'bad');
      const payload = { id: b.recId, parts: [{ part, serial, brand: v.brand, spec: v.spec, dataUrl: v.du || undefined, thumbUrl: v.du ? v.th : undefined }] };
      close(); parent.close(); brBgSave(payload, rid(), 'brec.add', b.recId + ' · ' + part);
    }}>Save</Button>
  });
}
function brCancel(b, parent) {
  let reason = '';
  openDialog('Cancel Record: ' + b.recId, () => <Stack gap={1.5}><Alert severity="error">Record delete nathi thatu. Cancelled thase, history rahese ane tena serial pachha free thai jashe.</Alert><TextField label="Karan (jaruri)" placeholder="example: duplicate save thayu" onChange={e => { reason = e.target.value; }} /></Stack>, {
    maxWidth: 'sm', sticky: true, actions: close => <Button variant="contained" onClick={() => work(async () => {
      if (reason.trim().length < 2) throw new Error('Karan lakho.');
      await api('brec.cancel', { id: b.recId, reason: reason.trim() }, { rid: rid(), loader: true });
      toast('Record cancel thayo', 'ok'); close(); parent.close(); if (S.route === 'brec') refresh(); openBrec(b.recId);
    })}>Cancel Record</Button>
  });
}
function brDelete(b, parent) {
  let reason = '';
  openDialog('Delete Record: ' + b.recId, () => <Stack gap={1.5}><Alert severity="error"><b>{b.recId} ({b.customer.name})</b> list ma thi hati jashe ane tena serial free thai jashe. Sheet ma data surakshit rahese (Deleted lakhine).</Alert><TextField label="Karan (optional)" placeholder="example: duplicate" onChange={e => { reason = e.target.value; }} /></Stack>, {
    maxWidth: 'sm', sticky: true, actions: close => <Button variant="contained" color="error" onClick={() => work(async () => {
      await api('brec.delete', { id: b.recId, reason: reason.trim() }, { rid: rid(), loader: true });
      toast('Record delete thayo', 'ok'); close(); parent.close(); if (S.route === 'brec') refresh();
    })}>Haa, Delete karo</Button>
  });
}
