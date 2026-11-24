import React, { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api, S, inr, nf, LI, LT, rid, toast, work } from '../lib/core.js';
import { PageHead, Skel, Pager, DataTable, Pill, openDialog } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { refresh } from '../lib/nav.js';
import { openOrder } from './Sales.jsx';

export const cf = { q: '', page: 1 };
export default function Customers() {
  const [f, set] = useFilter(cf);
  const [r] = useList('cust.list', f);
  const q = useDebounced(v => set('q', v));
  return <Box>
    <PageHead title={LI('customers')}><Button variant="contained" startIcon={<AddIcon />} onClick={() => openCustomer(null)}>{LT('add')}</Button></PageHead>
    <TextField placeholder={`${LT('name')} / ${LT('mobile')}`} defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ mb: 2, width: '100%', maxWidth: 420, bgcolor: '#fff' }} />
    {!r ? <Skel /> : <><DataTable rows={r.rows} empty="No customers yet" onRow={c => openCustomer(c.id)} cols={[{ h: 'ID', k: c => c.id }, { h: LT('name'), k: c => <b>{c.name}</b> }, { h: LT('mobile'), k: c => c.mobile }, { h: LT('address'), k: c => c.address }, { h: LT('orders'), k: c => nf(c.orders), align: 'right' }]} /><Pager res={r} onPage={p => set('page', p)} /></>}
  </Box>;
}
export async function openCustomer(id) {
  let c = { name: '', mobile: '', address: '' }, orders = null;
  if (id) { try { const l = await api('cust.list', { q: id, size: 5 }, { loader: true }); c = l.rows.find(x => x.id === id) || c; orders = await api('ord.list', { customerId: id, size: 10 }); } catch (e) { return toast(e.message, 'bad'); } }
  const v = { name: c.name, mobile: c.mobile, address: c.address }, _rid = rid();
  openDialog(id ? c.name : LT('add'), () => <CustForm v={v} id={id} orders={orders} />, {
    maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => { await api('cust.save', { name: v.name, mobile: id ? c.mobile : v.mobile, address: v.address }, { rid: _rid }); toast('Saved', 'ok'); close(); if (S.route === 'customers') refresh(); })}>{LT('save')}</Button>
  });
}
function CustForm({ v, id, orders }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  return <Stack gap={2} sx={{ pt: 1 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth label={LT('name') + ' *'} value={v.name} onChange={e => set('name', e.target.value)} /><TextField fullWidth label={LT('mobile') + ' *'} value={v.mobile} disabled={!!id} inputProps={{ inputMode: 'numeric', maxLength: 13 }} onChange={e => set('mobile', e.target.value)} /></Stack>
    <TextField label={LT('address')} value={v.address} onChange={e => set('address', e.target.value)} />
    {orders && <><Typography variant="h6" fontWeight={800}>{LI('orders')}</Typography><DataTable rows={orders.rows} empty="No orders" onRow={o => openOrder(o.orderId)} cols={[{ h: 'ID', k: o => o.orderId }, { h: LT('date'), k: o => o.date }, { h: LT('total'), k: o => inr(o.total), align: 'right' }, { h: LT('status'), k: o => <Pill s={o.status} /> }]} /></>}
  </Stack>;
}
