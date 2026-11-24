import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Tab, Tabs, Chip, Checkbox, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { api, S, LI, LT, rid, toast, work } from '../lib/core.js';
import { PageHead, Skel, DataTable, openDialog } from '../lib/ui.jsx';

export default function Users({ params }) {
  const [tab, setTab] = useState(params.tab || 'users'), [r, setR] = useState(null), [lq, setLq] = useState(params.lq || ''), [n, setN] = useState(0);
  const reload = () => setN(x => x + 1);
  useEffect(() => { let on = true; setR(null); (tab === 'users' ? api('users.list', {}) : api('log.list', { q: lq })).then(x => { if (on) { setR(x); if (tab === 'users') S.ulist = x; } }, e => toast(e.message, 'bad')); return () => { on = false; }; }, [tab, lq, n]);
  return <Box>
    <PageHead title={LI('users')}>{tab === 'users' && <Button variant="contained" startIcon={<AddIcon />} onClick={() => userForm(null, reload)}>{LT('add')}</Button>}</PageHead>
    <Tabs value={tab} onChange={(e, v) => { params.tab = v; setTab(v); }} sx={{ mb: 2 }}><Tab value="users" label={LI('users')} /><Tab value="log" label="Audit Log" /></Tabs>
    {tab === 'log' && <TextField placeholder="Search log" defaultValue={lq} onKeyDown={e => { if (e.key === 'Enter') { params.lq = e.target.value; setLq(e.target.value); } }} onBlur={e => { params.lq = e.target.value; setLq(e.target.value); }} sx={{ mb: 2, bgcolor: '#fff', width: '100%', maxWidth: 420 }} />}
    {!r ? <Skel /> : tab === 'users'
      ? <DataTable rows={r} onRow={u => userForm(u, reload)} cols={[{ h: 'Login ID', k: u => <b>{u.loginId}</b> }, { h: LT('name'), k: u => u.name }, { h: 'Role', k: u => u.role === 'ADMIN' ? <Chip size="small" color="secondary" label="Admin" /> : u.role === 'ACCOUNTS' ? <Chip size="small" color="warning" label="Accounts" /> : <Chip size="small" color="info" label="Sales Staff" /> }, { h: 'Last login', k: u => u.lastLogin || '-' }, { h: LT('status'), k: u => u.active ? <Chip size="small" color="success" label={LT('active')} /> : <Chip size="small" color="error" label="Off" /> }]} />
      : <DataTable rows={r.rows} cols={[{ h: LT('date'), k: l => l.dt, nw: true }, { h: 'User', k: l => l.user }, { h: 'Action', k: l => <Chip size="small" label={l.action} /> }, { h: 'Ref', k: l => l.id }, { h: 'Details', k: l => l.details }]} />}
  </Box>;
}
function UserForm({ u, v }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  return <Stack gap={2} sx={{ pt: 1 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth label="Login ID *" value={v.loginId} inputProps={{ autoCapitalize: 'off' }} onChange={e => set('loginId', e.target.value)} /><TextField fullWidth label={LT('name') + ' *'} value={v.name} onChange={e => set('name', e.target.value)} /></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField select fullWidth label="Role" value={v.role} onChange={e => set('role', e.target.value)}><MenuItem value="STAFF">Sales Staff (no prices)</MenuItem><MenuItem value="ACCOUNTS">Accounts (adds prices)</MenuItem><MenuItem value="ADMIN">Admin / Owner</MenuItem></TextField>
      <TextField fullWidth type="password" label={u ? 'New PIN (leave blank to keep)' : 'PIN (4-8 digits) *'} inputProps={{ inputMode: 'numeric', maxLength: 8, autoComplete: 'new-password' }} value={v.pin} onChange={e => set('pin', e.target.value)} /></Stack>
    {u && <FormControlLabel control={<Checkbox checked={v.active} onChange={e => set('active', e.target.checked)} />} label={LT('active')} />}
  </Stack>;
}
function userForm(u, reload) {
  const v = { loginId: u ? u.loginId : '', name: u ? u.name : '', role: u ? u.role : 'STAFF', pin: '', active: u ? !!u.active : true }, _rid = rid();
  openDialog(u ? u.name : 'New user', () => <UserForm u={u} v={v} />, {
    maxWidth: 'sm', actions: close => <Button variant="contained" onClick={() => work(async () => { await api('users.save', { id: u ? u.id : undefined, loginId: v.loginId, name: v.name, role: v.role, pin: v.pin, active: u ? v.active : true }, { rid: _rid }); toast('Saved', 'ok'); close(); reload(); })}>{LT('save')}</Button>
  });
}
