import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography, Tab, Tabs, Chip, Paper, Checkbox, FormControlLabel, Link } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api, S, inr, isAdmin, rid, toast, work, CRM_STAFF_URL, barcodeSvg, esc, LOGO } from '../lib/core.js';
import { doPrint } from './Print.jsx';
import { PageHead, Skel, Pager, DataTable, openDialog } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { refresh } from '../lib/nav.js';

/* ---------- CRM (existing service CRM, opened inside the ERP) ---------- */
export function Crm() {
  const u = CRM_STAFF_URL + encodeURIComponent(String((S.user && S.user.name) || '').trim().split(/\s+/)[0].toUpperCase());
  return <Box><iframe title="CRM" src={u} style={{ width: '100%', height: 'calc(100vh - 130px)', minHeight: 520, border: 0, borderRadius: 10, background: '#fff' }} allow="camera;microphone;clipboard-write" />
    <Box sx={{ textAlign: 'right', mt: .5 }}><small><Link href={u} target="_blank" rel="noopener">Blank dekhay to: navi tab ma kholo</Link></small></Box></Box>;
}

/* ---------- Service Records (from the shop's CRM sheet) ---------- */
export const sv = { q: '', status: '', page: 1, size: 25 };
const SV_ST = ['Pending', 'Processing', 'Ready', 'Delivered', 'Returned', 'Replacement'];
const SV_COL = { Pending: 'warning', Processing: 'info', Ready: 'success', Delivered: 'default', Returned: 'error', Replacement: 'error' };
const SV_HEX = { Pending: ['#d97706', '#fffbeb'], Processing: ['#2563eb', '#eff6ff'], Ready: '#16a34a', Delivered: ['#7e22ce', '#faf5ff'], Returned: ['#dc2626', '#fef2f2'], Replacement: ['#db2777', '#fdf2f8'] };
SV_HEX.Ready = ['#16a34a', '#f0fdf4'];
const svT = t => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/); if (!m) return t || ''; if (m[3]) return (+m[1]) + ':' + m[2] + ' ' + m[3].toUpperCase(); let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap; };
/* Ready but fully paid = customer already took it -> show Delivered (needs Bill and Paid, which only Admin gets) */
export const svEff = j => (j.status === 'Ready' && +j.total > 0 && +j.paid >= +j.total) ? 'Delivered' : j.status;
const SvPill = ({ s }) => <Chip size="small" color={SV_COL[s] || 'default'} label={s || '-'} sx={{ fontWeight: 700 }} />;
const svNext = s => ({ Pending: 'Processing', Processing: 'Ready', Ready: 'Delivered' })[s] || '';
function svWa(j) {
  const ph = String(j.phone || '').replace(/\D/g, '').slice(-10), dev = (j.brand + ' ' + j.device).trim();
  const msg = j.status === 'Ready' ? `Namaste ${j.name}, tamaru ${dev} (Job ${j.sid}) taiyar chhe. Aapni anukulata e lai jasho. - C COMPUTER, Katargam`
    : j.status === 'Delivered' ? `Namaste ${j.name}, C COMPUTER ma service mate aabhar. Job ${j.sid}. Kai pan takleef hoy to jarur kahejo.`
      : `Namaste ${j.name}, tamaru ${dev} (Job ${j.sid}) amne malyu chhe. Status: ${j.status}. - C COMPUTER, Katargam`;
  return 'https://wa.me/91' + ph + '?text=' + encodeURIComponent(msg);
}

export default function Service() {
  const [f, set] = useFilter(sv);
  const [r, reload] = useList('crm.jobs', f);
  useEffect(() => { window.addEventListener('cc-newjob', reload); return () => window.removeEventListener('cc-newjob', reload); }, []);
  const q = useDebounced(v => set('q', v), 300);
  const adm = isAdmin();
  const cols = [{ h: 'Job', k: j => <><b>{j.sid}</b>{j.urgent ? ' 🔥' : ''}{j.onsite ? ' 📍' : ''}</> }, { h: 'Date', k: j => <>{j.date}{j.time ? <><br /><small>{svT(j.time)}</small></> : null}</>, nw: true }, { h: 'Customer', k: j => <><b>{j.name}</b><br /><small>{j.phone}</small></> }, { h: 'Device', k: j => (j.brand + ' ' + j.device).trim() }, { h: 'Status', k: j => <SvPill s={svEff(j)} /> }];
  if (adm) cols.push({ h: 'Bill', k: j => inr(j.total), align: 'right' }, { h: 'Paid', k: j => inr(j.paid), align: 'right' });
  return <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: { xs: 1.5, sm: 2 }, borderRadius: 3, color: '#fff', background: 'linear-gradient(120deg,#be185d 0%,#7e22ce 100%)', boxShadow: '0 6px 18px rgba(126,34,206,.25)' }}>
      <img src={LOGO} alt="C COMPUTER" style={{ height: 68, width: 68, objectFit: 'contain', background: '#fff', borderRadius: 14, padding: 6 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>Service Records</Typography><Typography sx={{ opacity: .9, fontSize: 13 }}>C COMPUTER · Sales | Service | Accessories</Typography></Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={newJob} sx={{ bgcolor: '#fff', color: '#be185d', fontWeight: 800, '&:hover': { bgcolor: '#fdf2f8' } }}>Navo Job</Button>
    </Box>
    <TextField placeholder="Job no / name / mobile / device" defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ mb: 1, width: '100%', maxWidth: 420, bgcolor: '#fff' }} />
    {r && !r.error && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>{[['', 'All', r.all, '#475569', '#f1f5f9'], ...SV_ST.map(x => [x, x, r.counts[x] || 0, SV_HEX[x][0], SV_HEX[x][1]])].map(([v, lb, n, c, bg]) => { const on = f.status === v; return <Box key={v || 'all'} onClick={() => set('status', v)} sx={{ cursor: 'pointer', userSelect: 'none', minWidth: { xs: 'calc(33% - 8px)', sm: 104 }, flex: { xs: '1 1 calc(33% - 8px)', sm: '0 0 auto' }, px: 1.5, py: 1, borderRadius: 2.5, textAlign: 'center', border: '2px solid ' + c, bgcolor: on ? c : bg, color: on ? '#fff' : c, boxShadow: on ? '0 4px 12px ' + c + '55' : 'none', transition: 'all .15s', '&:hover': { transform: 'translateY(-2px)' } }}><Box sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{n}</Box><Box sx={{ fontSize: 12.5, fontWeight: 700 }}>{lb}</Box></Box>; })}</Box>}
    {!r ? <Skel /> : <><DataTable rows={f.status === 'Ready' ? r.rows.filter(j => svEff(j) === 'Ready') : f.status === 'Delivered' ? r.rows : r.rows} cols={cols} empty="No service records" onRow={j => openJob(j.id)} /><Pager res={r} onPage={p => set('page', p)} /></>}
  </Box>;
}

/* ---------- Job sticker (same as the CRM sticker: 50x25, no shop-name line, one label) ---------- */
const STK_KEY = 'ccJobStk2';
const stkGet = () => { try { const o = JSON.parse(localStorage.getItem(STK_KEY) || '{}'); return { w: +o.w || 50, h: +o.h || 25, sc: +o.sc || 100, ask: o.ask !== false }; } catch (e) { return { w: 50, h: 25, sc: 100, ask: true }; } };
function stkPrint(j, S) {
  const W = S.w, H = S.h, sc = S.sc / 100, due = Math.max(0, (j.total || 0) - (j.paid || 0)), bc = barcodeSvg(String(j.sid || ''), { style: 'display:block;margin:0 auto' }), bw = Math.min(W - 4, bc.modules * 0.375);
  const t = 'font:7.5pt Arial;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  const svg = bc.svg.replace('<svg ', `<svg style="margin:0 auto" width="${bw}mm" height="5.5mm" `);
  const html = `<div class="lbl" style="width:${W}mm;height:${H}mm;padding:0;box-sizing:border-box;justify-content:flex-start"><div style="width:${W - 4}mm;margin:0 auto;padding-top:.8mm;transform:scale(${sc});transform-origin:top center"><div style="margin:.5mm 0">${svg}</div><div style="font:800 11pt Arial;line-height:1.1;text-align:center;letter-spacing:1px">${esc(j.sid)}</div><div style="${t}"><b>${esc(j.name)}</b> ${esc(j.phone)}</div><div style="${t}">${esc(j.device)}${j.brand ? ' - ' + esc(j.brand) : ''} | ${esc(j.date)}</div><div style="${t}">${esc(j.issue)}</div></div></div>`;
  doPrint(html, [W, H]);
}
function StkForm({ S }) {
  const [, setN] = useState(0); const set = (k, x) => { S[k] = x; setN(n => n + 1); };
  return <Stack gap={1.5}>
    <Typography variant="body2" color="text.secondary">Printer EX58L. Tamara printer (LABEL) nu paper 50 x 25 che, etle Height 25 rakho. Sticker upar-niche khisake to Scale 95 karo.</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap">{[[50, 25], [50, 24], [50, 30]].map(([w, h]) => <Chip key={h} label={w + ' x ' + h} onClick={() => { S.w = w; S.h = h; setN(n => n + 1); }} color={S.w === w && S.h === h ? 'primary' : 'default'} />)}</Stack>
    <TextField type="number" label="Width (mm)" value={S.w} onChange={e => set('w', +e.target.value)} />
    <TextField type="number" label="Height (mm)" value={S.h} onChange={e => set('h', +e.target.value)} />
    <TextField type="number" label="Scale % (100 = normal, nanu karva 90)" value={S.sc} onChange={e => set('sc', +e.target.value)} />
    <FormControlLabel control={<Checkbox checked={!S.ask} onChange={e => set('ask', !e.target.checked)} />} label="Aa size yaad rakho, pachhi puchhvu nahi" />
  </Stack>;
}
function jobSticker(j) {
  const S0 = stkGet();
  if (!S0.ask) return stkPrint(j, S0);
  openDialog('Sticker size', () => <StkForm S={S0} />, {
    maxWidth: 'xs', actions: close => <><Button color="inherit" onClick={close}>Cancel</Button><Button variant="contained" onClick={() => {
      if (!(S0.w >= 20 && S0.h >= 10 && S0.sc >= 50 && S0.sc <= 150)) return toast('Size barabar nakho', 'bad');
      try { localStorage.setItem(STK_KEY, JSON.stringify(S0)); } catch (e) { }
      close(); stkPrint(j, S0);
    }}>Print</Button></>
  });
}
async function openJob(id) {
  let j; try { j = await api('crm.job', { id }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); }
  const adm = isAdmin(), due = adm ? Math.max(0, (j.total || 0) - (j.paid || 0)) : 0;
  const v = { status: svNext(j.status), rd: '', w: '', say: '', est: '', bill: '', pay: '', mode: '', dto: j.name }, _rid = rid();
  openDialog(j.sid + ' · ' + j.name, () => <JobView j={j} v={v} adm={adm} due={due} />, {
    maxWidth: 'sm', actions: close => <>
      <Button variant="outlined" href={svWa(j)} target="_blank" rel="noopener">💬 WhatsApp</Button><Button variant="outlined" onClick={() => jobSticker(j)}>🏷 Sticker</Button><Button color="inherit" onClick={close}>Close</Button>
      <Button variant="contained" color="success" onClick={() => work(async () => {
        const b = { id: j.id, status: v.status, w: v.w, say: v.say, est: +v.est || 0, bill: +v.bill || 0, pay: +v.pay || 0, mode: v.mode, rd: v.rd, dto: v.status === 'Delivered' ? v.dto : '' };
        if (b.pay && !b.mode) throw new Error('Payment kya aavyu te pasand karo (Cash / HDFC / IDBI).');
        await api('crm.jobupd', b, { rid: _rid }); toast('Saved ✓', 'ok'); close(); if (S.route === 'service') refresh();
      })}>Save</Button></>
  });
}
function JobView({ j, v, adm, due }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  const log = (j.log || []).slice().reverse();
  return <Stack gap={1.5}>
    <Typography><b>{(j.brand + ' ' + j.device).trim()}</b> <SvPill s={j.status} />{j.urgent ? ' 🔥' : ''}<br />Mobile: <a href={'tel:' + j.phone}>{j.phone}</a> · Date: {j.date} {svT(j.time)}<br />Problem: {j.issue}<br />{j.acc && <>Accessories: {j.acc}<br /></>}
      {adm && <>Bill: {inr(j.total)} · Paid: {inr(j.paid)}{due ? <> · <b style={{ color: '#dc2626' }}>Baki {inr(due)}</b></> : null}<br /></>}{j.fu_next && <>Follow-up: {j.fu_next} {j.fu_note}<br /></>}Taken by: {j.by}</Typography>
    <Paper variant="outlined" sx={{ p: 2 }}><Typography fontWeight={800} sx={{ mb: 1 }}>Update karo</Typography><Stack gap={1.5}>
      <Stack direction="row" gap={1.5}><TextField select fullWidth label="Navo status" value={v.status} onChange={e => set('status', e.target.value)} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}><MenuItem value="">(same - {j.status})</MenuItem>{SV_ST.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField><TextField fullWidth type="date" label="Ready date" InputLabelProps={{ shrink: true }} value={v.rd} onChange={e => set('rd', e.target.value)} /></Stack>
      <TextField label="Shu kaam karyu / shu problem chhe" placeholder="e.g. SSD nakhvi padse" value={v.w} onChange={e => set('w', e.target.value)} />
      <TextField label="Customer e shu kahyu" placeholder="e.g. call kari ne puchhvu" value={v.say} onChange={e => set('say', e.target.value)} />
      <Stack direction="row" gap={1.5}><TextField fullWidth type="number" label="Estimate ₹" inputProps={{ min: 0 }} value={v.est} onChange={e => set('est', e.target.value)} /><TextField fullWidth type="number" label="Final Bill ₹" inputProps={{ min: 0 }} value={v.bill} onChange={e => set('bill', e.target.value)} /></Stack>
      <Stack direction="row" gap={1.5}><TextField fullWidth type="number" label="Payment malyu ₹" inputProps={{ min: 0 }} value={v.pay} onChange={e => set('pay', e.target.value)} /><TextField select fullWidth label="Kya aavya" value={v.mode} onChange={e => set('mode', e.target.value)}><MenuItem value="">--</MenuItem>{['Cash', 'HDFC', 'IDBI', 'Wallet'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Stack>
      {v.status === 'Delivered' && <TextField label="Kone aapyu (Delivered to)" value={v.dto} onChange={e => set('dto', e.target.value)} />}
    </Stack></Paper>
    <Typography variant="h6" fontWeight={800}>History</Typography>
    {log.length ? log.map((l, i) => <Box key={i} sx={{ borderLeft: '3px solid #cbd5e1', px: 1.2, py: .3 }}><small>{l.t || ''} · {l.by || ''}</small><br /><SvPill s={l.s} />{l.w && <><br />{l.w}</>}{l.say && <><br /><i>{l.say}</i></>}{l.pk && <><br />Pickup: {l.pk}</>}{adm && l.est ? <><br />Estimate: {inr(l.est)}</> : null}{adm && l.bill ? <><br />Bill: {inr(l.bill)}</> : null}{adm && l.pay ? <><br />Paid: {inr(l.pay)}{l.mode ? ' (' + l.mode + ')' : ''}</> : null}{l.dto && <><br />Delivered to: {l.dto}</>}</Box>) : <small>No history</small>}
  </Stack>;
}
function NewJob({ v }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  const devs = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'UPS', 'On-Site Service', 'Other'], brands = ['HP', 'Dell', 'Lenovo', 'Acer', 'ASUS', 'Apple', 'MSI', 'LG', 'Samsung', 'Epson', 'Canon', 'Brother', 'Other'], accs = ['Charger', 'Adapter', 'Bag', 'Mouse', 'Keyboard', 'Power Cable', 'Other'];
  return <Stack gap={1.5} sx={{ pt: 1 }}>
    <Stack direction="row" gap={1.5}><TextField fullWidth autoFocus label="Customer naam *" value={v.name} onChange={e => set('name', e.target.value)} /><TextField fullWidth label="Mobile *" inputProps={{ inputMode: 'numeric', maxLength: 14 }} value={v.phone} onChange={e => set('phone', e.target.value)} /></Stack>
    <Stack direction="row" gap={1.5}><TextField select fullWidth label="Device *" value={v.device} onChange={e => set('device', e.target.value)}>{devs.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField><TextField select fullWidth label="Brand" value={v.brand} onChange={e => set('brand', e.target.value)}><MenuItem value="">&nbsp;</MenuItem>{brands.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Stack>
    <TextField multiline minRows={2} label="Problem *" placeholder="e.g. chalu nathi thatu" value={v.issue} onChange={e => set('issue', e.target.value)} />
    <Box><Typography variant="subtitle2">Sathe aavelu</Typography>{accs.map(x => <FormControlLabel key={x} control={<Checkbox checked={v.acc.includes(x)} onChange={e => set('acc', e.target.checked ? v.acc.concat([x]) : v.acc.filter(y => y !== x))} />} label={x} />)}</Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }}><TextField fullWidth label="Password / PIN (device nu)" autoComplete="off" value={v.devpin} onChange={e => set('devpin', e.target.value)} />
      <FormControlLabel control={<Checkbox checked={v.urgent} onChange={e => set('urgent', e.target.checked)} />} label="🔥 Urgent" /><FormControlLabel control={<Checkbox checked={v.onsite} onChange={e => set('onsite', e.target.checked)} />} label="📍 On-site" /></Stack>
  </Stack>;
}
export function newJob() {
  const v = { name: '', phone: '', device: 'Laptop', brand: '', issue: '', acc: [], devpin: '', urgent: false, onsite: false }, _rid = rid();
  openDialog('➕ Navo Service Job', () => <NewJob v={v} />, {
    maxWidth: 'sm', actions: close => <><Button color="inherit" onClick={close}>Cancel</Button><Button variant="contained" color="success" onClick={() => work(async () => {
      const r = await api('crm.jobnew', { name: v.name, phone: v.phone, device: v.device, brand: v.brand, issue: v.issue, acc: v.acc.join(', '), devpin: v.devpin, urgent: v.urgent, onsite: v.onsite }, { rid: _rid });
      close(); toast('Job ' + r.sid + ' banyo ✓', 'ok'); if (S.route === 'service') refresh();
      openDialog('✓ Job ' + r.sid, () => <Typography>Customer ne WhatsApp par job number moklo?</Typography>, { maxWidth: 'xs', actions: c2 => <><Button onClick={c2}>Na</Button><Button variant="contained" color="success" href={svWa({ name: v.name, phone: v.phone, brand: v.brand, device: v.device, sid: r.sid, status: 'Pending' })} target="_blank" rel="noopener">💬 WhatsApp</Button></> });
    })}>Save</Button></>
  });
}
