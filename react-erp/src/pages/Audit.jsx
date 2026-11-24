import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography, Card, CardContent, Chip, Alert, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api, S, nf, isAdmin, LI, LT, rid, toast, work, TRK } from '../lib/core.js';
import { PageHead, Skel, DataTable, Stat, Grid, Pill, openDialog, openScanner, ProductPicker, confirmBox } from '../lib/ui.jsx';

/* ---------- Stock Audit ---------- */
export default function Audit({ params }) {
  const [d, setD] = useState(null), [aid, setAid] = useState(params.auditId || ''), [n, setN] = useState(0);
  const a = isAdmin(), reload = () => setN(x => x + 1);
  useEffect(() => { let on = true; api('aud.list', { auditId: aid }).then(x => { if (on) { setD(x); S._aud = x; } }, e => toast(e.message, 'bad')); return () => { on = false; }; }, [aid, n]);
  const head = <PageHead title={LI('audit')}>{a && <Button variant="contained" startIcon={<AddIcon />} onClick={async () => { if (await confirmBox('Start a new stock audit? (the previous one is closed)')) work(async () => { await api('aud.open', {}, { rid: rid() }); params.auditId = ''; setAid(''); reload(); }); }}>Start new audit</Button>}</PageHead>;
  if (!d) return <>{head}<Skel /></>;
  if (!d.open && !d.lines.length) return <>{head}<Alert severity="info">No stock audit is open. {a ? 'Press "Start new audit", then staff can count products.' : 'Ask Admin to start a stock audit.'}</Alert></>;
  const isOpen = d.open && d.open === d.auditId;
  const decide = (id, dec) => work(async () => { const r = await api('aud.decide', { lineId: id, decision: dec }, { rid: rid() }); if (dec === 'APPROVE') toast('Approved' + (r.notes && r.notes.length ? ' — ' + r.notes.join('; ') : ''), 'ok'); reload(); });
  return <Box>{head}
    <Alert severity="info" sx={{ mb: 2 }}>Audit <b>{d.auditId || d.open}</b> {isOpen ? '(open)' : '(closed)'} — staff count what they see on the shelf; they do not see system stock.</Alert>
    {isOpen && <Card sx={{ mb: 2 }}><CardContent><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{LT('count')}</Typography><ProductPicker placeholder="Search product to count" onPick={p => countForm(p, reload)} /></CardContent></Card>}
    <DataTable rows={d.lines} empty="No counts yet" onRow={a ? l => audView(l) : undefined} cols={[{ h: LT('products'), k: l => <><b>{l.product}</b><br /><small>{TRK[l.tracking] || ''}</small></> }, { h: 'Counted', k: l => <>{nf(l.counted)}{l.damaged ? <small> ({l.damaged} dmg)</small> : null}</>, align: 'right' }]
      .concat(a ? [{ h: 'System', k: l => nf(l.system), align: 'right' }, { h: 'Difference', k: l => <Chip size="small" color={l.diff === 0 ? 'success' : l.diff < 0 ? 'error' : 'warning'} label={(l.diff > 0 ? '+' : '') + l.diff} />, align: 'right' }] : [])
      .concat([{ h: 'By', k: l => l.by }, { h: LT('status'), k: l => <Pill s={l.status} /> }])
      .concat(a ? [{ h: '', k: l => l.status === 'Counted' ? <Stack direction="row" gap={1} onClick={e => e.stopPropagation()}><Button size="small" variant="contained" color="success" onClick={() => decide(l.lineId, 'APPROVE')}>Approve</Button><Button size="small" variant="contained" color="error" onClick={() => decide(l.lineId, 'REJECT')}>Reject</Button></Stack> : null, align: 'right' }] : [])} />
    {a && d.sessions.length > 0 && <><Typography variant="h6" fontWeight={800} sx={{ mt: 3, mb: 1 }}>Audit history</Typography>
      <DataTable rows={d.sessions} cols={[{ h: 'Audit', k: s => <b>{s.auditId}</b> }, { h: LT('date'), k: s => s.date }, { h: 'Lines', k: s => s.lines, align: 'right' }, { h: 'Approved', k: s => s.approved, align: 'right' }, { h: '', k: s => <Button size="small" variant="outlined" onClick={() => { params.auditId = s.auditId; setAid(s.auditId); }}>{LT('viewall')}</Button>, align: 'right' }]} /></>}
  </Box>;
}
function audView(l) {
  const f = l.findings || {};
  const sec = (t, arr) => arr && arr.length ? <Box key={t}><Typography fontWeight={800} sx={{ mt: 1.5 }}>{t} ({arr.length})</Typography><ul>{arr.map((x, i) => <li key={i}>{x}</li>)}</ul></Box> : null;
  openDialog(l.product, () => <><Grid cols={3}><Stat label="System" value={l.system} /><Stat label="Counted" value={l.counted} /><Stat label="Difference" value={l.diff} /></Grid>
    {sec('Missing stock', f.missing)}{sec('Unregistered items', f.unregistered)}{sec('Duplicate scans', f.duplicate)}{sec('Wrong product', f.wrong)}{sec('Damaged found', f.damagedFound)}{l.note && <Alert severity="warning">{l.note}</Alert>}</>, { maxWidth: 'sm' });
}
function CountBody({ p, v }) {
  const [, setN] = useState(0), [c, setC] = useState(''); const re = () => setN(n => n + 1);
  const add = x => { x = String(x || '').trim(); if (x) { v.scanned.push(x); re(); } };
  if (p.TrackingType === 'QTY') return <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ pt: 1 }}><TextField autoFocus fullWidth type="number" label="Counted on shelf (all pieces)" inputProps={{ min: 0, inputMode: 'numeric' }} onChange={e => { v.counted = e.target.value; }} /><TextField fullWidth type="number" label="Out of these, damaged" defaultValue={0} inputProps={{ min: 0 }} onChange={e => { v.damaged = e.target.value; }} /></Stack>;
  return <Stack gap={1.5}><Alert severity="info">Scan or type every piece you can see (serial / Item ID).</Alert>
    <Stack direction="row" gap={1}><TextField autoFocus fullWidth placeholder="Serial / Item ID, press Enter" value={c} autoComplete="off" onChange={e => setC(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(c); setC(''); } }} /><IconButton onClick={() => openScanner(add, LT('scan'))}><QrCodeScannerIcon /></IconButton></Stack>
    <Box><b>{v.scanned.length}</b> scanned<br />{v.scanned.map((x, i) => <Chip key={i} label={x} onDelete={() => { v.scanned.splice(i, 1); re(); }} sx={{ m: .3 }} />)}</Box></Stack>;
}
function countForm(p, reload) {
  const v = { counted: '', damaged: 0, scanned: [] }, tr = p.TrackingType, _rid = rid();
  openDialog(p.Name, () => <CountBody p={p} v={v} />, {
    maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => {
      const r = await api('aud.count', { productId: p.ProductID, counted: tr === 'QTY' ? v.counted : undefined, damaged: tr === 'QTY' ? v.damaged : undefined, scanned: tr === 'QTY' ? undefined : v.scanned }, { rid: _rid });
      toast('Count saved: ' + r.counted, 'ok'); close(); reload();
    })}>{LT('save')}</Button>
  });
}
