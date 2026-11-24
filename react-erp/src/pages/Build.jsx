import React, { useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, TextField, Typography, Paper, Chip, Alert, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api, S, LI, LT, rid, toast, work, dtm } from '../lib/core.js';
import { PageHead, Skel, DataTable, Pill, openDialog, openScanner, ProductPicker, confirmBox, promptBox } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { go, refresh } from '../lib/nav.js';

export const bf = { q: '', status: '' };
export default function Build() {
  const [f, set] = useFilter(bf);
  const [r] = useList('build.list', f);
  const q = useDebounced(v => set('q', v));
  return <Box>
    <PageHead title={LI('build')}><Button variant="contained" startIcon={<AddIcon />} onClick={newBuild}>New Build</Button></PageHead>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder={`Build ID / ${LT('name')}`} defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.status} displayEmpty onChange={e => set('status', e.target.value)} sx={{ minWidth: 150, bgcolor: '#fff' }}><MenuItem value="">{LT('all')}</MenuItem>{['Draft', 'Completed', 'Delivered', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select>
    </Stack>
    {!r ? <Skel /> : <DataTable rows={r.rows || r} empty="No builds yet" onRow={b => openBuild(b.buildId)} cols={[{ h: 'Build ID', k: b => <b>{b.buildId}</b> }, { h: LT('name'), k: b => b.name }, { h: LT('customers'), k: b => <>{b.customer}{b.mobile && <><br /><small>{b.mobile}</small></>}</> }, { h: 'Parts', k: b => b.components, align: 'right' }, { h: LT('date'), k: b => dtm('', b.createdAt), nw: true }, { h: LT('status'), k: b => <Pill s={b.status} /> }]} />}
  </Box>;
}
function newBuild() {
  const v = { n: '', cn: '', cm: '' }, _rid = rid();
  openDialog('New Build', () => <Stack gap={2} sx={{ pt: 1 }}><TextField autoFocus label={LT('name') + ' * (example: i5 7th Gen, 8GB, 256GB)'} onChange={e => { v.n = e.target.value; }} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth label={LT('customers') + ' ' + LT('name')} onChange={e => { v.cn = e.target.value; }} /><TextField fullWidth label={LT('mobile')} inputProps={{ inputMode: 'numeric' }} onChange={e => { v.cm = e.target.value; }} /></Stack></Stack>, {
    maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => { const r = await api('build.create', { name: v.n, customer: { name: v.cn, mobile: v.cm } }, { rid: _rid }); close(); openBuild(r.buildId); })}>{LT('save')}</Button>
  });
}
export async function openBuild(id) {
  let b; try { b = await api('build.get', { id }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); }
  const open = b.status === 'Draft' || b.status === 'Completed';
  let dl = null;
  const again = () => { dl.close(); openBuild(b.buildId); if (S.route === 'build') refresh(); };
  const add = body => work(async () => { await api('build.add', Object.assign({ buildId: b.buildId }, body), { rid: rid() }); again(); });
  const setSt = async st => {
    let customer;
    if (st === 'Delivered' && !b.customer) { const n = await promptBox('Customer name?', 'Name'); if (!n) return; const mo = await promptBox('Customer mobile (10 digit)?', 'Mobile'); if (!mo) return; customer = { name: n, mobile: mo }; }
    if (['Delivered', 'Cancelled'].includes(st) && !(await confirmBox(st + '?'))) return;
    work(async () => { await api('build.status', { buildId: b.buildId, status: st, customer }, { rid: rid() }); toast('Build ' + st, 'ok'); dl.close(); if (S.route === 'build') refresh(); });
  };
  dl = openDialog(<>{b.buildId} · {b.name} <Pill s={b.status} /></>, () => <BuildView b={b} open={open} add={add} remove={lineId => work(async () => { await api('build.remove', { lineId }, { rid: rid() }); again(); })} />, {
    maxWidth: 'lg', actions: close => <>{b.next.map(s => <Button key={s} variant="contained" color={s === 'Cancelled' ? 'error' : s === 'Delivered' ? 'success' : 'primary'} onClick={() => setSt(s)}>{s}</Button>)}
      {b.components.length > 0 && <Button startIcon={<PrintIcon />} onClick={() => { close(); go('print', { itemIds: b.components.filter(c => c.itemId).map(c => c.itemId) }); }}>Print</Button>}</>
  });
}
function BuildView({ b, open, add, remove }) {
  const [type, setType] = useState(b.types[0] || ''), [code, setCode] = useState(''), [pp, setPp] = useState(null), [qty, setQty] = useState(1);
  return <>
    {b.customer && <Alert severity="info" sx={{ mb: 1 }}>{b.customer.name} · {b.customer.mobile}</Alert>}
    {open && <Paper variant="outlined" sx={{ p: 2, mb: 2 }}><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Add component</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }}>
        <TextField select label="Type" value={type} onChange={e => setType(e.target.value)} sx={{ minWidth: 160 }}>{b.types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
        <TextField fullWidth label="Scan serial / Item ID" placeholder="Serial / Item ID" value={code} autoComplete="off" onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add({ type, code }); }} />
        <IconButton onClick={() => openScanner(c => add({ type, code: c }), LT('scan'))}><QrCodeScannerIcon /></IconButton>
        <Button variant="contained" onClick={() => add({ type, code })}>{LT('add')}</Button>
      </Stack>
      <Alert severity="info" sx={{ my: 1 }}>Mouse, cable or other quantity items: search them here:</Alert>
      <ProductPicker placeholder="Quantity item (mouse, cable...)" onPick={p => { if (p.TrackingType !== 'QTY') return toast('This product is tracked by serial — scan its serial above.', 'bad'); setPp(p); }} />
      {pp && <Stack direction="row" gap={1.5} sx={{ mt: 1 }} alignItems="center"><TextField type="number" label={pp.Name + ' — ' + LT('qty')} inputProps={{ min: 1 }} value={qty} onChange={e => setQty(e.target.value)} /><Button variant="contained" onClick={() => add({ type, productId: pp.ProductID, qty })}>{LT('add')}</Button></Stack>}
    </Paper>}
    <DataTable rows={b.components} empty="No components yet" cols={[{ h: 'Type', k: c => <Chip size="small" label={c.type} /> }, { h: LT('products'), k: c => c.name }, { h: LT('serialno') + ' / ID', k: c => c.itemId ? <>{c.serial || c.itemId}<br /><small>{c.itemId}</small></> : '-' }, { h: LT('qty'), k: c => c.qty, align: 'right' }, { h: '', k: c => open ? <IconButton color="error" size="small" onClick={() => remove(c.lineId)}><CloseIcon fontSize="small" /></IconButton> : null, align: 'right' }]} />
  </>;
}
