/* ================= Cash Book (same data and rules as the live ERP JS_Cash.html) ================= */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography, Chip, Alert, Card, CardContent } from '@mui/material';
import { api, inr, nf, esc, rid, toast, work, dtm, debounce } from '../lib/core.js';
import { PageHead, Skel, DataTable, openDialog, confirmBox } from '../lib/ui.jsx';

export const CB = { month: new Date().toISOString().slice(0, 7), q: '', type: '', mode: '', by: '', range: 'all', cat: '', from: '', to: '', view: 'hist', data: null };
const CB_CATS_OUT = ['Office', 'Personal', 'Family', 'Vendor', 'Saving', 'Salary', 'Rent', 'Electricity', 'Rapido', 'Other'];
const CB_CATS_IN = ['Sale', 'Customer Payment', 'Collection', 'Other'];
const cbDay = o => new Date(Date.now() + 330 * 60000 + o * 864e5).toISOString().slice(0, 10);
const cbT12 = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); if (!m) return t || ''; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap; };
function cbRange() {
  const r = CB.range, t = cbDay(0);
  if (r === 'today') return { from: t, to: t };
  if (r === 'yday') return { from: cbDay(-1), to: cbDay(-1) };
  if (r === 'week') return { from: cbDay(-6), to: t };
  if (r === 'month') return { from: t.slice(0, 7) + '-01', to: t.slice(0, 7) + '-31' };
  if (r === 'custom') return { from: CB.from, to: CB.to };
  return {};
}
/* All filtering is done here in the browser, so every button reacts instantly. */
function cbCalc(d) {
  const rg = cbRange(), all = d.rows;
  const inRange = r => (!rg.from || r.date >= rg.from) && (!rg.to || r.date <= rg.to);
  const scope = all.filter(r => inRange(r) && (!CB.mode || r.mode === CB.mode));
  const view = { in: 0, out: 0 }; scope.forEach(r => { if (r.type === 'in') view.in += r.amount; else view.out += r.amount; }); view.bal = view.in - view.out;
  const q = CB.q.trim().toLowerCase();
  const five = ['Office', 'Personal', 'Family', 'Vendor', 'Saving'], cm = r => !CB.cat || (r.type === 'out' && (CB.cat === '_other' ? !five.includes(r.cat) && r.cat !== 'Transfer' && r.cat !== 'Opening Balance' : r.cat === CB.cat));
  const rows = scope.filter(r => cm(r) && (!CB.type || r.type === CB.type) && (!CB.by || r.by === CB.by) && (!q || (r.party + ' ' + r.note + ' ' + r.cat + ' ' + r.amount).toLowerCase().includes(q)));
  if (CB.cat) { view.in = 0; view.out = 0; rows.forEach(r => { if (r.type === 'in') view.in += r.amount; else view.out += r.amount; }); view.bal = view.in - view.out; }
  const dm = {};
  rows.forEach(r => { if (r.cat === 'Transfer' || r.cat === 'Opening Balance') return; const x = dm[r.date] = dm[r.date] || { date: r.date, in: 0, out: 0 }; if (r.type === 'in') x.in += r.amount; else x.out += r.amount; });
  const days = Object.keys(dm).sort().reverse().map(k => dm[k]);
  let showBal = false; const bm = {};
  if (CB.mode && !q && !CB.type && !CB.by) {
    showBal = true; let b = d.balances[CB.mode] || 0;
    all.forEach(r => { if (r.mode !== CB.mode) return; bm[r.id] = b; b -= r.type === 'in' ? r.amount : -r.amount; });
  }
  return { view, days, rows: rows.map(r => Object.assign({}, r, showBal ? { bal: bm[r.id] } : {})), count: rows.length };
}

export default function Cash() {
  const [, setN] = useState(0), [month, setMonth] = useState(CB.month), [k, setK] = useState(0);
  const re = () => setN(n => n + 1);
  const seq = useRef(0), sumRef = useRef(null);
  const load = async () => { const my = ++seq.current; try { const d = await api('cash.list', { month: CB.month }); if (my !== seq.current) return; CB.data = d; re(); } catch (e) { toast(e.message, 'bad'); } };
  useEffect(() => { CB.data = null; re(); load(); }, [month, k]);
  const d = CB.data;
  if (!d) return <><PageHead title="Cash Book" /><Skel /></>;
  const vm = cbCalc(d), s = d.sum, ac = d.accts, over = s.Personal > d.personalLimit;
  const setCat = (c, t) => { const m = CB.month; Object.assign(CB, { cat: c || '', type: t || '', mode: '', q: '', by: '', view: 'hist', range: 'custom', from: m + '-01', to: m + '-31' }); re(); setTimeout(() => sumRef.current && sumRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
  const acct = m => { Object.assign(CB, { cat: '', mode: m || '', type: '', q: '', by: '', view: 'hist' }); re(); };
  const Box1 = ({ label, v, col, sub, on, onClick, vcol }) => <Paper onClick={onClick} sx={{ p: 1.5, cursor: 'pointer', borderLeft: col ? `5px solid ${col}` : undefined, outline: on ? '2px solid #e2603f' : 'none' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={800} sx={{ color: vcol }}>{v}{sub}</Typography></Paper>;
  const g5 = { display: 'grid', gap: 1.2, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(5,1fr)' }, mb: 1.5 };
  return <Box>
    <PageHead title="Cash Book"><TextField type="month" value={d.month} onChange={e => { CB.month = e.target.value || CB.month; setMonth(CB.month); }} sx={{ bgcolor: '#fff' }} /><Button variant="outlined" onClick={() => { CB.month = new Date().toISOString().slice(0, 7); setMonth(CB.month); }}>Current Month</Button></PageHead>
    <Box sx={g5}>{[['Office', s.Office, '#2f6bff'], ['Personal', s.Personal, over ? '#d92d20' : '#e2603f', ` / ${inr(d.personalLimit)}`], ['Family', s.Family, '#8b5cf6'], ['Vendor', s.Vendor, '#0ea5e9'], ['Saving', s.Saving, '#22b573']].map(x => <Box1 key={x[0]} label={x[0] + ' - Selected Month'} v={inr(x[1])} col={x[2]} sub={x[3]} on={CB.cat === x[0]} onClick={() => setCat(x[0])} />)}</Box>
    <Box sx={{ ...g5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' } }}>
      <Box1 label="Bija kharcha (Salary, Rent, Light, Other...)" v={inr(s.Other)} on={CB.cat === '_other'} onClick={() => setCat('_other')} />
      <Box1 label="Kul OUT - Selected Month" v={inr(s.OUT)} vcol="#d92d20" on={!CB.cat && CB.type === 'out'} onClick={() => setCat('', 'out')} />
      <Box1 label="Kul IN - Selected Month" v={inr(s.IN)} vcol="#15803d" on={!CB.cat && CB.type === 'in'} onClick={() => setCat('', 'in')} />
    </Box>
    <Box sx={{ ...g5, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: `repeat(${ac.length + 1},1fr)` } }}><Box1 label="TOTAL (badhu jovo)" v={inr(d.total)} on={!CB.mode} onClick={() => acct('')} />{ac.map(a => <Box1 key={a} label={a} v={inr(d.balances[a])} on={CB.mode === a} onClick={() => acct(a)} />)}</Box>
    <EntryForm ac={ac} onSaved={load} />
    <TransferForm ac={ac} onSaved={load} />
    <Card sx={{ mb: 1.5 }}><CardContent>
      <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1} alignItems="center"><b>Tarikh pramane jovo</b>
        <Stack direction="row" gap={1} alignItems="center"><TextField type="date" value={CB.from} onChange={e => { CB.from = e.target.value; CB.range = 'custom'; CB.view = 'hist'; re(); }} /> thi <TextField type="date" value={CB.to} onChange={e => { CB.to = e.target.value; CB.range = 'custom'; CB.view = 'hist'; re(); }} /> sudhi</Stack></Stack>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>{[['today', 'Aaje'], ['yday', 'Kaal'], ['week', 'Aa week'], ['month', 'Aa mahino'], ['all', 'Badha divas']].map(x => <Chip key={x[0]} label={x[1]} color={CB.range === x[0] && CB.view === 'hist' ? 'primary' : 'default'} onClick={() => { Object.assign(CB, { cat: '', range: x[0], view: 'hist', from: '', to: '' }); re(); }} />)}
        <Chip label="Roj na total" color={CB.view === 'days' ? 'primary' : 'default'} onClick={() => { CB.view = CB.view === 'days' ? 'hist' : 'days'; re(); }} /></Stack>
    </CardContent></Card>
    <Paper ref={sumRef} sx={{ p: 1.5, mb: 1.5 }}><b>{CB.mode ? CB.mode : 'Badhi'} ni noondh{CB.cat ? ' - ' + (CB.cat === '_other' ? 'Bija kharcha' : CB.cat) : ''}</b> — IN <b style={{ color: '#15803d' }}>{inr(vm.view.in)}</b> | OUT <b style={{ color: '#d92d20' }}>{inr(vm.view.out)}</b> | Balance <b>{inr(vm.view.bal)}</b> {(CB.mode || CB.cat) && <Chip size="small" label="Badhu jovo" onClick={() => acct('')} />}</Paper>
    {CB.view === 'days' ? <><Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Roj na total</Typography><DataTable rows={vm.days} empty="No entries" cols={[{ h: 'Date', k: r => dtm(r.date) }, { h: 'IN', k: r => <span style={{ color: '#15803d' }}>{inr(r.in)}</span>, align: 'right' }, { h: 'OUT', k: r => <span style={{ color: '#d92d20' }}>{inr(r.out)}</span>, align: 'right' }]} /></>
      : <History d={d} vm={vm} ac={ac} re={re} load={load} />}
  </Box>;
}
function History({ d, vm, ac, re, load }) {
  const [q, setQ] = useState(CB.q);
  const deb = useRef(debounce(v => { CB.q = v; re(); }, 200)).current;
  const sel = (k, opts, ph) => <TextField select size="small" value={CB[k]} onChange={e => { CB[k] = e.target.value; re(); }} SelectProps={{ displayEmpty: true }} sx={{ minWidth: 130, bgcolor: '#fff' }}><MenuItem value="">{ph}</MenuItem>{opts.map(o => <MenuItem key={o[0]} value={o[0]}>{o[1]}</MenuItem>)}</TextField>;
  const hasBal = vm.rows.some(r => r.bal !== undefined);
  return <>
    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
      <Typography variant="h6" fontWeight={800}>Complete History <small>({nf(vm.count)})</small></Typography>
      <Stack direction="row" gap={1} flexWrap="wrap"><TextField size="small" placeholder="Search..." value={q} onChange={e => { setQ(e.target.value); deb(e.target.value); }} sx={{ bgcolor: '#fff' }} />
        {sel('type', [['in', 'IN'], ['out', 'OUT']], 'All Type')}{sel('mode', ac.map(a => [a, a]), 'All Accounts')}{sel('by', d.by.map(a => [a, a]), 'All Entry By')}</Stack>
    </Stack>
    <DataTable rows={vm.rows} empty="No entries" cols={[{ h: 'Date', k: r => <>{r.date}<br /><small>{cbT12(r.time)}</small></>, nw: true }, { h: 'Category', k: r => r.cat }, { h: 'Party', k: r => <>{r.party}{r.note && <><br /><small>{r.note}</small></>}</> }, { h: 'Account', k: r => r.mode },
      { h: 'In', k: r => r.type === 'in' ? <b style={{ color: '#15803d' }}>{inr(r.amount)}</b> : '' }, { h: 'Out', k: r => r.type === 'out' ? <b style={{ color: '#d92d20' }}>{inr(r.amount)}</b> : '' },
      ...(hasBal ? [{ h: 'Balance', k: r => r.bal === undefined ? '' : inr(r.bal) }] : []), { h: 'By', k: r => <small>{r.by}</small> },
      ...(d.admin ? [{ h: '', k: r => <Stack direction="row" gap={.5}><Button size="small" variant="outlined" onClick={() => cbEdit(r, ac, load)}>Edit</Button><Button size="small" variant="outlined" color="error" onClick={() => cbDel(r, load)}>Delete</Button></Stack> }] : [])]} />
  </>;
}
function EntryForm({ ac, onSaved }) {
  const [v, setV] = useState({ type: 'in', cat: CB_CATS_IN[0], party: '', note: '', amount: '', mode: CB.mode || 'Cash', date: cbDay(0) });
  const cats = v.type === 'in' ? CB_CATS_IN : CB_CATS_OUT;
  const S_ = (k, x) => setV(o => ({ ...o, [k]: x }));
  return <Card sx={{ mb: 1.5 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} gap={1} flexWrap="wrap">
    <TextField select value={v.type} onChange={e => setV(o => ({ ...o, type: e.target.value, cat: (e.target.value === 'in' ? CB_CATS_IN : CB_CATS_OUT)[0] }))}><MenuItem value="in">Money IN</MenuItem><MenuItem value="out">Money OUT</MenuItem></TextField>
    <TextField select value={cats.includes(v.cat) ? v.cat : cats[0]} onChange={e => S_('cat', e.target.value)}>{cats.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
    <TextField placeholder="Party / customer" value={v.party} onChange={e => S_('party', e.target.value)} />
    <TextField placeholder="Karan (reason)" value={v.note} onChange={e => S_('note', e.target.value)} />
    <TextField type="number" placeholder="Amount" inputProps={{ inputMode: 'decimal' }} value={v.amount} onChange={e => S_('amount', e.target.value)} />
    <TextField select value={v.mode} onChange={e => S_('mode', e.target.value)}>{ac.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}</TextField>
    <TextField type="date" value={v.date} onChange={e => S_('date', e.target.value)} />
    <Button variant="contained" onClick={() => work(async () => { await api('cash.add', { _rid: rid(), type: v.type, cat: cats.includes(v.cat) ? v.cat : cats[0], party: v.party, note: v.note, amount: v.amount, mode: v.mode, date: v.date }); setV(o => ({ ...o, party: '', note: '', amount: '' })); toast('Saved'); await onSaved(); })}>Add Entry</Button>
  </Stack></CardContent></Card>;
}
function TransferForm({ ac, onSaved }) {
  const [v, setV] = useState({ from: 'Cash', to: 'HDFC', amount: '', note: '', date: cbDay(0) });
  const S_ = (k, x) => setV(o => ({ ...o, [k]: x }));
  return <Card sx={{ mb: 1.5 }}><CardContent><b>Transfer between accounts</b><Stack direction={{ xs: 'column', md: 'row' }} gap={1} sx={{ mt: 1 }}>
    <TextField select value={v.from} onChange={e => S_('from', e.target.value)}>{ac.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}</TextField>
    <TextField select value={v.to} onChange={e => S_('to', e.target.value)}>{ac.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}</TextField>
    <TextField type="number" placeholder="Amount" inputProps={{ inputMode: 'decimal' }} value={v.amount} onChange={e => S_('amount', e.target.value)} />
    <TextField placeholder="Note" value={v.note} onChange={e => S_('note', e.target.value)} />
    <TextField type="date" value={v.date} onChange={e => S_('date', e.target.value)} />
    <Button variant="contained" sx={{ bgcolor: '#f97316' }} onClick={() => work(async () => { await api('cash.transfer', { _rid: rid(), from: v.from, to: v.to, amount: v.amount, note: v.note, date: v.date }); setV(o => ({ ...o, amount: '', note: '' })); toast('Transfer saved'); await onSaved(); })}>Transfer</Button>
  </Stack></CardContent></Card>;
}
function EditBody({ r, v, ac }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  const out = v.type === 'out', cats = out ? CB_CATS_OUT : CB_CATS_IN, isT = r.cat === 'Transfer' || r.cat === 'Opening Balance';
  const catList = cats.includes(v.cat) ? cats : cats.concat([v.cat]);
  return <Stack gap={1.5} sx={{ pt: 1 }}>
    <TextField select label="Type" value={v.type} onChange={e => set('type', e.target.value)}><MenuItem value="in">Money IN</MenuItem><MenuItem value="out">Money OUT</MenuItem></TextField>
    {!isT && <TextField select label="Category" value={v.cat} onChange={e => set('cat', e.target.value)}>{catList.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>}
    <TextField label="Party / Customer" value={v.party} onChange={e => set('party', e.target.value)} />
    <TextField label="Reason / note" value={v.note} onChange={e => set('note', e.target.value)} />
    <TextField type="number" label="Amount" inputProps={{ inputMode: 'decimal' }} value={v.amount} onChange={e => set('amount', e.target.value)} />
    <TextField select label="Account" value={v.mode} onChange={e => set('mode', e.target.value)}>{ac.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}</TextField>
    <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={v.date} onChange={e => set('date', e.target.value)} />
    {r.cat === 'Transfer' && <Alert severity="warning">Transfer has 2 lines (OUT and IN). Change both lines.</Alert>}
  </Stack>;
}
function cbEdit(r, ac, load) {
  const v = { type: r.type, cat: r.cat, party: r.party, note: r.note, amount: r.amount, mode: r.mode, date: r.date };
  openDialog('Edit entry', () => <EditBody r={r} v={v} ac={ac} />, { maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => { await api('cash.edit', { _rid: rid(), id: r.id, type: v.type, cat: v.cat, party: v.party, note: v.note, amount: v.amount, mode: v.mode, date: v.date }); close(); toast('Updated'); load(); })}>Save</Button> });
}
function cbDel(r, load) {
  return work(async () => {
    if (!(await confirmBox(`Delete ${r.type.toUpperCase()} ${inr(r.amount)} (${r.party || r.cat})?${r.cat === 'Transfer' ? ' Delete the other transfer line too.' : ''}`))) return;
    await api('cash.del', { _rid: rid(), id: r.id }); toast('Deleted'); load();
  });
}
