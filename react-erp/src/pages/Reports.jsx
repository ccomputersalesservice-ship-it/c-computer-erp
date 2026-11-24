import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography, Tab, Tabs, Alert, Chip, LinearProgress, Paper } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { api, S, inr, nf, isAdmin, LI, LT, toast, todayStr, csvDownload } from '../lib/core.js';
import { PageHead, Skel, DataTable, Stat, Grid, Section } from '../lib/ui.jsx';
import { go } from '../lib/nav.js';

const RT = [['daily', 'Daily Summary', 'દૈનિક સારાંશ', 'A'], ['checks', 'Business Check', 'બિઝનેસ ચેક', 'A'], ['vendors', 'Vendor Prices', 'વેન્ડર ભાવ', 'A'], ['ageing', 'Stock Ageing', 'સ્ટોક ઉંમર', ''], ['sales', 'Sales Report', 'વેચાણ રિપોર્ટ', 'A'], ['purchase', 'Purchase Report', 'ખરીદી રિપોર્ટ', 'A'], ['stock', 'Stock Summary', 'સ્ટોક સારાંશ', ''], ['reorder', 'Low Stock / Reorder', 'ઓછો સ્ટોક / રીઓર્ડર', ''], ['movement', 'Fast / Slow / Dead Stock', 'ફાસ્ટ / સ્લો / ડેડ સ્ટોક', 'A']];
const Csv = ({ n, h, rows }) => <Button size="small" variant="outlined" startIcon={<DownloadIcon />} sx={{ mb: 1 }} onClick={() => csvDownload(n, h, rows)}>CSV</Button>;

export default function Reports({ params }) {
  const [tab, setTab] = useState(params.tab || (isAdmin() ? 'daily' : 'stock'));
  return <Box>
    <PageHead title={LI('reports')} />
    <Tabs value={tab} variant="scrollable" scrollButtons="auto" onChange={(e, v) => { params.tab = v; setTab(v); }} sx={{ mb: 2 }}>{RT.filter(r => isAdmin() || !r[3]).map(r => <Tab key={r[0]} value={r[0]} label={S.lang === 'gu' ? r[2] : r[1]} />)}</Tabs>
    <Body key={tab} tab={tab} params={params} setTab={t => { params.tab = t; setTab(t); }} />
  </Box>;
}
function useApi(action, payload, dep) {
  const [r, setR] = useState(null);
  useEffect(() => { let on = true; setR(null); api(action, payload, { loader: true }).then(x => on && setR(x), e => { toast(e.message, 'bad'); on && setR({ __err: e.message }); }); return () => { on = false; }; }, [JSON.stringify(payload), dep]);
  return r;
}
function Range({ params, children }) {
  const mon = todayStr().slice(0, 8) + '01';
  const [f, setF] = useState(params.rf || mon), [t, setT] = useState(params.rt || todayStr()), [q, setQ] = useState({ f: params.rf || mon, t: params.rt || todayStr() });
  return <><Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}><TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={f} onChange={e => setF(e.target.value)} /><TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={t} onChange={e => setT(e.target.value)} /><Button variant="contained" onClick={() => { params.rf = f; params.rt = t; setQ({ f, t }); }}>Show</Button></Stack>{children(q.f, q.t)}</>;
}
function Body({ tab, params, setTab }) {
  if (tab === 'daily') return <Daily params={params} setTab={setTab} />;
  if (tab === 'checks') return <Checks />;
  if (tab === 'vendors') return <Vendors />;
  if (tab === 'ageing') return <Ageing />;
  if (tab === 'sales') return <Range params={params}>{(f, t) => <SalesRep f={f} t={t} />}</Range>;
  if (tab === 'purchase') return <Range params={params}>{(f, t) => <PurRep f={f} t={t} />}</Range>;
  if (tab === 'stock') return <StockRep />;
  if (tab === 'reorder') return <Reorder />;
  if (tab === 'movement') return <Movement />;
  return null;
}
function Daily({ params, setTab }) {
  const [d, setD] = useState(params.rd || ''), [q, setQ] = useState(params.rd || '');
  const r = useApi('rep.daily', { date: q });
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  const m = r.month;
  return <Stack gap={2}>
    <Stack direction="row" gap={1}><TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={d || r.date} onChange={e => setD(e.target.value)} /><Button variant="contained" onClick={() => { params.rd = d; setQ(d); }}>Show</Button></Stack>
    <Grid cols={3}><Stat label="Sales (delivered)" value={<>{inr(r.sales)} <Typography variant="caption">{r.orders} orders</Typography></>} /><Stat label="Profit (priced items)" value={<span style={{ color: '#16a34a' }}>{inr(r.profit)}</span>} /><Stat label="Purchase received" value={<>{inr(r.purchase)} <Typography variant="caption">{r.purchaseBills} bills</Typography></>} /></Grid>
    <Grid cols={3}><Stat label="Quotations made" value={<>{r.quotes} <Typography variant="caption">{inr(r.quoteValue)} · {r.converted} converted</Typography></>} /><Stat label="Open sales orders" value={r.openOrders} /><Stat label="Low stock products" value={r.lowStock} /></Grid>
    <Section title="This month target"><LinearProgress variant="determinate" value={Math.min(100, m.pct)} color="warning" sx={{ height: 12, borderRadius: 8 }} /><Typography sx={{ mt: 1 }}>{inr(m.achieved)} of {inr(m.target)} ({m.pct}%). Need {inr(m.perDay)} per day for {m.daysLeft} days.</Typography></Section>
    {r.issues ? <Alert severity="warning" action={<Button size="small" onClick={() => setTab('checks')}>Open Business Check</Button>}>{r.issues} things need your attention ({r.high} important).</Alert> : <Alert severity="info">No problems found today.</Alert>}
    <Typography variant="h6" fontWeight={800}>Top selling today</Typography>
    <DataTable rows={r.top} empty="No delivered sale on this date" cols={[{ h: 'Product', k: x => x.name }, { h: 'Qty', k: x => x.qty, align: 'right' }]} />
  </Stack>;
}
function Checks() {
  const r = useApi('rep.checks', {});
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  if (!r.checks.length) return <Alert severity="info">All good. No problem found.</Alert>;
  return <Stack gap={1.5}><Alert severity={r.high ? 'warning' : 'info'}>{r.total} items need action ({r.high} important). Nothing is changed automatically.</Alert>
    {r.checks.map((c, i) => <Section key={i} title={<>{c.sev === 'high' ? '🔴' : c.sev === 'mid' ? '🟠' : '🟡'} {c.title} <Chip size="small" color={c.sev === 'high' ? 'error' : 'warning'} label={c.count} /></>}>
      <Typography variant="caption" color="text.secondary">{c.hint}</Typography><ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{c.rows.map((x, j) => <li key={j}>{x}</li>)}</ul>{c.count > c.rows.length && <small>and {c.count - c.rows.length} more</small>}
      {c.go && <Box sx={{ mt: 1 }}><Button size="small" variant="outlined" onClick={() => go(c.go)}>Open</Button></Box>}</Section>)}</Stack>;
}
function Vendors() {
  const r = useApi('rep.vendors', {});
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  return <><Alert severity="info" sx={{ mb: 1 }}>Based on received purchase bills. Cheapest vendor = lowest latest price. {r.multi} products are bought from more than one vendor.</Alert>
    <Csv n="vendor-prices.csv" h={['Product', 'Vendor', 'Last price', 'Last date', 'Lowest', 'Average', 'Times']} rows={r.rows.flatMap(x => x.vendors.map(v => [x.name, v.vendor, v.last, v.lastDate, v.min, v.avg, v.n]))} />
    <DataTable rows={r.rows} empty="No purchases yet" cols={[{ h: 'Product', k: x => <><b>{x.name}</b><br /><small>{x.category}</small></> }, { h: 'Vendors (latest price)', k: x => x.vendors.map((v, i) => <div key={i} style={v.vendor === x.best && x.vendors.length > 1 ? { color: '#16a34a', fontWeight: 700 } : undefined}>{v.vendor}: {inr(v.last)} <small>({v.lastDate}{v.min !== v.max ? `, ${inr(v.min)}–${inr(v.max)}` : ''})</small></div>) }, { h: 'Note', k: x => x.vendors.length < 2 ? <small>one vendor</small> : x.payMore > 0 ? <Chip size="small" color="warning" label={`Latest bought ${inr(x.payMore)} dearer than ${x.best}`} /> : <Chip size="small" color="success" label="Best price used" /> }]} /></>;
}
function Ageing() {
  const r = useApi('rep.ageing', {});
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  const T = r.totals, K = ['0-30', '31-60', '61-90', '90+'];
  return <><Grid cols={4} sx={{ mb: 2 }}>{K.map(k => <Stat key={k} label={k + ' days'} value={<>{nf(T[k])} pcs {r.value && <Typography variant="caption" display="block">{inr(r.value[k])} at cost</Typography>}</>} />)}</Grid>
    <Csv n="stock-ageing.csv" h={['Product', 'Qty', '0-30', '31-60', '61-90', '90+']} rows={r.rows.map(x => [x.name, x.qty, x.b['0-30'], x.b['31-60'], x.b['61-90'], x.b['90+']])} />
    <DataTable rows={r.rows} empty="No stock" cols={[{ h: 'Product', k: x => <><b>{x.name}</b><br /><small>{x.category}{x.unknown ? ' · purchase date unknown' : ''}</small></> }, { h: 'Qty', k: x => nf(x.qty), align: 'right' }, ...K.map(k => ({ h: k, k: x => x.b[k] ? (k === '90+' ? <Chip size="small" color="error" label={x.b[k]} /> : x.b[k]) : '', align: 'right' }))]} /></>;
}
function SalesRep({ f, t }) {
  const r = useApi('rep.sales', { from: f, to: t });
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  return <><Grid cols={3} sx={{ mb: 2 }}><Stat label="Delivered orders" value={r.orders} /><Stat label="Pieces sold" value={r.qty} /><Stat label={LT('totsales')} value={inr(r.amount)} /></Grid>
    <Csv n="sales.csv" h={['Product', 'Qty', 'Amount']} rows={r.rows.map(x => [x.name, x.qty, x.amount])} />
    <DataTable rows={r.rows} empty="No delivered sales in this period" cols={[{ h: LT('products'), k: x => x.name }, { h: LT('qty'), k: x => nf(x.qty), align: 'right' }, { h: 'Amount', k: x => inr(x.amount), align: 'right' }]} /></>;
}
function PurRep({ f, t }) {
  const r = useApi('rep.purchase', { from: f, to: t });
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  return <><Stat label={LT('totpurchase')} value={inr(r.amount)} /><Box sx={{ mt: 2 }} />
    <Csv n="purchase.csv" h={['Date', 'Vendor', 'Bill', 'Product', 'Qty', 'Price', 'Amount']} rows={r.rows.map(x => [x.date, x.vendor, x.billNo, x.product, x.qty, x.price, x.amount])} />
    <DataTable rows={r.rows} empty="No purchases in this period" cols={[{ h: LT('date'), k: x => x.date }, { h: LT('vendor'), k: x => x.vendor }, { h: LT('billno'), k: x => x.billNo }, { h: LT('products'), k: x => x.product }, { h: LT('qty'), k: x => nf(x.qty), align: 'right' }, { h: LT('price'), k: x => inr(x.price), align: 'right' }, { h: 'Amount', k: x => inr(x.amount), align: 'right' }]} /></>;
}
function StockRep() {
  const r = useApi('rep.stock', {});
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  return <><Csv n="stock-summary.csv" h={['Category', 'Products', 'Physical', 'Available', 'Reserved', 'Returned', 'Damaged']} rows={r.rows.map(x => [x.category, x.products, x.physical, x.available, x.reserved, x.returned, x.damaged])} />
    <DataTable rows={r.rows} empty="No stock yet" cols={[{ h: LT('category'), k: x => <b>{x.category}</b> }, { h: 'Products', k: x => x.products, align: 'right' }, { h: LT('physical'), k: x => nf(x.physical), align: 'right' }, { h: LT('available'), k: x => nf(x.available), align: 'right' }, { h: LT('reserved'), k: x => nf(x.reserved), align: 'right' }, { h: LT('returned'), k: x => nf(x.returned), align: 'right' }, { h: LT('damaged'), k: x => nf(x.damaged), align: 'right' }]} /></>;
}
function Reorder() {
  const r = useApi('rep.reorder', {});
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  return <><Csv n="reorder.csv" h={['Product', 'Current', 'Reorder level', 'Sold 30d', 'Suggested']} rows={r.map(x => [x.name, x.current, x.reorder, x.sold30, x.suggested])} />
    <DataTable rows={r} empty="No product is below its reorder level" cols={[{ h: LT('products'), k: x => <><b>{x.name}</b><br /><small>{x.category}</small></> }, { h: 'Current', k: x => x.current, align: 'right' }, { h: LT('reorder'), k: x => x.reorder, align: 'right' }, { h: 'Sold (30 days)', k: x => x.sold30, align: 'right' }, { h: 'Suggested qty', k: x => <Chip size="small" color="warning" label={x.suggested} />, align: 'right' }, { h: '', k: x => <Button size="small" variant="contained" onClick={() => go('purchase', { new: 1, productId: x.productId })}>{LT('newpurchase')}</Button>, align: 'right' }]} /></>;
}
function Movement() {
  const r = useApi('rep.movement', {});
  if (!r) return <Skel />; if (r.__err) return <Alert severity="error">{r.__err}</Alert>;
  const sec = (t, rows) => <Box key={t}><Typography variant="h6" fontWeight={800} sx={{ mt: 2, mb: 1 }}>{t} ({rows.length})</Typography><DataTable rows={rows} empty="None" cols={[{ h: LT('products'), k: x => x.name }, { h: LT('stock'), k: x => x.stock, align: 'right' }, { h: 'Sold 30d', k: x => x.sold30, align: 'right' }, { h: 'Sold 90d', k: x => x.sold90, align: 'right' }, { h: 'Last sale', k: x => x.lastSale || '-' }]} /></Box>;
  return <><Alert severity="info">Based on real stock history from {r.rules.historyFrom}. Fast = {r.rules.fastMin}+ sold in 30 days · Slow = 1 to {r.rules.slowMax} sold in 90 days · Dead = stock but no sale for {r.rules.deadDays} days · No movement = no stock activity in 90 days. Change these in Settings.</Alert>
    {sec('Fast moving', r.fast)}{sec('Slow moving', r.slow)}{sec('Dead stock', r.dead)}{sec('No movement', r.none)}</>;
}
