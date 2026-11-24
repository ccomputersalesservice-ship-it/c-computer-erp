import React, { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography, Chip, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import { api, S, nf, isAdmin, LI, LT, rid, toast, work, TRK } from '../lib/core.js';
import { PageHead, Skel, Pager, Thumb, DataTable, Stat, Grid, openDialog, Loading } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { go, refresh } from '../lib/nav.js';
import { catItems } from './Products.jsx';

export const sf = { q: '', category: '', low: false, page: 1, tab: 'stock', mtype: '', mq: '', mpage: 1 };
const MOVE_TYPES = ['PURCHASE_IN', 'OPENING_IN', 'RESERVE', 'RELEASE', 'DELIVER', 'RETURN_IN', 'INSPECT_OK', 'INSPECT_DAMAGED', 'DAMAGE', 'WRITE_OFF', 'BUILD_USE', 'BUILD_RELEASE', 'BUILD_SOLD', 'ADJUST_PLUS', 'ADJUST_MINUS'];

export default function Stock() {
  const [tab, setTab] = useState(sf.tab);
  return <Box>
    <PageHead title={LI('stock')} />
    <Tabs value={tab} onChange={(e, v) => { sf.tab = v; setTab(v); }} sx={{ mb: 2 }}><Tab value="stock" label={LI('stock')} /><Tab value="moves" label={LI('moves')} /></Tabs>
    {tab === 'stock' ? <StockTab /> : <MovesTab />}
  </Box>;
}
function StockTab() {
  const [f, set] = useFilter(sf);
  const [r] = useList('stock.list', f);
  const q = useDebounced(v => set('q', v));
  return <>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder={LT('search')} defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.category} displayEmpty onChange={e => set('category', e.target.value)} sx={{ minWidth: 150, bgcolor: '#fff' }}>{catItems(true)}</Select>
      <FormControlLabel control={<Checkbox checked={f.low} onChange={e => set('low', e.target.checked)} />} label={LT('lowstock')} />
    </Stack>
    {!r ? <Skel /> : <>
      <Grid cols={4} sx={{ mb: 2 }}>{[['physical', r.totals.physical], ['available', r.totals.available], ['reserved', r.totals.reserved], ['damaged', r.totals.damaged]].map(x => <Stat key={x[0]} label={LI(x[0])} value={nf(x[1])} />)}</Grid>
      <DataTable rows={r.rows} onRow={x => stockDetail(x.ProductID)} cols={[
        { h: '', k: x => <Thumb id={x.ProductID} /> }, { h: LT('products'), k: x => <><b>{x.Name}</b><br /><small>{x.Category}</small></> },
        { h: LT('physical'), k: x => nf(x.stock.physical), align: 'right' },
        { h: LT('available'), k: x => <Chip size="small" color={x.ReorderLevel > 0 && x.stock.available <= x.ReorderLevel ? 'error' : 'success'} label={nf(x.stock.available)} />, align: 'right' },
        { h: LT('reserved'), k: x => nf(x.stock.reserved), align: 'right' }, { h: LT('sold'), k: x => nf(x.stock.sold), align: 'right' }, { h: LT('returned'), k: x => nf(x.stock.returned), align: 'right' }, { h: LT('damaged'), k: x => nf(x.stock.damaged), align: 'right' }]} />
      <Pager res={r} onPage={p => set('page', p)} />
    </>}
  </>;
}
export const movesCols = [{ h: LT('date'), k: m => m.dt.slice(0, 16), nw: true }, { h: LT('products'), k: m => <>{m.product}{m.serial ? <><br /><small>{m.serial}</small></> : m.itemId ? <><br /><small>{m.itemId}</small></> : null}</> }, { h: 'Type', k: m => <Chip size="small" label={m.type} /> }, { h: LT('qty'), k: m => nf(m.qty), align: 'right' }, { h: 'Prev → New', k: m => `${m.prev} → ${m.next}`, align: 'right' }, { h: 'Ref', k: m => m.ref }, { h: 'Staff', k: m => m.staff }];
function MovesTab() {
  const [f, , setMany] = useFilter(sf);
  const [r] = useList('stock.moves', { q: f.mq, type: f.mtype, page: f.mpage });
  const q = useDebounced(v => setMany({ mq: v, mpage: 1 }));
  return <>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder="Product / Serial / Order / Staff" defaultValue={f.mq} onChange={e => q(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.mtype} displayEmpty onChange={e => setMany({ mtype: e.target.value, mpage: 1 })} sx={{ minWidth: 180, bgcolor: '#fff' }}><MenuItem value="">{LT('all')}</MenuItem>{MOVE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select>
    </Stack>
    {!r ? <Skel /> : <><DataTable rows={r.rows} cols={movesCols} empty="No movements yet" /><Pager res={r} onPage={p => setMany({ mpage: p })} /></>}
  </>;
}
export async function stockDetail(id) {
  let p, mv;
  try { p = await api('prod.get', { id }, { loader: true }); mv = await api('stock.moves', { productId: id, size: 15 }); } catch (e) { return toast(e.message, 'bad'); }
  const s = p.stock;
  const dl = openDialog(p.Name, () => <>
    <Grid cols={3} sx={{ mb: 2 }}>{[['physical', s.physical], ['available', s.available], ['reserved', s.reserved], ['sold', s.sold], ['returned', s.returned], ['damaged', s.damaged]].map(x => <Stat key={x[0]} label={LI(x[0])} value={nf(x[1])} />)}</Grid>
    <Alert severity="info">{TRK[p.TrackingType]} · {LT('reorder')}: {p.ReorderLevel}{s.returned ? <> · <b>{s.returned} returned item(s) waiting for inspection</b></> : null}</Alert>
    <Typography variant="h6" fontWeight={800} sx={{ my: 1.5 }}>{LI('moves')}</Typography>
    <DataTable rows={mv.rows} cols={movesCols} empty="No movements yet" />
  </>, {
    maxWidth: 'lg', actions: close => <>
      <Button onClick={() => stockAdjust(p, 'stock.damage', 'Mark damaged', close)}>{LT('damaged')} −</Button>
      {isAdmin() && s.returned > 0 && <Button onClick={() => stockAdjust(p, 'stock.inspect', 'Inspect returned', close)}>Inspect returned</Button>}
      {isAdmin() && s.damaged > 0 && <Button onClick={() => stockAdjust(p, 'stock.writeoff', 'Write off damaged', close)}>Write off damaged</Button>}
      <Button onClick={() => { close(); S.sq = { productId: id }; go('serial'); }}>{LI('serial')}</Button>
      <Button startIcon={<PrintIcon />} onClick={() => { close(); go('print', { productIds: [id] }); }}>Print</Button>
    </>
  });
}
async function stockAdjust(p, action, title, closeParent) {
  let items = null;
  if (p.TrackingType !== 'QTY') {
    const st = action === 'stock.damage' ? 'Available' : action === 'stock.inspect' ? 'Returned' : 'Damaged';
    try { const r = await api('serial.list', { productId: p.ProductID, status: st, size: 100 }, { loader: true }); items = r.rows; } catch (e) { return toast(e.message, 'bad'); }
    if (!items.length) return toast('No items in status ' + st, 'bad');
  }
  const insp = action === 'stock.inspect';
  const v = { item: items ? items[0].itemId : '', qty: 1, res: 'OK', note: '' }, _rid = rid();
  openDialog(title, () => <AdjForm v={v} items={items} insp={insp} />, {
    maxWidth: 'xs', actions: close => <Button variant="contained" onClick={() => work(async () => {
      await api(action, { productId: p.ProductID, itemId: items ? v.item : undefined, qty: items ? 1 : v.qty, result: insp ? v.res : undefined, note: v.note }, { rid: _rid });
      toast('Done', 'ok'); close(); closeParent(); S.thumbs = {}; refresh();
    })}>{LT('save')}</Button>
  });
}
function AdjForm({ v, items, insp }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  return <Stack gap={2} sx={{ pt: 1 }}>
    {items ? <TextField select label="Item" value={v.item} onChange={e => set('item', e.target.value)}>{items.map(i => <MenuItem key={i.itemId} value={i.itemId}>{(i.serial || i.itemId) + ' (' + i.itemId + ')'}</MenuItem>)}</TextField>
      : <TextField label={LT('qty')} type="number" inputProps={{ min: 1 }} value={v.qty} onChange={e => set('qty', e.target.value)} />}
    {insp && <TextField select label="Result" value={v.res} onChange={e => set('res', e.target.value)}><MenuItem value="OK">OK - make Available</MenuItem><MenuItem value="DAMAGED">Damaged</MenuItem></TextField>}
    <TextField label="Reason / Note" value={v.note} onChange={e => set('note', e.target.value)} />
  </Stack>;
}
