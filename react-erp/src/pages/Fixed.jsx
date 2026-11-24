/* ================= Fixed Kharcha + Staff Time (admin only; same logic as the live ERP JS_Fixed.html) ================= */
import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography, Chip, Alert, Card, CardContent, Tab, Tabs, Checkbox, FormControlLabel } from '@mui/material';
import { api, inr, rid, toast, work } from '../lib/core.js';
import { PageHead, Skel, DataTable, openDialog, confirmBox } from '../lib/ui.jsx';

const CB_CATS_OUT = ['Office', 'Personal', 'Family', 'Vendor', 'Saving', 'Salary', 'Rent', 'Electricity', 'Rapido', 'Other'];
const FX = { tab: 'fixed' };
const FX_COL = { Paid: 'success', Overdue: 'error', Baki: 'info', Band: 'warning' };
function fxCat(r) {
  const n = r.name.toLowerCase();
  if (r.type === 'Personal') return /sip|gold|mandal|saving|lic/.test(n) ? 'Saving' : 'Personal';
  if (/salary/.test(n)) return 'Salary'; if (/rent/.test(n)) return 'Rent'; if (/light|electric/.test(n)) return 'Electricity';
  return r.type === 'Business' ? 'Office' : 'Other';
}
export default function Fixed() {
  const [tab, setTab] = useState(FX.tab);
  return <Box><PageHead title="Fixed Kharcha" />
    <Tabs value={tab} onChange={(e, v) => { FX.tab = v; setTab(v); }} sx={{ mb: 2 }}><Tab value="fixed" label="Fixed Kharcha" /><Tab value="staff" label="Staff Login Time" /></Tabs>
    {tab === 'fixed' ? <FixedTab /> : <StaffTab />}</Box>;
}
function FixedTab() {
  const [d, setD] = useState(null), [n, setN] = useState(0), [v, setV] = useState({ name: '', amount: '', day: '', type: 'Business' });
  const load = () => setN(x => x + 1);
  useEffect(() => { api('fixed.list', {}).then(setD, e => toast(e.message, 'bad')); }, [n]);
  if (!d) return <Skel />;
  const s = d.sum, S_ = (k, x) => setV(o => ({ ...o, [k]: x }));
  const band = r => work(async () => { const on = !r.active; if (!(await confirmBox(on ? `${r.name} fari chalu karvu?` : `${r.name} Band karvu? (delete nathi thatu, pachi Chalu kari shakso)`))) return; await api('fixed.active', { _rid: rid(), id: r.id, active: on }); toast(on ? 'Chalu' : 'Band'); load(); });
  return <>
    <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, mb: 1.5 }}>
      <Paper sx={{ p: 1.5 }}><Typography variant="caption">Aa mahino fixed kul</Typography><Typography variant="h6" fontWeight={800}>{inr(s.total)}</Typography></Paper>
      <Paper sx={{ p: 1.5 }}><Typography variant="caption">Paid</Typography><Typography variant="h6" fontWeight={800} sx={{ color: '#15803d' }}>{inr(s.paid)}</Typography></Paper>
      <Paper sx={{ p: 1.5 }}><Typography variant="caption">Baki</Typography><Typography variant="h6" fontWeight={800} sx={{ color: '#d97706' }}>{inr(s.baki)}</Typography></Paper>
      <Paper sx={{ p: 1.5 }}><Typography variant="caption">Baki (office / business)</Typography><Typography variant="h6" fontWeight={800}>{inr(s.bakiBiz)}</Typography><Typography variant="caption">Personal baki: {inr(s.bakiPer)}</Typography></Paper>
    </Box>
    <Card sx={{ mb: 1.5 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
      <TextField placeholder="Naam (Rent, Salary...)" value={v.name} onChange={e => S_('name', e.target.value)} /><TextField type="number" placeholder="Amount" inputProps={{ inputMode: 'decimal' }} value={v.amount} onChange={e => S_('amount', e.target.value)} />
      <TextField type="number" placeholder="Due tarikh (1-31)" inputProps={{ inputMode: 'numeric' }} value={v.day} onChange={e => S_('day', e.target.value)} />
      <TextField select value={v.type} onChange={e => S_('type', e.target.value)}>{['Business', 'Personal', 'Finance'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
      <Button variant="contained" onClick={() => work(async () => { await api('fixed.save', { _rid: rid(), name: v.name, amount: v.amount, day: v.day, type: v.type }); toast('Saved'); setV({ name: '', amount: '', day: '', type: v.type }); load(); })}>+ Fixed add</Button>
    </Stack></CardContent></Card>
    <DataTable rows={d.rows} empty="No fixed kharcha" cols={[{ h: 'Naam', k: r => <><b>{r.name}</b>{r.remarks && <><br /><small>{r.remarks}</small></>}</> }, { h: 'Type', k: r => r.type }, { h: 'Amount', k: r => inr(r.amount) }, { h: 'Due tarikh', k: r => r.day },
      { h: 'Aa mahino', k: r => <><Chip size="small" color={FX_COL[r.status] || 'default'} label={r.status} />{r.paid && <><br /><small>{r.paidDate} · {r.paidFrom}</small></>}</> },
      { h: '', k: r => <Stack direction="row" gap={.5}>{r.active && !r.paid && <Button size="small" variant="contained" onClick={() => fxPay(r, d, load)}>Pay</Button>}<Button size="small" variant="outlined" onClick={() => fxEdit(r, load)}>Edit</Button><Button size="small" variant="outlined" onClick={() => band(r)}>{r.active ? 'Band' : 'Chalu'}</Button></Stack> }]} />
  </>;
}
function Form({ v, fields }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  return <Stack gap={1.5} sx={{ pt: 1 }}>{fields.map(f => <TextField key={f.k} label={f.l} type={f.type} select={!!f.opts} value={v[f.k]} InputLabelProps={f.type === 'date' ? { shrink: true } : undefined} onChange={e => set(f.k, e.target.value)}>{f.opts && f.opts.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField>)}{fields.note && <Alert severity="info">{fields.note}</Alert>}</Stack>;
}
function fxEdit(r, load) {
  const v = { name: r.name, amount: r.amount, day: r.day, type: r.type, remarks: r.remarks || '' };
  openDialog('Edit Fixed Kharcha', () => <Form v={v} fields={[{ k: 'name', l: 'Naam' }, { k: 'amount', l: 'Amount', type: 'number' }, { k: 'day', l: 'Due tarikh (1-31)', type: 'number' }, { k: 'type', l: 'Type', opts: ['Business', 'Personal', 'Finance'] }, { k: 'remarks', l: 'Remarks' }]} />, {
    maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => { await api('fixed.save', { _rid: rid(), id: r.id, name: v.name, amount: v.amount, day: v.day, type: v.type, remarks: v.remarks }); close(); toast('Updated'); load(); })}>Save</Button>
  });
}
function fxPay(r, d, load) {
  const v = { amount: r.amount, mode: d.accts[0], cat: fxCat(r), date: d.today };
  const fields = [{ k: 'amount', l: 'Amount', type: 'number' }, { k: 'mode', l: 'Account (kya thi pay karyu)', opts: d.accts }, { k: 'cat', l: 'Category', opts: CB_CATS_OUT }, { k: 'date', l: 'Date', type: 'date' }]; fields.note = 'Pay karya pachi Cash Book ma OUT entry apoaap jashe.';
  openDialog('Pay - ' + r.name, () => <Form v={v} fields={fields} />, {
    maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => { await api('fixed.pay', { _rid: rid(), id: r.id, amount: v.amount, mode: v.mode, cat: v.cat, date: v.date }); close(); toast('Paid - Cash Book ma entry thai'); load(); })}>Pay</Button>
  });
}
/* ----- Staff login time ----- */
function StaffTab() {
  const [st, setSt] = useState(null), [n, setN] = useState(0);
  useEffect(() => { api('stafftime.list', {}).then(x => setSt(x.map(u => ({ ...u }))), e => toast(e.message, 'bad')); }, [n]);
  if (!st) return <Skel />;
  const upd = (i, k, v) => setSt(l => l.map((u, j) => j === i ? { ...u, [k]: v } : u));
  return <Stack gap={1.5}><Alert severity="info">Aa time CRM na staff login ne lagu pade che (CRM ni j setting). PIN ahi dekhato nathi.</Alert>
    {st.length ? st.map((u, i) => <Card key={u.name}><CardContent><b>{u.name}</b> <small>{u.role}</small>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}><span>Office time</span><TextField type="time" value={u.start} onChange={e => upd(i, 'start', e.target.value)} /> thi <TextField type="time" value={u.close} onChange={e => upd(i, 'close', e.target.value)} />
        <FormControlLabel control={<Checkbox checked={!!u.enabled} onChange={e => upd(i, 'enabled', e.target.checked)} />} label="Login enabled" /></Stack>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1 }}><Button size="small" variant="contained" onClick={() => work(async () => { await api('stafftime.save', { _rid: rid(), name: u.name, start: u.start, close: u.close, enabled: u.enabled }); toast('Saved'); setN(x => x + 1); })}>Save</Button>
        <Button size="small" variant="outlined" onClick={() => work(async () => { await api('stafftime.extra', { _rid: rid(), name: u.name }); toast('+1 hour access ' + u.name + ' ne apyu'); setN(x => x + 1); })}>+1 hour access</Button>{u.extraActive && <small>Extra access {u.extraUntil} sudhi</small>}</Stack>
    </CardContent></Card>) : <Card><CardContent>No staff found</CardContent></Card>}</Stack>;
}
