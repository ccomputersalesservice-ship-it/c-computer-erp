import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, MenuItem, Paper, Select, Stack, TextField, Typography, LinearProgress, Chip, useMediaQuery } from '@mui/material';
import { api, S, inr, nf, isAdmin, LI, LT, dtm, greetWord, toast } from '../lib/core.js';
import { PageHead, Skel, DataTable, Pill, Stat, Kpi, Section, Grid, BarChart, Donut, Thumb, openDialog, Empty, Note } from '../lib/ui.jsx';
import { go } from '../lib/nav.js';
import { NAV_ICON } from '../lib/icons.jsx';
import { openOrder } from './Sales.jsx';
import { openPurchase } from './Purchase.jsx';
import { openProduct, addPhotoDialog } from './Products.jsx';
import { openQuote } from './Quotes.jsx';
import { sv } from './Service.jsx';
import { CB } from './Cash.jsx';

const Ic = ({ k }) => { const I = NAV_ICON[k] || NAV_ICON.dash; return <I />; };
const OPS = { date: '' };
const opsToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

export default function Dashboard({ params }) {
  const [per, setPer] = useState(params.period || 'month'), [d, setD] = useState(null), [ops, setOps] = useState(undefined), [opsDate, setOpsDate] = useState(OPS.date);
  const a = isAdmin();
  useEffect(() => { let on = true; setD(null); api('dash', { period: per }).then(x => { if (on) { setD(x); S.dash = x; } }).catch(e => toast(e.message, 'bad')); return () => { on = false; }; }, [per]);
  useEffect(() => { let on = true; api('dash.ops', { date: opsDate || opsToday() }).then(x => on && setOps(x), () => on && setOps(null)); return () => { on = false; }; }, [opsDate]);
  const perSel = <Select value={per} onChange={e => { params.period = e.target.value; setPer(e.target.value); }} sx={{ minWidth: 160, bgcolor: '#fff' }}>
    {[['month', 'thismonth'], ['lastmonth', 'lastmonth'], ['year', 'thisyear'], ['all', 'alltime']].map(p => <MenuItem key={p[0]} value={p[0]}>{LT(p[1])}</MenuItem>)}</Select>;
  return <Box>
    <PageHead title={LI('dash')}>{perSel}</PageHead>
    <Ops d={ops} date={opsDate} setDate={v => { OPS.date = v === opsToday() ? '' : v; setOpsDate(OPS.date); }} />
    {!d ? <Skel /> : <DashBody d={d} a={a} />}
  </Box>;
}

function DashBody({ d, a }) {
  const c = d.cards, [showVal, setShowVal] = useState(false);
  const stats = [['available', c.available, '#16a34a'], ['reserved', c.reserved, '#1f6feb'], ['lowstock', c.low, '#ef4444'], ['orders', c.orders, '#7c3aed'], ['pending', c.pending, '#f59e0b'], ['delivered', c.delivered, '#16a34a']];
  if (a) stats.push(['Serialised Items', c.serialised, '#06b6d4'], ['Quantity-based Items', c.qtyBased, '#84cc16']);
  return <Stack gap={2}>
    <Grid cols={4}>
      {a ? <><Kpi label={LI('totpurchase')} value={inr(c.totalPurchase)} color="#1f6feb" icon={<Ic k="purchase" />} /><Kpi label={LI('totsales')} value={inr(c.totalSales)} color="#16a34a" icon={<Ic k="sales" />} /></>
        : <><Kpi label={LI('available')} value={nf(c.available)} color="#16a34a" icon={<Ic k="stock" />} /><Kpi label={LI('reserved')} value={nf(c.reserved)} color="#1f6feb" icon={<Ic k="sales" />} /></>}
      <Kpi label={LI('totproducts')} value={nf(c.products)} color="#7c3aed" icon={<Ic k="products" />} />
      <Kpi label={LI(a ? 'totstock' : 'lowstock')} value={nf(a ? c.stockUnits : c.low)} color={a ? '#f97316' : '#ef4444'} icon={<Ic k="stock" />} />
    </Grid>
    {a && <Card><CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography fontSize={26}>₹</Typography>
      <Box sx={{ flex: 1, minWidth: 180 }}><Typography variant="caption">Stock Value (at cost price)</Typography>
        <Stack direction="row" alignItems="center" gap={1.5}><Typography variant="h4" fontWeight={800}>{showVal ? inr(c.stockValue) : '₹ ••••••'}</Typography><Button size="small" variant="contained" onClick={() => setShowVal(!showVal)}>{showVal ? 'Hide' : 'Show'}</Button></Stack></Box>
      <Box><Typography variant="caption">{nf(c.stockUnits)} units in {nf(c.products)} products</Typography>{c.noCost ? <Typography variant="caption" display="block" sx={{ color: '#b45309' }}>{nf(c.noCost)} products have no cost price yet (not counted)</Typography> : null}</Box>
    </CardContent></Card>}
    <DashExtra d={d} a={a} />
    <Grid cols={4}>{stats.map(s => <Stat key={s[0]} label={LI(s[0])} value={nf(s[1])} color={s[2]} />)}</Grid>
    <Grid cols={2}>
      {a ? <Section title={LI('salestrend')}><BarChart data={d.trend} series={[{ k: 'sales', n: 'Sales', c: '#1f6feb' }, { k: 'purchase', n: 'Purchase', c: '#7c3aed' }]} /></Section>
        : <Section title={LI('movement')}><BarChart data={d.movement} series={[{ k: 'in', n: 'In', c: '#16a34a' }, { k: 'out', n: 'Out', c: '#ef4444' }]} /></Section>}
      <Section title={LI('stockcat')}>{d.categories.length ? <Donut items={d.categories} top={nf(c.stockUnits)} sub="Units" /> : <Empty>No stock yet</Empty>}</Section>
    </Grid>
    {a && <Section title={LI('movement')}><BarChart data={d.movement} series={[{ k: 'in', n: 'Stock In', c: '#16a34a' }, { k: 'out', n: 'Stock Out', c: '#ef4444' }]} w={1160} h={200} /></Section>}
    <Grid cols={2}>
      <Section title={LI('lowalert')}><DataTable rows={d.lowStock} empty="No low stock products 👍" cols={[{ h: '#', k: (r, i) => i + 1 }, { h: LT('products'), k: r => r.name }, { h: 'Current', k: r => nf(r.current), align: 'right' }, { h: 'Reorder', k: r => nf(r.reorder), align: 'right' }, { h: '', k: () => <Button size="small" color="error" variant="contained" onClick={() => go('reports', { tab: 'reorder' })}>Reorder</Button>, align: 'right' }]} /></Section>
      <Section title={LI('recentorders')}><DataTable rows={d.recentOrders} empty="No orders yet" onRow={r => openOrder(r.orderId)} cols={[{ h: 'Order ID', k: r => r.orderId }, { h: LT('customers'), k: r => r.customer }].concat(a ? [{ h: LT('total'), k: r => inr(r.total), align: 'right' }] : []).concat([{ h: LT('status'), k: r => <Pill s={r.status} /> }])} /></Section>
    </Grid>
    <Grid cols={2}>
      {a && <Section title={LI('recentpur')}><DataTable rows={d.recentPurchases} empty="No purchases yet" onRow={r => openPurchase(r.purchaseId)} cols={[{ h: 'ID', k: r => r.purchaseId }, { h: LT('vendor'), k: r => r.vendor }, { h: LT('total'), k: r => inr(r.amount), align: 'right' }, { h: LT('status'), k: r => <Pill s={r.status} /> }]} /></Section>}
      <Section title={LI('recentact')}><DataTable rows={d.recentActivity} empty="No activity yet" cols={[{ h: LT('date'), k: r => r.dt.slice(5, 16), nw: true }, { h: LT('products'), k: r => <>{r.product}{r.serial && <><br /><small>{r.serial}</small></>}</> }, { h: 'Type', k: r => <Chip size="small" label={r.type} /> }, { h: LT('qty'), k: r => nf(r.qty), align: 'right' }]} /></Section>
    </Grid>
  </Stack>;
}

function DashExtra({ d, a }) {
  const chg = p => <span style={{ fontSize: 12, fontWeight: 700, color: p >= 0 ? '#16a34a' : '#dc2626' }}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}%</span>;
  const al = d.alerts;
  const H = ({ children }) => <Typography variant="h6" fontWeight={800} sx={{ mt: 1 }}>{children}</Typography>;
  const lst = (title, rows, showProfit) => <Section title={title}>{rows && rows.length ? rows.map((r, i) => <Stack key={i} direction="row" gap={1.2} alignItems="center" sx={{ py: .8, borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => openProduct(r.productId)}>
    <Thumb id={r.productId} /><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={700} noWrap>{r.name}</Typography><Typography variant="caption" color="text.secondary">{[r.brand, r.model].filter(Boolean).join(' · ')}</Typography></Box>
    <Box sx={{ textAlign: 'right' }}><b>{nf(r.qty)}</b><small> qty</small>{showProfit && r.profit !== undefined && <Typography variant="caption" display="block" sx={{ color: '#16a34a' }}>{inr(r.profit)}</Typography>}</Box></Stack>) : <Empty>No sales yet in this period</Empty>}</Section>;
  const qa = [['Add Product', () => openProduct(null)], ['New Purchase', () => go('purchase', { new: 1 })], ['New Sale', () => go('sales', { new: 1 })], ['Build PC', () => go('build')], ['New Customer', () => go('customers')], ['Service Entry', () => go('crm')], ['Stock Audit', () => go('audit')], ['Print Barcode', () => go('print')], ['Add Photo', addPhotoDialog]];
  return <>
    {a && d.today && <><H>Today's Business</H><Grid cols={3}>{[['sales', "Today's Sales", '#1f6feb'], ['profit', "Today's Profit", '#16a34a'], ['purchase', "Today's Purchase", '#7c3aed']].map(([k, lab, col]) => <Paper key={k} sx={{ p: 2, borderTop: `3px solid ${col}` }}><Typography variant="caption">{lab}</Typography><Typography variant="h5" fontWeight={800} sx={{ my: .5 }}>{inr(d.today.today[k])}</Typography><Typography variant="caption">Yesterday {inr(d.today.yesterday[k])} · {chg(d.today.growth[k])}</Typography></Paper>)}</Grid></>}
    {a && d.target && <Section title="Monthly Sales Target" right={<b>{inr(d.target.achieved)} / {inr(d.target.target)} · {d.target.pct}%</b>}>
      <LinearProgress variant="determinate" value={Math.min(100, d.target.pct)} color={d.target.pct >= 100 ? 'success' : 'primary'} sx={{ height: 14, borderRadius: 9, my: 1 }} />
      <Grid cols={4}>{[['Remaining', inr(d.target.remaining)], [`Need per day (${d.target.daysLeft} days left)`, inr(d.target.perDay)], ['Achieved', inr(d.target.achieved)], ['Month profit', inr(d.target.profit)]].map(x => <Box key={x[0]}><Typography variant="caption">{x[0]}</Typography><Typography fontWeight={800}>{x[1]}</Typography></Box>)}</Grid>
    </Section>}
    {d.followups && d.followups.rows.length > 0 && <Section title={`Quotation follow-ups due (${d.followups.count})`}><DataTable rows={d.followups.rows} onRow={r => openQuote(r.id)} cols={[{ h: 'Quotation', k: r => <b>{r.id}</b> }, { h: 'Customer', k: r => <>{r.name}{r.mobile && <><br /><small>{r.mobile}</small></>}</> }, { h: 'Amount', k: r => inr(r.total), align: 'right' }, { h: 'Due', k: r => r.followDate }, { h: 'Staff', k: r => r.by }, { h: 'Note', k: r => r.followNote }]} /></Section>}
    {al && <><H>Stock Alerts <small style={{ fontWeight: 400, fontSize: 13 }}>(tap to see list)</small></H><Grid cols={a ? 5 : 4}>
      {[['out', 'Out of Stock', '#ef4444'], ['low', 'Low / Reorder', '#f59e0b'], ['dead', 'Dead Stock (90d)', '#64748b'], ['slow', 'Slow Moving (30-90d)', '#06b6d4']].concat(a ? [['noCost', 'No Purchase Price', '#7c3aed']] : []).map(x => <Stat key={x[0]} label={x[1]} value={nf(al.counts[x[0]])} color={x[2]} onClick={() => alertList(d, x[0])} />)}</Grid></>}
    {d.best && <><H>Best Selling</H><Grid cols={2}>{lst('Top 10 Best Selling', d.best.top, a)}{a && lst('Highest Profit Products', d.best.profit, true)}</Grid>{a && lst('Most Purchased', d.best.purchased, false)}</>}
    <H>Quick Actions</H><Stack direction="row" flexWrap="wrap" gap={1}>{qa.map(x => <Button key={x[0]} variant="outlined" onClick={x[1]}>{x[0]}</Button>)}</Stack>
    {d.recentAct2 && d.recentAct2.length > 0 && <Section title="Latest Activity"><DataTable rows={d.recentAct2} cols={[{ h: 'Date & time', k: r => dtm('', r.dt), nw: true }, { h: 'Staff', k: r => <b>{r.who}</b> }, { h: 'What', k: r => <>{r.action} {r.id && <small>{r.id}</small>}</> }]} /></Section>}
  </>;
}
function alertList(d, k) {
  const rows = (d.alerts.lists[k]) || [], ttl = { out: 'Out of Stock', low: 'Low Stock / Reorder Required', dead: 'Dead Stock (no sale in 90 days)', slow: 'Slow Moving (no sale in 30-90 days)', noCost: 'Products Without Purchase Price' }[k];
  openDialog(ttl, () => <DataTable rows={rows} empty="All good - nothing here" onRow={r => openProduct(r.productId)} cols={[{ h: '', k: r => <Thumb id={r.productId} /> }, { h: 'Product', k: r => <><b>{r.name}</b><br /><small>{[r.brand, r.model, r.category].filter(Boolean).join(' · ')}</small></> }, { h: 'Stock', k: r => nf(r.available), align: 'right' }].concat(k === 'low' ? [{ h: 'Reorder', k: r => nf(r.reorder), align: 'right' }] : [])} />);
}

/* ---------- top sections: welcome, service summary, alerts, daily summary, accounts, dues ---------- */
function opsText(d) {
  const x = d.daily, c = x.closing;
  return `*C COMPUTER - Daily Summary*\nDate: ${d.date}\nIncome: ${inr(x.income)}\nTotal IN: ${inr(x.totalIn)}\nTotal OUT: ${inr(x.totalOut)}\nService completed: ${nf(x.serviceDone)}\nCustomer outstanding: ${inr(x.outstanding)}\nCash balance: ${inr(x.cashBalance)}\nDaily closing: ${c ? 'Done (expected ' + inr(c.expected) + ', actual ' + inr(c.actual) + ', difference ' + inr(c.diff) + ')' : 'Not done yet'}`;
}
function opsList(title, cols, rows) {
  const dl = openDialog(title, () => <><DataTable rows={rows} cols={cols} empty="Nothing here" /><Box sx={{ textAlign: 'right', mt: 1 }}><Button variant="outlined" onClick={() => { dl.close(); go('crm'); }}>Open CRM</Button></Box></>);
}
function Ops({ d, date, setDate }) {
  const nm = String((S.user && S.user.name) || '').trim().split(/\s+/)[0], dt = new Date(Date.now() + 330 * 60000);
  const dateTxt = dt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const Card_ = ({ lab, v, col, onClick, children }) => <Paper onClick={onClick} sx={{ p: 1.5, borderTop: `3px solid ${col || '#0f2a5e'}`, cursor: onClick ? 'pointer' : 'default' }}><Typography variant="caption" color="text.secondary">{lab}</Typography><Typography variant="h6" fontWeight={800}>{v}</Typography>{children}</Paper>;
  const H = ({ children }) => <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{children}</Typography>;
  const toSv = s => { sv.status = s || ''; sv.q = ''; sv.page = 1; go('service'); };
  const toCash = () => { CB.mode = ''; CB.range = 'all'; go('cash'); };
  return <Box sx={{ mb: 2 }}>
    <Paper sx={{ p: 2.5, background: 'linear-gradient(120deg,#0f2a5e,#1f4fa8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Box><Typography variant="caption" sx={{ opacity: .8 }}>{greetWord()}</Typography><Typography variant="h5" fontWeight={900}>{nm} 👋</Typography><Typography variant="body2" sx={{ opacity: .85 }}>{dateTxt}</Typography></Box>
      <Box sx={{ textAlign: 'right' }}><Typography fontWeight={900}>C COMPUTER</Typography><Typography variant="caption">The Computer House</Typography></Box>
    </Paper>
    {d && <>
      <H>Service Summary</H>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(3,1fr)', md: 'repeat(9,1fr)' } }}>
        {[['Total', d.services.total, '', '#0f2a5e'], ['Pending', d.services.Pending, 'Pending', '#f59e0b'], ['Processing', d.services.Processing, 'Processing', '#2563eb'], ['Ready', d.services.Ready, 'Ready', '#16a34a'], ['Delivered', d.services.Delivered, 'Delivered', '#64748b'], ['Urgent', d.services.urgent, '', '#dc2626'], ['On-site', d.services.onsite, '', '#7c3aed'], ['Returned', d.services.Returned, 'Returned', '#ef4444'], ['Replacement', d.services.Replacement, 'Replacement', '#0891b2']].map(x => <Card_ key={x[0]} lab={x[0]} v={nf(x[1])} col={x[3]} onClick={() => toSv(x[2])} />)}
      </Box>
      {d.full && <FullOps d={d} date={date} setDate={setDate} Card_={Card_} H={H} toSv={toSv} toCash={toCash} />}
    </>}
  </Box>;
}
function FullOps({ d, date, setDate, Card_, H, toSv, toCash }) {
  const al = d.alerts, x = d.daily, c = x.closing;
  const items = [['overdue', al.overdue.count, `${nf(al.overdue.count)} service job(s) pending/processing for 3+ days`, '#dc2626'], ['tasks', al.tasks.count, `${nf(al.tasks.count)} task(s) pending today`, '#f59e0b'], ['expenses', al.expenses.count, `${nf(al.expenses.count)} monthly expense(s) not paid yet (${inr(al.expenses.amount)})`, '#f59e0b'], ['vendor', al.vendor.count, `${nf(al.vendor.count)} vendor bill(s) overdue (${inr(al.vendor.amount)})`, '#dc2626'], ['requests', al.requests.count, `${nf(al.requests.count)} new service request(s)`, '#2563eb']].filter(z => z[1] > 0);
  const AL = {
    overdue: ['Overdue service work', [{ h: 'Job', k: r => <b>{r.sid}</b> }, { h: 'Customer', k: r => r.name }, { h: 'Device', k: r => r.device }, { h: 'Status', k: r => r.status }, { h: 'Days', k: r => nf(r.days), align: 'right' }]],
    tasks: ["Today's pending tasks", [{ h: 'Staff', k: r => <b>{r.who}</b> }, { h: 'Task', k: r => r.title }, { h: 'Due', k: r => r.due }]],
    expenses: ['Monthly expenses not paid yet', [{ h: 'Expense', k: r => <b>{r.name}</b> }, { h: 'Day', k: r => nf(r.day), align: 'right' }, { h: 'Amount', k: r => inr(r.amount), align: 'right' }]],
    vendor: ['Vendor payments overdue', [{ h: 'Vendor', k: r => <><b>{r.vendor}</b><br /><small>{r.item}</small></> }, { h: 'Due', k: r => r.due }, { h: 'Pending', k: r => inr(r.left), align: 'right' }]],
    requests: ['New service requests', [{ h: 'Customer', k: r => <><b>{r.name}</b><br /><small>{r.phone}</small></> }, { h: 'Device', k: r => r.device }, { h: 'Issue', k: r => r.issue }, { h: 'Date', k: r => r.date }]]
  };
  const openAl = k => { if (k === 'overdue') { sv.status = ''; sv.q = ''; sv.page = 1; } opsList(AL[k][0] + ` (${nf(al[k].count)})`, AL[k][1], al[k].rows); };
  const rec = () => opsList('Customer Receivables', [{ h: 'Customer', k: r => <><b>{r.name}</b><br /><small>{r.phone}</small></> }, { h: 'Status', k: r => r.status }, { h: 'Pending', k: r => inr(r.left), align: 'right' }], d.receivables.rows);
  const pay = () => opsList('Vendor Payables', [{ h: 'Vendor', k: r => <><b>{r.vendor}</b><br /><small>{r.item}</small></> }, { h: 'Due date', k: r => r.due }, { h: 'Pending', k: r => inr(r.left), align: 'right' }], d.payables.rows);
  const closing = () => { const dl = openDialog('Daily closing - ' + d.date, () => c ? <><Note sev="success">Closed by {c.by} {c.time}</Note><Typography>Expected cash: <b>{inr(c.expected)}</b><br />Actual cash: <b>{inr(c.actual)}</b><br />Difference: <b>{inr(c.diff)}</b>{c.note && <><br />Note: {c.note}</>}</Typography></> : <Note>Daily closing is not done for this date. Do it in the CRM.</Note>, { actions: () => <Button variant="contained" onClick={() => { dl.close(); go('crm'); }}>Open CRM</Button> }); };
  const acct = m => { Object.assign(CB, { mode: m, type: '', q: '', by: '', view: 'hist', range: 'all', from: '', to: '' }); go('cash'); };
  const g = { display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' } };
  return <>
    <H>Smart Alerts</H>
    {items.length ? <Stack gap={1}>{items.map(z => <Paper key={z[0]} onClick={() => openAl(z[0])} sx={{ p: 1.5, borderLeft: `4px solid ${z[3]}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}><span>{z[2]}</span><b>›</b></Paper>)}</Stack> : <Note sev="success">All clear - no pending alerts 👍</Note>}
    <H>Daily Business Summary <TextField type="date" size="small" value={d.date} inputProps={{ max: opsToday() }} onChange={e => setDate(e.target.value)} sx={{ bgcolor: '#fff' }} /></H>
    <Box sx={g}>
      <Card_ lab="Income" v={inr(x.income)} col="#16a34a" onClick={toCash} /><Card_ lab="Total IN" v={inr(x.totalIn)} col="#16a34a" onClick={toCash} /><Card_ lab="Total OUT" v={inr(x.totalOut)} col="#dc2626" onClick={toCash} />
      <Card_ lab="Service completed" v={nf(x.serviceDone)} col="#64748b" onClick={() => toSv('Delivered')} /><Card_ lab="Customer outstanding" v={inr(x.outstanding)} col="#f59e0b" onClick={rec} /><Card_ lab="Cash balance" v={inr(x.cashBalance)} col="#0f2a5e" onClick={toCash} />
      <Card_ lab="Daily closing" v={c ? 'Done ✔' : 'Not done yet'} col={c ? '#16a34a' : '#f59e0b'} onClick={closing}>{c && <Typography variant="caption">Expected {inr(c.expected)} · Actual {inr(c.actual)} · Diff {inr(c.diff)}</Typography>}</Card_>
    </Box>
    <Stack direction="row" gap={1} sx={{ mt: 1 }}><Button variant="outlined" onClick={async () => { try { await navigator.clipboard.writeText(opsText(d)); toast('Summary copied', 'ok'); } catch (e) { toast('Copy not allowed in this browser', 'bad'); } }}>Copy summary</Button>
      <Button variant="contained" sx={{ bgcolor: '#25d366' }} onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(opsText(d)), '_blank', 'noopener')}>WhatsApp share</Button></Stack>
    <H>Account Balances <small style={{ fontWeight: 400 }}>Total {inr(d.accounts.total)}</small></H>
    <Box sx={{ ...g, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(5,1fr)' } }}>{['Cash', 'HDFC', 'IDBI', 'Wallet', 'Saving'].map(m => <Card_ key={m} lab={m + (m === 'HDFC' || m === 'IDBI' ? ' (Bank)' : '')} v={inr(d.accounts.balances[m] || 0)} onClick={() => acct(m)} />)}</Box>
    <H>Receivables &amp; Payables</H>
    <Grid cols={2}><Card_ lab={`Customer Receivables (${nf(d.receivables.count)} customers)`} v={inr(d.receivables.total)} col="#f59e0b" onClick={rec} />
      <Card_ lab={`Vendor Payables (${nf(d.payables.count)} bills${d.payables.overdueCount ? ' · ' + nf(d.payables.overdueCount) + ' overdue ' + inr(d.payables.overdueAmount) : ''})`} v={inr(d.payables.total)} col="#dc2626" onClick={pay} /></Grid>
  </>;
}
