/* ---------- Price Compare (admin only, read-only; nothing is saved). Same logic as JS_Views4.html ---------- */
import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { api, inr, csvDownload, toast } from '../lib/core.js';
import { PageHead, Skel, DataTable, Section } from '../lib/ui.jsx';
import { qBulkParse } from './Quotes.jsx';

const PCM = { tab: 'paste', v: [{ n: '', t: '' }, { n: '', t: '' }, { n: '', t: '' }], g: 0, shown: 0 };
function pcmNorm(x) { return String(x || '').toLowerCase().replace(/(\d)\s+(gb|tb|mb|gen|mhz|w|inch)\b/g, '$1$2').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); }
function pcmSim(a, b) { const A = new Set(a), B = new Set(b); let i = 0; A.forEach(x => { if (B.has(x)) i++; }); return i / Math.max(1, Math.max(A.size, B.size)); }
function pcmCalc(gIn) {
  const g = +gIn || 0, items = [];
  PCM.v.forEach((v, vi) => { qBulkParse(v.t, 0).forEach(l => { const tk = pcmNorm(l.name); let it = items.find(x => pcmSim(x.tk, tk) >= 0.75); if (!it) { it = { name: l.name, tk, p: [] }; items.push(it); } const pr = Math.round(l.base * (1 + g / 100) * 100) / 100; if (it.p[vi] == null || pr < it.p[vi]) it.p[vi] = pr; }); });
  const act = PCM.v.map((v, i) => i).filter(i => PCM.v[i].t.trim());
  items.forEach(it => { const vals = act.filter(i => it.p[i] != null); it.best = vals.length ? vals.reduce((a, i) => it.p[i] < it.p[a] ? i : a, vals[0]) : -1; it.min = it.best >= 0 ? it.p[it.best] : 0; it.max = vals.length ? Math.max(...vals.map(i => it.p[i])) : 0; it.cnt = vals.length; });
  const tot = act.map(i => items.reduce((s, it) => s + (it.p[i] != null ? it.p[i] : 0), 0)), cnt = act.map(i => items.filter(it => it.p[i] != null).length);
  return { act, items, tot, cnt, bestMix: items.reduce((s, it) => s + it.min, 0) };
}
const CsvBtn = ({ n, h, rows }) => <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => csvDownload(n, h, rows)} sx={{ my: 1 }}>CSV</Button>;
const green = { color: '#16a34a', fontWeight: 700 };

export default function Pcmp() {
  const [tab, setTab] = useState(PCM.tab);
  const sw = t => { PCM.tab = t; setTab(t); };
  return <Box>
    <PageHead title="Price Compare" />
    <Stack direction="row" gap={1} sx={{ mb: 2 }}><Button variant={tab === 'paste' ? 'contained' : 'outlined'} onClick={() => sw('paste')}>Paste lists &amp; compare</Button><Button variant={tab === 'hist' ? 'contained' : 'outlined'} onClick={() => sw('hist')}>Old purchase bills</Button></Stack>
    {tab === 'paste' ? <Paste /> : <Hist />}
  </Box>;
}

function Hist() {
  const [r, setR] = useState(null);
  useEffect(() => { api('rep.vendors', {}, { loader: true }).then(setR, e => toast(e.message, 'bad')); }, []);
  if (!r) return <Skel />;
  return <Box>
    <Alert severity="info">Juna received purchase bill par thi. Green = sauthi sasto vendor (latest price). {r.multi} products ek thi vadhare vendor pase thi kharidela chhe.</Alert>
    <CsvBtn n="vendor-prices.csv" h={['Product', 'Vendor', 'Last price', 'Last date', 'Lowest', 'Times']} rows={r.rows.flatMap(x => x.vendors.map(v => [x.name, v.vendor, v.last, v.lastDate, v.min, v.n]))} />
    <DataTable rows={r.rows} empty="No purchase bills yet" cols={[
      { h: 'Product', k: x => <><b>{x.name}</b><br /><small>{x.category}</small></> },
      { h: 'Vendors (latest price)', k: x => x.vendors.map((v, i) => <div key={i} style={v.vendor === x.best && x.vendors.length > 1 ? green : undefined}>{v.vendor}: {inr(v.last)} <small>({v.lastDate}{v.min !== v.max ? `, ${inr(v.min)}–${inr(v.max)}` : ''})</small></div>) },
      { h: 'Saving', k: x => x.saving ? inr(x.saving) : '-', align: 'right' }]} />
  </Box>;
}

function Paste() {
  const [, setN] = useState(0), re = () => setN(n => n + 1);
  const [res, setRes] = useState(PCM.shown ? pcmCalc(PCM.g) : null);
  const go = () => { PCM.shown = 1; setRes(pcmCalc(PCM.g)); };
  return <Box>
    <Section title={<>Vendor ni price list paste karo <small style={{ fontWeight: 400 }}>(dar line: product name ane chhelle price)</small></>}>
      <Stack direction="row" gap={1.5} flexWrap="wrap">{PCM.v.map((v, i) => <Box key={i} sx={{ flex: '1 1 260px' }}>
        <TextField fullWidth size="small" label={`Vendor ${i + 1} name`} placeholder={`Vendor ${i + 1}`} value={v.n} onChange={e => { v.n = e.target.value; re(); }} />
        <TextField fullWidth multiline minRows={7} sx={{ mt: 1 }} placeholder={'I5 10 GEN 2050\n16 GB RAM DDR4 8000'} value={v.t} onChange={e => { v.t = e.target.value; re(); }} /></Box>)}</Stack>
      <Stack direction="row" gap={1.5} alignItems="center" sx={{ mt: 1.5 }}><TextField size="small" label="GST % (sab vendor par)" sx={{ maxWidth: 200 }} inputProps={{ inputMode: 'decimal' }} value={PCM.g} onChange={e => { PCM.g = e.target.value; re(); }} /><Button variant="contained" onClick={go}>Compare</Button></Stack>
    </Section>
    <Box sx={{ mt: 2 }}><Result c={res} /></Box>
  </Box>;
}

function Result({ c }) {
  if (!c || !c.act.length || !c.items.length) return <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">Kam se kam ek vendor ni list paste karo, pachhi Compare dabavo.</Typography></Paper>;
  const nm = i => PCM.v[i].n.trim() || 'Vendor ' + (i + 1);
  const cols = [{ h: 'Item', k: it => <b>{it.name}</b> }].concat(c.act.map(i => ({ h: nm(i), k: it => it.p[i] == null ? <span style={{ color: '#94a3b8' }}>-</span> : <span style={it.best === i && it.cnt > 1 ? green : undefined}>{inr(it.p[i])}</span>, align: 'right' })))
    .concat([{ h: 'Best', k: it => it.cnt > 1 ? <b style={{ color: '#16a34a' }}>{nm(it.best)}</b> : it.cnt === 1 ? <small>only 1 vendor</small> : '' }, { h: 'Saving', k: it => it.cnt > 1 ? inr(it.max - it.min) : '-', align: 'right' }]);
  const full = c.act.map((i, k) => c.cnt[k] === c.items.length ? [c.tot[k], nm(i)] : null).filter(Boolean).sort((a, b) => a[0] - b[0])[0];
  return <Box>
    <Stack direction="row" gap={1.5} flexWrap="wrap">{c.act.map((i, k) => <Paper key={i} sx={{ flex: '1 1 150px', p: 1.5, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">{nm(i)} total ({c.cnt[k]} items)</Typography><Typography variant="h6" fontWeight={800}>{inr(c.tot[k])}</Typography></Paper>)}
      <Paper sx={{ flex: '1 1 150px', p: 1.5, borderRadius: 3, bgcolor: '#ecfdf5' }}><Typography variant="caption" color="text.secondary">Sab item sauthi sasta vendor thi</Typography><Typography variant="h6" fontWeight={800} sx={{ color: '#16a34a' }}>{inr(c.bestMix)}</Typography></Paper></Stack>
    <Alert severity="info" sx={{ my: 1.5 }}>{full ? <>Ek j vendor thi badhu levu hoy to sauthi sasto: <b>{full[1]}</b> {inr(full[0])}. Alag alag sasta thi levathi bachat: <b>{inr(full[0] - c.bestMix)}</b>.</> : 'Koi ek vendor pase badha item nathi. Je item ma "-" chhe te te vendor pase nathi.'}</Alert>
    <CsvBtn n="price-compare.csv" h={['Item'].concat(c.act.map(nm), ['Best vendor', 'Lowest'])} rows={c.items.map(it => [it.name].concat(c.act.map(i => it.p[i] == null ? '' : it.p[i]), [it.best >= 0 ? nm(it.best) : '', it.min]))} />
    <DataTable rows={c.items} cols={cols} />
  </Box>;
}
