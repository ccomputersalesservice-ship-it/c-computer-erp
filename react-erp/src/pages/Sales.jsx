import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, TextField, Typography, Card, CardContent, IconButton, Chip, Alert, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SaveIcon from '@mui/icons-material/SaveAlt';
import { api, S, inr, nf, isAdmin, isAcct, seesPrice, LI, LT, rid, toast, work, dtm, shrinkImage, busy, TRK, STAT_KEY } from '../lib/core.js';
import { PageHead, Skel, Pager, Thumb, DataTable, Stat, Grid, Pill, openDialog, openScanner, ProductPicker, Empty, confirmBox, Note } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { go, refresh } from '../lib/nav.js';
import { pickFiles } from './Purchase.jsx';
import { printInvoice, invoiceHtml, docPdfWa } from '../docs/invoice.jsx';

export const of_ = { q: '', status: '', page: 1 };
const ORD_ST = ['Pending', 'Reserved', 'Processing', 'Ready', 'Delivered', 'Cancelled', 'Returned'];
const FREE = {};
export async function freeItems(pid) { if (!FREE[pid]) FREE[pid] = await api('serial.free', { productId: pid }); return FREE[pid]; }

export default function Sales({ params }) {
  if (params.new) return <OrderForm params={params} />;
  return <SalesList />;
}
function SalesList() {
  const [f, set] = useFilter(of_);
  const [r] = useList('ord.list', f);
  const q = useDebounced(v => set('q', v));
  return <Box>
    <PageHead title={LI('sales')}><Button variant="contained" startIcon={<AddIcon />} onClick={() => go('sales', { new: 1 })}>{LT('neworder')}</Button></PageHead>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder={`${LT('name')} / ${LT('mobile')} / Order / Serial`} defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.status} displayEmpty onChange={e => set('status', e.target.value)} sx={{ minWidth: 150, bgcolor: '#fff' }}><MenuItem value="">{LT('all')}</MenuItem>{ORD_ST.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select>
    </Stack>
    {!r ? <Skel /> : <><DataTable rows={r.rows} empty="No orders found" onRow={o => openOrder(o.orderId)} cols={[
      { h: '', k: o => <Thumb id={o.productIds[0]} /> }, { h: 'Order ID', k: o => <><b>{o.orderId}</b><br /><small>{dtm(o.date, o.at)}</small></> },
      { h: LT('customers'), k: o => <>{o.customer}<br /><small>{o.mobile}</small></> }, { h: LT('products'), k: o => <>{o.first}{o.items > 1 && <small> +{o.items - 1}</small>}</> },
      { h: LT('total'), k: o => seesPrice() ? (o.pricePending ? <Chip size="small" color="warning" label="Price pending" /> : inr(o.total)) : (o.pricePending ? <Chip size="small" color="warning" label="Waiting for Accounts" /> : <Chip size="small" color="success" label="Priced" />), align: 'right' },
      { h: 'Staff', k: o => o.staff }, { h: LT('status'), k: o => <Pill s={o.status} /> }]} /><Pager res={r} onPage={p => set('page', p)} /></>}
  </Box>;
}

/* ---------- new order ---------- */
function OrderForm({ params }) {
  const RID = useRef(rid());
  const [c, setC] = useState({ mobile: '', name: '', address: '', id: null }), [found, setFound] = useState(null);
  const [lines, setLines] = useState([]), [st, setSt] = useState('Reserved'), [note, setNote] = useState(''), [, setN] = useState(0);
  const linesRef = useRef(lines); linesRef.current = lines;
  useEffect(() => { Object.keys(FREE).forEach(k => delete FREE[k]); }, []);
  const addLine = async (p, item) => {
    const ls = linesRef.current;
    if (p.TrackingType === 'QTY') {
      const i = ls.findIndex(l => l.productId === p.ProductID);
      if (i >= 0) { setLines(ls.map((l, j) => j === i ? { ...l, qty: +l.qty + 1 } : l)); return; }
      setLines(ls.concat([{ productId: p.ProductID, name: p.Name, tr: 'QTY', qty: 1, price: p.SellPrice || '', itemId: '' }]));
    } else {
      const itemId = item ? item.itemId : '';
      if (itemId && ls.some(l => l.itemId === itemId)) return toast('This item is already added', 'bad');
      await freeItems(p.ProductID);
      setLines(linesRef.current.concat([{ productId: p.ProductID, name: p.Name, tr: p.TrackingType, qty: 1, price: p.SellPrice || '', itemId }]));
    }
  };
  useEffect(() => { if (params.productId) { const pid = params.productId, it = params.itemId; params.productId = ''; params.itemId = ''; api('prod.get', { id: pid }).then(p => addLine({ ProductID: p.ProductID, Name: p.Name, TrackingType: p.TrackingType, SellPrice: p.SellPrice }, it ? { itemId: it } : null)).catch(() => { }); } }, []);
  const mobSearch = useDebounced(async v => { const d = v.replace(/\D/g, ''); if (d.length < 4) return setFound(null); try { setFound(await api('cust.search', { q: d })); } catch (e) { } });
  const upd = (i, k, v) => setLines(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const photo = async i => {
    const l = lines[i]; const fs = await pickFiles(true); if (!fs.length) return;
    busy(true);
    try {
      const url = await shrinkImage(fs[0], 1600, 0.8);
      const r = await api('serial.photo', { dataUrl: url, productId: l.productId });
      if (r.matches.length) { upd(i, 'itemId', r.matches[0].itemId); toast('Serial found: ' + (r.matches[0].serial || r.matches[0].itemId), 'ok'); }
      else toast(r.tokens.length ? 'Not in stock. Photo shows: ' + r.tokens.join(', ') : 'Serial not found in the photo. Try a closer photo.', 'bad');
    } catch (e) { toast(e.message, 'bad'); } finally { busy(false); }
  };
  const scan = i => openScanner(code => { const l = linesRef.current[i], f = (FREE[l.productId] || []).find(x => x.serial.toUpperCase() === code.toUpperCase() || x.itemId.toUpperCase() === code.toUpperCase() || x.barcode === code); if (!f) return toast('This code is not an available item of this product', 'bad'); if (linesRef.current.some((x, j) => j !== i && x.itemId === f.itemId)) return toast('Already added', 'bad'); upd(i, 'itemId', f.itemId); }, LT('scanserial'));
  const save = () => work(async () => {
    const body = { customerId: c.id && c.name ? c.id : undefined, customer: { name: c.name, mobile: c.mobile, address: c.address }, status: st, note, lines: lines.map(l => ({ productId: l.productId, qty: +l.qty, itemId: l.itemId || undefined, unitPrice: l.price === '' ? undefined : +l.price })) };
    if (!lines.length) throw new Error('Add at least one product.');
    const r = await api('ord.create', body, { rid: RID.current }); RID.current = rid(); S.thumbs = {};
    toast('Order ' + r.orderId + ' saved', 'ok'); go('sales');
  });
  const tot = isAdmin() ? LT('total') + ': ' + inr(lines.reduce((a, l) => a + (+l.qty || 0) * (+l.price || 0), 0)) : 'Products: ' + lines.length + ' · Accounts will add the price';
  return <Box>
    <PageHead title={LI('neworder')}><Button variant="outlined" onClick={() => go('sales')}>{LT('cancel')}</Button></PageHead>
    <Card><CardContent>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{LI('customers')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <TextField fullWidth label={LT('mobile') + ' *'} placeholder="10 digit mobile" inputProps={{ inputMode: 'numeric', maxLength: 13 }} value={c.mobile} onChange={e => { setC({ ...c, mobile: e.target.value }); mobSearch(e.target.value); }} />
        <TextField fullWidth label={LT('name') + ' *'} value={c.name} onChange={e => setC({ ...c, name: e.target.value })} />
        <TextField fullWidth label={LT('address')} value={c.address} onChange={e => setC({ ...c, address: e.target.value })} />
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>{c.id ? <Chip color="success" label={'✓ ' + c.id} /> : found && found.map(x => <Button key={x.id} size="small" variant="outlined" onClick={() => { setC({ id: x.id, mobile: x.mobile, name: x.name, address: x.address || '' }); setFound(null); }}>{x.name} · {x.mobile}</Button>)}</Stack>
    </CardContent></Card>
    <Card sx={{ mt: 2 }}><CardContent>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{LT('products')}</Typography>
      <ProductPicker placeholder="Search product or scan barcode / serial to add" onPick={addLine} />
      <Box sx={{ mt: 2 }}>{lines.length ? lines.map((l, i) => { const used = lines.filter((x, j) => j !== i).map(x => x.itemId); return <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1.2 }}>
        <Stack direction="row" gap={1.5} alignItems="center"><Thumb id={l.productId} /><Box sx={{ flex: 1 }}><b>{l.name}</b><br /><Chip size="small" label={TRK[l.tr]} /></Box><IconButton color="error" onClick={() => setLines(ls => ls.filter((x, j) => j !== i))}><CloseIcon /></IconButton></Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 1.5 }} alignItems={{ sm: 'center' }}>
          {l.tr === 'QTY' ? <TextField type="number" label={LT('qty')} inputProps={{ min: 1 }} value={l.qty} onChange={e => upd(i, 'qty', e.target.value)} />
            : <><TextField select fullWidth label={`${LT('serialno')} / ${LT('itemid')}`} value={l.itemId} onChange={e => upd(i, 'itemId', e.target.value)}><MenuItem value="">-- choose --</MenuItem>{(FREE[l.productId] || []).filter(f => f.itemId === l.itemId || used.indexOf(f.itemId) < 0).map(f => <MenuItem key={f.itemId} value={f.itemId}>{(f.serial || f.itemId) + (f.serial ? ' (' + f.itemId + ')' : '')}</MenuItem>)}</TextField>
              <Stack direction="row" gap={1}><IconButton onClick={() => scan(i)}><QrCodeScannerIcon /></IconButton><Button size="small" variant="outlined" onClick={() => photo(i)}>Photo</Button></Stack></>}
          {isAdmin() && <TextField type="number" label={LT('price') + ' ₹'} inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }} value={l.price} onChange={e => upd(i, 'price', e.target.value)} />}
        </Stack>
      </Paper>; }) : <Empty>Search or scan a product to add it</Empty>}</Box>
    </CardContent></Card>
    <Card sx={{ mt: 2 }}><CardContent><Stack gap={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField select fullWidth label={LT('status')} value={st} onChange={e => setSt(e.target.value)}><MenuItem value="Reserved">Reserved (hold stock now)</MenuItem><MenuItem value="Pending">Pending (no stock held yet)</MenuItem></TextField><TextField fullWidth label="Note" value={note} onChange={e => setNote(e.target.value)} /></Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}><Typography variant="h6" fontWeight={800}>{tot}</Typography><Button variant="contained" color="success" size="large" startIcon={<SaveIcon />} onClick={save}>{LT('save')}</Button></Stack>
    </Stack></CardContent></Card>
  </Box>;
}

/* ---------- open order: prices, invoice, status ---------- */
export async function openOrder(id) {
  let o; try { o = await api('ord.get', { id }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); }
  const needAssign = o.status === 'Pending' && o.lines.some(l => l.tracking !== 'QTY' && !l.itemId);
  const free = {};
  if (needAssign) { for (const l of o.lines) if (l.tracking !== 'QTY' && !l.itemId) { try { free[l.productId] = await freeItems(l.productId); } catch (e) { free[l.productId] = []; } } }
  const v = { price: {}, assign: {} }; o.lines.forEach(l => { v.price[l.lineId] = l.unitPrice ? l.unitPrice : ''; });
  const _rid = rid();
  const after = close => { close(); S.thumbs = {}; if (S.route === 'sales' || S.route === 'dash') refresh(); };
  const setStatus = async (st, close) => {
    if (['Cancelled', 'Delivered', 'Returned'].includes(st) && !(await confirmBox(`${st}: ${o.orderId}?`))) return;
    work(async () => { await api('ord.status', { orderId: o.orderId, status: st, assign: v.assign, note: '' }, { rid: _rid + st }); toast(o.orderId + ' → ' + st, 'ok'); after(close); });
  };
  openDialog(<>{o.orderId} <Pill s={o.status} /></>, () => <OrderView o={o} v={v} needAssign={needAssign} free={free} />, {
    maxWidth: 'lg', actions: close => <>
      {seesPrice() && o.status !== 'Cancelled' && <>
        <Button variant="contained" sx={{ bgcolor: '#16a34a' }} onClick={() => work(() => docPdfWa(invoiceHtml(o), ((o.customer || {}).name ? o.customer.name + ' - ' : '') + 'Invoice ' + o.orderId, (o.customer || {}).mobile, `Namaste ${(o.customer || {}).name || ''}, C COMPUTER thi tamaru bill (${o.orderId}) mokli chhe. Total ₹${Math.round(+o.total || 0)}. Aabhar! – C COMPUTER, 8160088439`))}>📲 WhatsApp PDF</Button>
        <Button variant="contained" sx={{ bgcolor: '#0b1f4b', color: '#f5b800' }} onClick={() => printInvoice(o)}>🖨 Print Invoice (A4)</Button>
        <Button variant="contained" color="success" startIcon={<SaveIcon />} onClick={() => work(async () => { const lines = o.lines.map(l => ({ lineId: l.lineId, unitPrice: v.price[l.lineId] === '' ? 0 : +v.price[l.lineId] })); await api('ord.price', { orderId: o.orderId, lines }, { rid: _rid + 'P' + Date.now() }); toast('Price saved', 'ok'); after(close); })}>Save price</Button>
      </>}
      {(isAcct() ? [] : o.next).length ? (isAcct() ? [] : o.next).map(s => <Button key={s} variant="contained" color={s === 'Cancelled' ? 'error' : s === 'Delivered' ? 'success' : 'inherit'} onClick={() => setStatus(s, close)}>{LI(STAT_KEY[s])}</Button>) : <Typography variant="body2" color="text.secondary">No further status change</Typography>}
      {isAdmin() && o.status === 'Cancelled' && <Button variant="contained" color="error" onClick={async () => { if (!(await confirmBox(`Delete ${o.orderId}? It will be removed from the Sales list. The record is kept safely for audit.`))) return; work(async () => { await api('ord.delete', { orderId: o.orderId }, { rid: rid() }); toast(o.orderId + ' deleted', 'ok'); after(close); }); }}>🗑 Delete order</Button>}
    </>
  });
}
function OrderView({ o, v, needAssign, free }) {
  const [, setN] = useState(0);
  const tot = o.lines.reduce((a, l) => a + (+v.price[l.lineId] || 0) * (+l.qty || 0), 0);
  return <>
    <Grid cols={4} sx={{ mb: 2 }}><Stat label={LT('customers')} value={<span style={{ fontSize: 15 }}>{o.customer.name}</span>} /><Stat label={LT('mobile')} value={<span style={{ fontSize: 15 }}>{o.customer.mobile}</span>} /><Stat label={LT('date')} value={<span style={{ fontSize: 15 }}>{dtm(o.date, o.at)}</span>} /><Stat label="Staff" value={<span style={{ fontSize: 15 }}>{o.staff}</span>} /></Grid>
    <DataTable rows={o.lines} cols={[{ h: '', k: l => <Thumb id={l.productId} /> }, { h: LT('products'), k: l => <><b>{l.name}</b><br /><small>{l.model}</small></> },
      { h: LT('serialno') + ' / ID', k: l => l.tracking === 'QTY' ? '-' : l.itemId ? <>{l.serial || l.itemId}<br /><small>{l.itemId}</small></> : needAssign ? <TextField select size="small" sx={{ minWidth: 160 }} value={v.assign[l.lineId] || ''} onChange={e => { v.assign[l.lineId] = e.target.value; setN(n => n + 1); }}><MenuItem value="">-- choose --</MenuItem>{(free[l.productId] || []).map(f => <MenuItem key={f.itemId} value={f.itemId}>{f.serial || f.itemId}</MenuItem>)}</TextField> : '-' },
      { h: LT('qty'), k: l => nf(l.qty), align: 'right' }].concat(seesPrice() ? [{ h: LT('price') + ' ₹', k: l => <TextField size="small" type="number" sx={{ width: 120 }} inputProps={{ min: 0, step: 0.01, inputMode: 'decimal', style: { textAlign: 'right' } }} value={v.price[l.lineId]} placeholder={l.suggested ? String(l.suggested) : 'price'} onChange={e => { v.price[l.lineId] = e.target.value; setN(n => n + 1); }} />, align: 'right' }] : [])} />
    {seesPrice() ? <Typography align="right" variant="h6" fontWeight={800} sx={{ mt: 1 }}>{LT('total')}: {inr(tot)}</Typography> : <Alert severity="info" sx={{ mt: 1 }}>Price will be added by Accounts.</Alert>}
    {o.note && <Note>{o.note}</Note>}
  </>;
}
