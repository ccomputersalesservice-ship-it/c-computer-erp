/* ================= Order Task: write tasks for any day (default: tomorrow), tick when done ================= */
import React, { useEffect, useState } from 'react';
import { Box, Button, Checkbox, IconButton, Paper, Stack, TextField, Typography, Chip } from '@mui/material';
import { api, rid, toast, work } from '../lib/core.js';
import { PageHead, Skel, confirmBox } from '../lib/ui.jsx';

const ymd = d => { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const label = (d, t, tm) => d === t ? 'Aaj' : d === tm ? 'Aavti kal' : d < t ? 'Jooni tarikh' : d;

export default function Tasks() {
  const [rows, setRows] = useState(null), [n, setN] = useState(0), [text, setText] = useState(''), [cust, setCust] = useState(''), [date, setDate] = useState(addDays(1)), [showDone, setShowDone] = useState(false);
  const t = addDays(0), tm = addDays(1), reload = () => setN(x => x + 1);
  useEffect(() => { api('tasks.list', {}, { fresh: true }).then(r => setRows(r.rows), e => { setRows([]); toast(e.message, 'bad'); }); }, [n]);
  const add = () => work(async () => {
    await api('tasks.save', { text, customer: cust, date }, { rid: rid() });
    setText(''); setCust(''); toast('Task add thayo ✓', 'ok'); reload();
  });
  const tick = (r, v) => { setRows(rows.map(x => x.id === r.id ? { ...x, done: v } : x)); api('tasks.done', { id: r.id, done: v }).then(reload, e => { toast(e.message, 'bad'); reload(); }); };
  const del = r => confirmBox('Task delete karvo? ' + r.text).then(ok => { if (ok) work(async () => { await api('tasks.del', { id: r.id }); reload(); }); });
  const list = (rows || []).filter(r => showDone || !r.done);
  const groups = {}; list.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });
  const dates = Object.keys(groups).sort();
  return <Box><PageHead title="Order Task" />
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack gap={1.5}>
        <TextField label="Task / order shu karvanu chhe" value={text} onChange={e => setText(e.target.value)} multiline minRows={2} fullWidth />
        <Stack direction="row" gap={1} flexWrap="wrap">
          <TextField label="Customer (jaruri hoy to)" value={cust} onChange={e => setCust(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
          <TextField label="Tarikh" type="date" value={date} onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button size="small" variant={date === t ? 'contained' : 'outlined'} onClick={() => setDate(t)}>Aaj</Button>
          <Button size="small" variant={date === tm ? 'contained' : 'outlined'} onClick={() => setDate(tm)}>Aavti kal</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" disabled={!text.trim() || !date} onClick={add}>+ Add task</Button>
        </Stack>
      </Stack>
    </Paper>
    <Stack direction="row" alignItems="center" sx={{ mb: 1 }}><Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Tasks</Typography>
      <Button size="small" onClick={() => setShowDone(v => !v)}>{showDone ? 'Done chhupavo' : 'Done pan batavo'}</Button></Stack>
    {rows === null ? <Skel /> : !dates.length ? <Typography color="text.secondary">Koi task nathi.</Typography> :
      dates.map(d => <Box key={d} sx={{ mb: 2 }}>
        <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.5 }}><Typography fontWeight={700} color={d < t ? 'error' : 'text.primary'}>{label(d, t, tm)}</Typography>
          <Chip size="small" label={d} /></Stack>
        {groups[d].map(r => <Paper key={r.id} variant="outlined" sx={{ p: 1, mb: 0.75, display: 'flex', alignItems: 'flex-start', gap: 0.5, opacity: r.done ? 0.55 : 1 }}>
          <Checkbox checked={r.done} onChange={e => tick(r, e.target.checked)} />
          <Box sx={{ flex: 1, pt: 0.75 }}>
            <Typography sx={{ textDecoration: r.done ? 'line-through' : 'none', whiteSpace: 'pre-wrap' }}>{r.text}</Typography>
            <Typography variant="caption" color="text.secondary">{[r.customer && '👤 ' + r.customer, r.by && 'by ' + r.by].filter(Boolean).join('  ·  ')}</Typography>
          </Box>
          <IconButton size="small" onClick={() => del(r)} title="Delete">✕</IconButton>
        </Paper>)}
      </Box>)}
  </Box>;
}
