import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, TextField, Typography, Card, CardContent, Alert, Chip } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import AddIcon from '@mui/icons-material/Add';
import { api, S, nf, isAdmin, LI, LT, toast, TRK } from '../lib/core.js';
import { PageHead, Skel, Pager, Thumb, DataTable, Stat, Grid, Pill, openDialog, openScanner, Note } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { go } from '../lib/nav.js';
import { movesCols, stockDetail } from './Stock.jsx';
import { openProduct } from './Products.jsx';
import { openOrder } from './Sales.jsx';

export const qf = { q: '', status: '', page: 1, productId: '' };
const SER_ST = ['Available', 'Reserved', 'Sold', 'Returned', 'Damaged', 'InBuild', 'Missing', 'WrittenOff'];

export default function Serial() {
  if (S.sq) { Object.assign(qf, { q: '', status: '', page: 1, productId: '' }, S.sq); S.sq = null; }
  const [f, set] = useFilter(qf);
  const [r] = useList('serial.list', f);
  const q = useDebounced(v => set('q', v));
  return <Box>
    <PageHead title={LI('serial')}><Button variant="contained" startIcon={<QrCodeScannerIcon />} onClick={() => go('scan')}>{LT('scan')}</Button></PageHead>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder="Serial / Item ID / Product / Order" defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.status} displayEmpty onChange={e => set('status', e.target.value)} sx={{ minWidth: 150, bgcolor: '#fff' }}><MenuItem value="">{LT('all')}</MenuItem>{SER_ST.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select>
      {f.productId && <Chip label={f.productId} onDelete={() => set('productId', '')} />}
    </Stack>
    {!r ? <Skel /> : <><DataTable rows={r.rows} empty="No items found" onRow={i => openItem(i.itemId)} cols={[{ h: LT('itemid'), k: i => <b>{i.itemId}</b> }, { h: LT('serialno'), k: i => i.serial || '-' }, { h: LT('products'), k: i => i.productName }, { h: LT('status'), k: i => <Pill s={i.status} /> }, { h: 'Ref', k: i => i.orderId || i.buildId || i.purchaseId }]} /><Pager res={r} onPage={p => set('page', p)} /></>}
  </Box>;
}
export async function openItem(code) {
  let i; try { i = await api('serial.item', { code }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); }
  openDialog(i.serial || i.itemId, () => <>
    <Grid cols={2} sx={{ mb: 2 }}>
      <Stat label={LT('products')} value={<span style={{ fontSize: 15 }}>{i.productName}</span>} />
      <Stat label={LT('status')} value={<Pill s={i.status} />} />
      <Stat label={`${LT('itemid')} / ${LT('barcode')}`} value={<span style={{ fontSize: 15 }}>{i.itemId} / {i.barcode}</span>} />
      <Stat label="Purchase / Order / Build" value={<span style={{ fontSize: 15 }}>{i.purchaseId} {i.orderId} {i.buildId}</span>} />
    </Grid>
    <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{LI('moves')}</Typography>
    <DataTable rows={i.history} cols={movesCols} empty="No movements yet" />
  </>, { maxWidth: 'lg', actions: close => <><Button startIcon={<PrintIcon />} onClick={() => { close(); go('print', { itemIds: [i.itemId] }); }}>{LT('printsticker')}</Button>{i.orderId && <Button onClick={() => { close(); openOrder(i.orderId); }}>Order</Button>}</> });
}

/* ---------- Scan page ---------- */
export function ScanResult({ r }) {
  if (r.kind === 'UNKNOWN') return <Card sx={{ mt: 2 }}><CardContent>
    <Typography variant="h6">Not registered: <code>{r.code}</code></Typography><Typography sx={{ mb: 1 }}>This code is not in the system.</Typography>
    {isAdmin() || S.boot.staffAddProduct ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => openProduct(null, { Barcode: r.code })}>Register new product with this barcode</Button> : <Note>Ask Admin to register this product, or enter the item through <b>New Purchase</b> if it is a serial number.</Note>}
    <Box sx={{ mt: 1 }}><Button variant="outlined" onClick={() => go('purchase', { new: 1, serial: r.code })}>{LT('newpurchase')}</Button></Box>
  </CardContent></Card>;
  const p = r.product, s = p.stock, it = r.item;
  return <Card sx={{ mt: 2 }}><CardContent>
    <Stack direction="row" gap={2} alignItems="center"><Thumb id={p.ProductID} size={64} /><Box><Typography variant="h6" fontWeight={800}>{p.Name}</Typography><Typography variant="caption">{p.Category} · {p.Brand} {p.Model} · {TRK[p.TrackingType]}</Typography></Box></Stack>
    {it && <Alert severity="info" sx={{ mt: 1 }}><b>{it.serial || it.itemId}</b> ({it.itemId}) <Pill s={it.status} /> {it.orderId ? ' · ' + it.orderId : ''}{it.buildId ? ' · ' + it.buildId : ''}</Alert>}
    <Grid cols={4} sx={{ my: 1.5 }}>{[['available', s.available], ['reserved', s.reserved], ['physical', s.physical], ['damaged', s.damaged]].map(x => <Stat key={x[0]} label={LI(x[0])} value={nf(x[1])} />)}</Grid>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Button variant="contained" onClick={() => go('sales', { new: 1, productId: p.ProductID, itemId: it ? it.itemId : '' })}>{LT('neworder')}</Button>
      <Button variant="outlined" onClick={() => stockDetail(p.ProductID)}>{LT('stock')}</Button>
      <Button variant="outlined" onClick={() => openProduct(p.ProductID)}>{LT('products')}</Button>
      <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => go('print', it ? { itemIds: [it.itemId] } : { productIds: [p.ProductID] })}>Print</Button>
    </Stack>
  </CardContent></Card>;
}
export function Scan() {
  const [v, setV] = useState(''), [r, setR] = useState(null), inp = useRef(null);
  const run = async code => { code = (code || '').trim(); if (!code) return; try { const x = await api('scan', { code }, { loader: true }); setR(x); setV(''); inp.current && inp.current.focus(); } catch (e) { toast(e.message, 'bad'); } };
  return <Box>
    <PageHead title={LI('scan')} />
    <Card><CardContent sx={{ textAlign: 'center' }}>
      <QrCodeScannerIcon sx={{ fontSize: 52, color: 'primary.main' }} />
      <Typography fontWeight={800}>{LT('scanbarcode')} / {LT('scanserial')}</Typography>
      <TextField inputRef={inp} autoFocus value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') run(v); }} placeholder="Barcode / Serial / Item ID" autoComplete="off" sx={{ maxWidth: 380, width: '100%', my: 1 }} inputProps={{ style: { textAlign: 'center', fontSize: 17 } }} />
      <Stack direction="row" gap={1} justifyContent="center"><Button variant="contained" onClick={() => run(v)}>OK</Button><Button variant="outlined" startIcon={<CameraAltIcon />} onClick={() => openScanner(run, LT('scan'))}>Camera</Button></Stack>
    </CardContent></Card>
    {r && <ScanResult r={r} />}
  </Box>;
}
