import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography, Alert, Checkbox, FormControlLabel, Link } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { api, S, LI, LT, rid, toast, work } from '../lib/core.js';
import { PageHead, Skel, Section, Grid, openDialog } from '../lib/ui.jsx';
import { go } from '../lib/nav.js';

export default function Settings() {
  const [s, setS] = useState(null), [bi, setBi] = useState(null), [n, setN] = useState(0), [op, setOp] = useState(''), [ok, setOk] = useState(false);
  useEffect(() => { Promise.all([api('settings.get', {}), api('backup.info', {})]).then(([a, b]) => { setS(a); setBi(b); }, e => toast(e.message, 'bad')); }, [n]);
  if (!s || !bi) return <><PageHead title={LI('settings')} /><Skel /></>;
  const set = (k, v) => setS({ ...s, [k]: v });
  const F = (k, label, o) => <TextField fullWidth label={label} value={s[k] == null ? '' : s[k]} onChange={e => set(k, e.target.value)} {...(o || {})} />;
  return <Box>
    <PageHead title={LI('settings')} />
    <Button size="small" variant="outlined" sx={{ mb: 2 }} onClick={() => go('dbtest')}>🧪 Database test (speed)</Button>
    <Grid cols={2}>
      <Section title="Shop & rules"><Stack gap={2}>
        {F('SHOP_NAME', 'Shop name')}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>{F('SHOP_PHONE', 'Phone')}{F('SHOP_ADDRESS', 'Address')}</Stack>
        {F('CATEGORIES', 'Categories (comma separated, keep Other)', { multiline: true, minRows: 2 })}
        {F('STAFF_ORDER_STATUSES', 'Order statuses staff may set (comma separated: Reserved,Processing,Ready,Delivered,Cancelled)')}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
          {F('STAFF_CAN_ADD_PRODUCT', 'Staff can add new products?', { select: true, children: ['NO', 'YES'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>) })}
          {F('DEFAULT_LABEL', 'Default label', { select: true, children: ['50x25', '20x10'].map(x => <MenuItem key={x} value={x}>{x}</MenuItem>) })}
          {F('DEFAULT_LANG', 'Default language', { select: true, children: [['both', 'English + Gujarati'], ['en', 'English'], ['gu', 'Gujarati']].map(x => <MenuItem key={x[0]} value={x[0]}>{x[1]}</MenuItem>) })}
        </Stack>
        <Typography fontWeight={800}>Fast / Slow / Dead rules</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>{F('FAST_MIN_30D', 'Fast: sold in 30 days at least', { type: 'number' })}{F('SLOW_MAX_90D', 'Slow: sold in 90 days at most', { type: 'number' })}{F('DEAD_DAYS', 'Dead after (days)', { type: 'number' })}</Stack>
        <Button variant="contained" onClick={() => work(async () => { const v = {}; ['SHOP_NAME', 'SHOP_PHONE', 'SHOP_ADDRESS', 'CATEGORIES', 'STAFF_ORDER_STATUSES', 'STAFF_CAN_ADD_PRODUCT', 'DEFAULT_LABEL', 'DEFAULT_LANG', 'FAST_MIN_30D', 'SLOW_MAX_90D', 'DEAD_DAYS'].forEach(k => { v[k] = s[k] == null ? '' : String(s[k]); }); await api('settings.save', { values: v }, { rid: rid() }); toast('Saved', 'ok'); S.boot = await api('bootstrap'); })}>{LT('save')}</Button>
      </Stack></Section>
      <Stack gap={2}>
        <Section title={LT('backup')}>
          <Typography>Daily automatic backup: <b>{bi.daily ? 'ON' : 'OFF'}</b>{bi.daily ? '' : ' (turn on from the Google Sheet menu: C COMPUTER ERP → Turn on daily backup)'}</Typography>
          <Stack direction="row" gap={1} sx={{ my: 1 }}><Button variant="contained" color="success" startIcon={<DownloadIcon />} onClick={() => work(async () => { const r = await api('backup.run', {}); toast('Backup saved: ' + r.name, 'ok'); setN(x => x + 1); })}>Backup now</Button>
            <Button variant="outlined" onClick={() => work(async () => { const r = await api('backup.xlsx', {}); openDialog('Excel export', () => <Stack gap={1}><Typography>Saved in your private Drive backup folder.</Typography><Button variant="contained" href={r.url} target="_blank" rel="noopener">Open file</Button></Stack>, { maxWidth: 'xs' }); })}>Export to Excel</Button></Stack>
          {bi.files.length ? bi.files.slice(0, 6).map(f => <div key={f.url}><Link href={f.url} target="_blank" rel="noopener">{f.name}</Link></div>) : <small>No backup yet</small>}
        </Section>
        <Section title="Opening stock (from Hisab.co)"><Stack gap={1.5}>
          <Alert severity="warning">Use only AFTER you counted the shop stock and approved it. One line per product: <code>ProductID, quantity, serial1;serial2</code>. Hisab.co data is never touched.</Alert>
          <TextField multiline minRows={4} placeholder={'CC-PRD-00004, 25\nCC-PRD-00001, 2, SN1111;SN2222'} value={op} onChange={e => setOp(e.target.value)} />
          <FormControlLabel control={<Checkbox checked={ok} onChange={e => setOk(e.target.checked)} />} label="Stock audit done and owner approved" />
          <Button variant="contained" onClick={() => work(async () => {
            const rows = op.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const p = l.split(',').map(x => x.trim()); return { productId: p[0], qty: +p[1], serials: (p[2] || '').split(';').map(x => x.trim()).filter(Boolean) }; });
            const r = await api('stock.opening', { rows, approved: ok }, { rid: rid() }); toast('Imported ' + r.length + ' product(s)', 'ok'); setOp('');
          })}>Import opening stock</Button>
        </Stack></Section>
      </Stack>
    </Grid>
  </Box>;
}
