import React, { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AppBar, Avatar, Box, BottomNavigation, BottomNavigationAction, Button, ClickAwayListener, Drawer, IconButton, InputAdornment, List, ListItemButton,
  ListItemIcon, ListItemText, ListSubheader, Paper, Popper, Stack, TextField, ToggleButton, ToggleButtonGroup, Toolbar, Typography, useMediaQuery, Fab, Alert, Checkbox, FormControlLabel, Link
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LockIcon from '@mui/icons-material/LockOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/PersonOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { S, store, api, ui, toast, busy, swrClear, APIC, isAdmin, isAcct, LI, LT, LANGS, LOGO, ASSET_BASE, greetWord, debounce, work, CRM_URL, remote } from './lib/core.js';
import { UiHost, openDialog, Loading } from './lib/ui.jsx';
import { navStore, navItems, userMenus, go, setCrmBlocked, ROUTE_KEYS } from './lib/nav.js';
import { NAV_ICON } from './lib/icons.jsx';
import { PAGES } from './pages/index.js';
import { openProduct } from './pages/Products.jsx';
import { openCustomer } from './pages/Customers.jsx';
import { openOrder } from './pages/Sales.jsx';
import { openItem } from './pages/Serial.jsx';
import { openAssistant } from './pages/Assistant.jsx';
import { BrChip } from './pages/BuildRec.jsx';

const LGT = {
  en: { sub: 'Login to access your business dashboard.', id: 'Login ID / Username', pin: 'PIN / Password', rem: 'Remember Me', fg: 'Forgot Password?', go: 'Login', fgm: 'To reset your PIN, ask the Admin (Yogesh). Admin can set a new PIN in Users & Roles.' },
  gu: { sub: 'તમારા બિઝનેસ ડેશબોર્ડ માટે લોગિન કરો.', id: 'લોગિન ID / યુઝરનેમ', pin: 'PIN / પાસવર્ડ', rem: 'મને યાદ રાખો', fg: 'પાસવર્ડ ભૂલી ગયા?', go: 'લોગિન', fgm: 'PIN બદલવા માટે એડમિન (યોગેશ) ને કહો. એડમિન Users & Roles માં નવો PIN મૂકી શકે છે.' },
  hi: { sub: 'अपने बिज़नेस डैशबोर्ड के लिए लॉगिन करें।', id: 'लॉगिन ID / यूज़रनेम', pin: 'PIN / पासवर्ड', rem: 'मुझे याद रखें', fg: 'पासवर्ड भूल गए?', go: 'लॉगिन', fgm: 'PIN बदलने के लिए एडमिन (योगेश) से कहें। एडमिन Users & Roles में नया PIN सेट कर सकते हैं।' }
};
const LBG = ['login1.jpg?v=1', 'login2.jpg?v=1', 'login3.jpg?v=1', 'login4.jpg?v=1', 'login5.jpg?v=1'].map(x => ASSET_BASE + x);

/* ---------------- login ---------------- */
function Login({ msg, onIn }) {
  const [ll, setLl] = useState(store.lget('lgl') || (S.lang === 'gu' ? 'gu' : 'en'));
  const T = LGT[ll] || LGT.en, remId = store.lget('rem_id') || '';
  const [id, setId] = useState(remId), [pin, setPin] = useState(''), [show, setShow] = useState(false), [rem, setRem] = useState(!!remId), [bg, setBg] = useState(0), [wait, setWait] = useState(false);
  const bgs = window.innerWidth <= 820 ? [LBG[0]] : LBG;
  useEffect(() => { if (bgs.length < 2) return; const t = setInterval(() => { if (!document.hidden) setBg(i => (i + 1) % bgs.length); }, 5000); return () => clearInterval(t); }, []);
  const submit = async e => {
    e.preventDefault(); if (wait) return; setWait(true); busy(true);
    try {
      const r = await fetchLogin(id, pin);
      if (!r || !r.ok) { setPin(''); toast((r && r.error) || 'Login failed', 'bad'); return; }
      store.lset('rem_id', rem ? id.trim() : '');
      S.token = r.data.token; S.user = r.data.user; store.set('tok', S.token); store.lset('tok2', JSON.stringify({ t: S.token, at: Date.now(), seen: Date.now() }));
      onIn();
    } catch (er) { toast('Network problem. Check internet and try again.', 'bad'); }
    finally { setWait(false); busy(false); }
  };
  return <Box sx={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-end' }, p: { xs: 2, md: 8 }, overflow: 'hidden' }}>
    {bgs.map((b, i) => <Box key={b} sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${b})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === bg ? 1 : 0, transition: 'opacity 1.2s' }} />)}
    <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(0,0,0,.25),rgba(0,0,0,.05))' }} />
    <Paper component="form" onSubmit={submit} elevation={12} sx={{ position: 'relative', width: '100%', maxWidth: 400, p: 4, borderRadius: 5, bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)' }}>
      <Box sx={{ textAlign: 'center' }}><img src={LOGO} alt="C COMPUTER" style={{ height: 64 }} /></Box>
      <Typography align="center" sx={{ mt: 1 }}><Box component="span" sx={{ bgcolor: 'primary.main', color: '#fff', px: 1.5, py: .3, borderRadius: 9, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>ERP LOGIN</Box></Typography>
      <Typography variant="h5" align="center" fontWeight={900} sx={{ mt: 1 }}>Welcome Back!</Typography>
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>{T.sub}</Typography>
      {msg && <Alert severity="warning" sx={{ mb: 1 }}>{msg}</Alert>}
      <TextField fullWidth required margin="dense" placeholder={T.id} value={id} onChange={e => setId(e.target.value)} autoComplete="username" autoFocus InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> }} />
      <TextField fullWidth required margin="dense" placeholder={T.pin} value={pin} onChange={e => setPin(e.target.value)} type={show ? 'text' : 'password'} autoComplete="current-password" inputProps={{ inputMode: 'numeric', maxLength: 8 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>, endAdornment: <IconButton onClick={() => setShow(!show)} aria-label="Show / hide PIN">{show ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton> }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center"><FormControlLabel control={<Checkbox checked={rem} onChange={e => setRem(e.target.checked)} size="small" />} label={<Typography variant="body2">{T.rem}</Typography>} />
        <Link component="button" type="button" variant="body2" onClick={() => openDialog('Forgot Password?', () => <Typography>{T.fgm}</Typography>, { maxWidth: 'xs' })}>{T.fg}</Link></Stack>
      <Button fullWidth type="submit" size="large" variant="contained" disabled={wait} endIcon={<ArrowForwardIcon />} sx={{ mt: 1, py: 1.4, borderRadius: 9, fontWeight: 800 }}>{T.go}</Button>
      <ToggleButtonGroup exclusive size="small" value={ll} onChange={(e, v) => { if (!v) return; store.lset('lgl', v); if (v !== 'hi') { S.lang = v; store.lset('lang', v); } setLl(v); }} sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <ToggleButton value="en">EN</ToggleButton><ToggleButton value="gu">ગુજરાતી</ToggleButton><ToggleButton value="hi">हिंदी</ToggleButton></ToggleButtonGroup>
      <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 2 }}>Sales | Service | Accessories<br />Katargam, Surat</Typography>
    </Paper>
  </Box>;
}
function fetchLogin(loginId, pin) { return remote.run(null, 'login', { loginId, pin }); }

/* ---------------- splash ---------------- */
function Splash({ name }) {
  const f = String(name || '').trim().split(/\s+/)[0];
  return <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#fff', zIndex: 5000, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
    <Box><img src={LOGO} alt="C COMPUTER" style={{ height: 80 }} /><Typography variant="h5" fontWeight={900} sx={{ mt: 2 }}>{greetWord()}{f ? ', ' + f : ''}!</Typography><Loading /></Box>
  </Box>;
}

/* ---------------- global search ---------------- */
function GlobalSearch() {
  const [q, setQ] = useState(''), [r, setR] = useState(null), anchor = useRef(null), last = useRef('');
  const run = useRef(debounce(async v => {
    if (v.length < 2) { setR(null); return; }
    try { const x = await api('search', { q: v }); if (last.current === v) setR(x); } catch (e) { setR(null); }
  }, 250)).current;
  const close = () => { setQ(''); setR(null); };
  const grp = (t, arr, fn) => arr && arr.length ? [<ListSubheader key={t}>{t}</ListSubheader>].concat(arr.map(x => <ListItemButton key={t + x.id} onClick={() => { close(); fn(x.id); }}><ListItemText primary={x.name} secondary={x.sub} /></ListItemButton>)) : [];
  return <ClickAwayListener onClickAway={() => setR(null)}><Box ref={anchor} sx={{ flex: 1, maxWidth: 520 }}>
    <TextField size="small" fullWidth value={q} placeholder={LT('search')} autoComplete="off" sx={{ bgcolor: '#fff', borderRadius: 1 }}
      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      onChange={e => { const v = e.target.value; setQ(v); last.current = v.trim(); run(v.trim()); }} onKeyDown={e => { if (e.key === 'Escape') close(); }} />
    <Popper open={!!r} anchorEl={anchor.current} placement="bottom-start" style={{ zIndex: 1500, width: anchor.current ? anchor.current.offsetWidth : 320 }}>
      <Paper elevation={8} sx={{ maxHeight: 420, overflow: 'auto' }}><List dense>
        {r && [].concat(grp(LT('products'), r.products, id => { go('products'); openProduct(id); }), grp(LT('customers'), r.customers, id => { go('customers'); openCustomer(id); }), grp(LT('orders'), r.orders, id => { go('sales'); openOrder(id); }), grp('Serial / Item', r.items, id => { go('serial'); openItem(id); }))}
        {r && !(r.products.length + r.customers.length + r.orders.length + r.items.length) && <ListItemButton disabled><ListItemText primary="Nothing found" /></ListItemButton>}
      </List></Paper>
    </Popper>
  </Box></ClickAwayListener>;
}

/* ---------------- user menu: change PIN, logout ---------------- */
function PinForm({ close }) {
  const [a, setA] = useState(''), [b, setB] = useState(''), [c, setC] = useState('');
  return <Stack gap={1.5} sx={{ pt: 1 }}>
    <TextField label="Current PIN" type="password" value={a} onChange={e => setA(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 8 }} />
    <TextField label="New PIN (4-8 digits)" type="password" value={b} onChange={e => setB(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 8 }} />
    <TextField label="Repeat new PIN" type="password" value={c} onChange={e => setC(e.target.value)} inputProps={{ inputMode: 'numeric', maxLength: 8 }} />
    <Button variant="contained" onClick={() => work(async () => { if (b !== c) throw new Error('New PIN and repeat PIN are not the same'); await api('changePin', { oldPin: a, newPin: b }); toast('PIN changed', 'ok'); close(); })}>{LT('save')}</Button>
  </Stack>;
}
function userMenu(logout) {
  const d = openDialog(S.user.name || S.user.loginId, () => <Stack direction="row" gap={2}>
    <Button fullWidth variant="outlined" size="large" startIcon={<LockIcon />} onClick={() => { d.close(); openDialog(LI('changepin'), close => <PinForm close={close} />, { maxWidth: 'xs' }); }}>{LI('changepin')}</Button>
    <Button fullWidth variant="outlined" color="error" size="large" startIcon={<LogoutIcon />} onClick={() => { d.close(); logout(false); }}>{LI('logout')}</Button>
  </Stack>, { maxWidth: 'xs' });
}
function moreSheet() {
  const d = openDialog(LT('more'), () => <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
    {navItems().filter(k => !['dash', 'products', 'stock'].includes(k)).map(k => { const I = NAV_ICON[k]; return <Button key={k} variant="outlined" sx={{ flexDirection: 'column', py: 1.5, gap: .5, textTransform: 'none' }} onClick={() => { d.close(); go(k); }}>{I && <I />}<Typography variant="caption" fontWeight={700}>{LI(k)}</Typography></Button>; })}
  </Box>, { maxWidth: 'sm' });
}

/* ---------------- shell ---------------- */
function Shell({ logout, rerender }) {
  const nav = useSyncExternalStore(navStore.sub, navStore.get);
  const wide = useMediaQuery('(min-width:900px)');
  const [open, setOpen] = useState(false);
  const items = navItems(), a = isAdmin(), nm = S.user.name || S.user.loginId;
  const Page = PAGES[nav.route] || PAGES.dash;
  const W = 240;
  const side = <Box sx={{ width: W, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
    <Box sx={{ p: 2, textAlign: 'center' }}><img src={LOGO} alt="C COMPUTER" style={{ height: 52, maxWidth: '100%' }} /></Box>
    <List dense sx={{ flex: 1, overflow: 'auto', px: 1 }}>{items.map(k => { const I = NAV_ICON[k]; const on = nav.route === k || (k === 'quotes' && nav.route === 'quote'); return <ListItemButton key={k} selected={on} onClick={() => { setOpen(false); go(k); }} sx={{ borderRadius: 2, mb: .3, '&.Mui-selected': { bgcolor: 'primary.50', color: 'primary.main', fontWeight: 800 } }}>
      <ListItemIcon sx={{ minWidth: 36, color: on ? 'primary.main' : 'inherit' }}>{I && <I fontSize="small" />}</ListItemIcon><ListItemText primary={LI(k)} primaryTypographyProps={{ fontWeight: on ? 800 : 500, fontSize: 14 }} /></ListItemButton>; })}</List>
    <Typography variant="caption" color="text.secondary" sx={{ p: 1.5 }}>C COMPUTER ERP · {a ? 'Admin' : 'Staff'} · React</Typography>
  </Box>;
  return <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f6f7fb' }}>
    {wide ? <Drawer variant="permanent" sx={{ width: W, flexShrink: 0, '& .MuiDrawer-paper': { width: W, borderRight: '1px solid #eceef3' } }}>{side}</Drawer>
      : <Drawer open={open} onClose={() => setOpen(false)}>{side}</Drawer>}
    <Box sx={{ flex: 1, minWidth: 0, pb: wide ? 2 : 9 }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #eceef3', bgcolor: '#fff' }}>
        <Toolbar sx={{ gap: 1 }}>
          {!wide && <IconButton onClick={() => setOpen(true)}><MenuIcon /></IconButton>}
          <GlobalSearch />
          <IconButton title={LT('scan')} onClick={() => go('scan')}><QrCodeScannerIcon /></IconButton>
          {wide && <ToggleButtonGroup exclusive size="small" value={S.lang} onChange={(e, v) => { if (!v) return; S.lang = v; store.lset('lang', v); rerender(); }}>{Object.keys(LANGS).map(k => <ToggleButton key={k} value={k}>{LANGS[k]}</ToggleButton>)}</ToggleButtonGroup>}
          <Stack direction="row" alignItems="center" gap={1} sx={{ cursor: 'pointer' }} onClick={() => userMenu(logout)}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>{nm.charAt(0).toUpperCase()}</Avatar>
            {wide && <Box sx={{ lineHeight: 1.1 }}><Typography variant="body2" fontWeight={800}>{nm}</Typography><Typography variant="caption" color="text.secondary">{a ? 'Admin' : 'Staff'}</Typography></Box>}
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Suspense fallback={<Loading />}><PageBoundary key={nav.n}><Page params={nav.params} /></PageBoundary></Suspense>
      </Box>
    </Box>
    <BrChip />
    {nav.route !== 'pos' && <Fab color="primary" title="AI Assistant" onClick={openAssistant} sx={{ position: 'fixed', right: 18, bottom: wide ? 18 : 74, fontSize: 24 }}>🤖</Fab>}
    {!wide && !userMenus() && <Paper elevation={8} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}>
      <BottomNavigation showLabels value={nav.route === 'quote' ? 'quotes' : nav.route} onChange={(e, v) => v === 'more' ? moreSheet() : go(v)}>
        <BottomNavigationAction value="quotes" label="Quotation" icon={React.createElement(NAV_ICON.quotes)} />
        {(a || (S.user.name || '').toUpperCase().startsWith('NAKUL')) && <BottomNavigationAction value="cash" label="Cash" icon={React.createElement(NAV_ICON.cash)} />}
        <BottomNavigationAction value="more" label={LT('more')} icon={<MoreHorizIcon />} />
      </BottomNavigation>
    </Paper>}
  </Box>;
}
class PageBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() { return this.state.err ? <Alert severity="error">{String(this.state.err.message || this.state.err)}</Alert> : this.props.children; }
}

/* ---------------- app ---------------- */
export default function App() {
  const [mode, setMode] = useState('boot'), [msg, setMsg] = useState(''), [, setN] = useState(0);
  const logout = auto => {
    APIC.clear(); swrClear();
    const t = S.token; S.stack = []; store.del('tok'); store.del('route'); store.lset('tok2', '');
    if (t && !auto) api('logout', {}).catch(() => { });
    S.token = null; S.user = null; S.boot = null;
    setMsg(auto ? 'Session ended. Please login again.' : ''); setMode('login');
  };
  ui.onLogout = logout;
  const start = async () => {
    setMode('splash');
    try {
      S.boot = await api('bootstrap', {});
      S.user = S.boot.user; S.lang = store.lget('lang') || S.boot.lang || 'both';
      const r = store.get('route'); go(r && ROUTE_KEYS.includes(r) ? r : (isAcct() ? 'sales' : 'dash'), {}, true);
      setTimeout(() => setMode('in'), 600); idleReset(); prefetchLists();
    } catch (e) { setMsg(e.message); setMode('login'); }
  };
  /* auto logout after 3 hours idle; login also survives a tab reload */
  const idleT = useRef(null), idleW = useRef(0);
  const idleReset = () => {
    clearTimeout(idleT.current);
    if (!S.token) return;
    idleT.current = setTimeout(() => logout(true), 3 * 60 * 60 * 1000);
    const n = Date.now(); if (n - idleW.current > 20000) { idleW.current = n; try { const o = JSON.parse(store.lget('tok2') || 'null'); if (o && o.t === S.token) { o.seen = n; store.lset('tok2', JSON.stringify(o)); } } catch (e) { } }
  };
  useEffect(() => {
    ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, idleReset, { passive: true }));
    setCrmBlocked(() => openDialog('CRM', () => <Stack gap={1}><Typography>Tap the button to open CRM.</Typography><Button variant="contained" href={CRM_URL} target="_blank" rel="noopener">Open CRM</Button></Stack>, { maxWidth: 'xs' }));
    S.lang = store.lget('lang') || 'both';
    let t = store.get('tok');
    if (!t) { try { const o = JSON.parse(store.lget('tok2') || 'null'); if (o && o.t && Date.now() - o.seen < 3 * 3600 * 1000 && Date.now() - o.at < 6 * 3600 * 1000) { t = o.t; store.set('tok', t); } else if (o) store.lset('tok2', ''); } catch (e) { } }
    if (t) { S.token = t; start(); } else setMode('login');
  }, []);
  return <>
    {mode === 'login' && <Login msg={msg} onIn={start} />}
    {(mode === 'splash' || mode === 'boot') && <Splash name={S.user && S.user.name} />}
    {mode === 'in' && S.user && <Shell logout={logout} rerender={() => setN(n => n + 1)} />}
    <UiHost />
  </>;
}
/* After login, quietly load the main lists in the background so pages open instantly. */
function prefetchLists() {
  const q = [['prod.list', { q: '', category: '', status: 'all', low: false, page: 1, size: 24 }], ['stock.list', { q: '', category: '', low: false, page: 1, tab: 'stock', mtype: '', mq: '', mpage: 1 }], ['cust.list', { q: '', page: 1 }], ['ord.list', { q: '', status: '', page: 1 }], ['quote.list', { q: '', status: '', page: 1 }]];
  if (isAcct()) return;
  setTimeout(() => { let i = 0; const next = () => { if (i >= q.length || !S.user) return; const x = q[i++]; api(x[0], x[1]).catch(() => { }).then(() => setTimeout(next, 150)); }; next(); }, 1500);
}
