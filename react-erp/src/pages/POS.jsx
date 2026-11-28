/* ================= POS – photo based quick order (same logic as the live ERP JS_POS.html) ================= */
import { supaOn, prodListDb } from '../lib/supa.js';
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Paper, Select, Stack, TextField, Typography, Chip, Tabs, Tab, useMediaQuery, Divider, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api, S, inr, nf, isAdmin, rid, toast, work, store, debounce, sleep, loadThumbs } from '../lib/core.js';
import { Skel, Thumb, openDialog, openScanner, Empty } from '../lib/ui.jsx';
import { go } from '../lib/nav.js';
import { openOrder } from './Sales.jsx';
import { DOCS } from '../docs/invoice.jsx';

export const POS = { free: {}, cat: 'all', q: '', brand: '', stock: '', sort: 'pop', view: 'grid', prods: null, price: {}, cart: [], cust: null, pay: 'Cash', disc: 0, gst: false, mode: 'walkin', fav: {}, loading: false, step: 'shop' };
try { POS.fav = JSON.parse(store.lget('pos_fav') || '{}'); } catch (e) { }
const POS_CATS = [['Laptop', '💻'], ['Desktop', '🖥'], ['Processor', '⚙'], ['Motherboard', '🔌'], ['RAM', '🧩'], ['SSD', '💾'], ['Monitor', '🖵'], ['Printer', '🖨'], ['Keyboard', '⌨'], ['Accessor', '🎧'], ['Network', '📡'], ['CCTV', '📹']];
const posIcon = c => { const k = POS_CATS.find(x => String(c).toLowerCase().includes(x[0].toLowerCase())); return k ? k[1] : '📦'; };
const POS_PK = () => 'ccswr|' + ((S.user && S.user.loginId) || '') + '|posprice';
async function posLoad() {
  if (POS.prods || POS.loading) return; POS.loading = true;
  try { Object.assign(POS.price, JSON.parse(localStorage.getItem(POS_PK()) || '{}').p || {}); } catch (e) { }
  try {
    let viaDb = null;
    if (supaOn() && localStorage.getItem('ccDbPos') !== '0') { try { const d1 = await prodListDb({ page: 1, size: 50, status: 'active' }), dn = Math.min(Math.ceil(d1.total / 50), 40), dr = []; for (let pg = 2; pg <= dn; pg++) dr.push(prodListDb({ page: pg, size: 50, status: 'active' })); viaDb = d1.rows.concat(...(await Promise.all(dr)).map(r => r.rows)); } catch (e) { viaDb = null; } }
    if (viaDb) POS.prods = viaDb; else {
      const r1 = await api('prod.list', { page: 1, size: 50, status: 'active' }), n = Math.min(Math.ceil(r1.total / 50), 40), rest = [];
      for (let pg = 2; pg <= n; pg++) rest.push(api('prod.list', { page: pg, size: 50, status: 'active' }));
      POS.prods = r1.rows.concat(...(await Promise.all(rest)).map(r => r.rows));
    }
    DOCS.prods = POS.prods;
  } catch (e) { POS.loading = false; throw e; }
  POS.loading = false;
}
async function posPrices(ids, fresh) {
  const need = ids.filter(i => fresh || POS.price[i] === undefined); if (!need.length) return false;
  const parts = []; for (let i = 0; i < need.length; i += 40) parts.push(api('quote.prod', { ids: need.slice(i, i + 40) }, { loader: false }).then(r => r.forEach(x => { POS.price[x.productId] = x; }), () => { }));
  await Promise.all(parts);
  need.forEach(i => { if (POS.price[i] === undefined) POS.price[i] = null; });
  try { localStorage.setItem(POS_PK(), JSON.stringify({ t: Date.now(), p: POS.price })); } catch (e) { }
  return true;
}
const posAvail = p => p.stock ? p.stock.available : 0;
const posPriceOf = p => { const r = POS.price[p.ProductID]; return r ? r.sellPrice : (p.SellPrice != null ? +p.SellPrice : 0); };
function posFiltered() {
  const q = POS.q.trim().toLowerCase(), toks = q.split(/\s+/).filter(Boolean);
  const l = (POS.prods || []).filter(p => {
    if (!toks.length && POS.cat !== 'all' && (p.Category || 'Other') !== POS.cat) return false;
    if (POS.brand && p.Brand !== POS.brand) return false;
    if (POS.stock === 'in' && posAvail(p) <= 0) return false; if (POS.stock === 'out' && posAvail(p) > 0) return false; if (POS.stock === 'fav' && !POS.fav[p.ProductID]) return false;
    if (toks.length) { const h = [p.Name, p.Brand, p.Model, p.SKU, p.Barcode, p.Description].join(' ').toLowerCase(); if (!toks.every(t => h.includes(t))) return false; }
    return true;
  });
  if (POS.sort === 'lo') l.sort((a, b) => posPriceOf(a) - posPriceOf(b)); else if (POS.sort === 'hi') l.sort((a, b) => posPriceOf(b) - posPriceOf(a)); else if (POS.sort === 'name') l.sort((a, b) => a.Name < b.Name ? -1 : 1); else l.sort((a, b) => posAvail(b) - posAvail(a) || (a.Name < b.Name ? -1 : 1));
  return l;
}
function posTotals() {
  let gross = 0, ld = 0; POS.cart.forEach(l => { gross += l.qty * l.price; ld += Math.min(+l.disc || 0, l.qty * l.price); });
  const after = gross - ld, od = Math.min(Math.max(+POS.disc || 0, 0), after), taxable = after - od, gst = POS.gst ? Math.round(taxable * 0.18 * 100) / 100 : 0;
  return { gross, ld, od, taxable, gst, total: Math.round(taxable + gst), count: POS.cart.reduce((a, l) => a + l.qty, 0) };
}
function posHeld() { try { return JSON.parse(store.lget('pos_hold') || '[]'); } catch (e) { return []; } }
function posDescSerials(pid) {
  const p = (POS.prods || []).find(x => x.ProductID === pid); if (!p) return [];
  const m = String(p.Description || '').match(/serials?[^:]*:\s*([^|]+)/i); if (!m) return [];
  return [...new Set(m[1].split(/[\s,;\/]+/).map(x => x.trim().toUpperCase()).filter(x => x.length >= 5 && /\d/.test(x) && /^[A-Z0-9\-]+$/.test(x)))];
}

const OR = '#4b5563';
export default function POSPage() {
  const [, setN] = useState(0), [err, setErr] = useState(''), [ready, setReady] = useState(!!POS.prods);
  const re = () => setN(n => n + 1);
  const wide = useMediaQuery('(min-width:1000px)');
  useEffect(() => { if (!POS.prods) posLoad().then(() => setReady(true), e => setErr(e.message)); }, []);
  useEffect(() => { if (!ready) return; const ids = posFiltered().slice(0, 60).map(p => p.ProductID); if (!POS._pf) { POS._pf = 1; posPrices(ids, true).then(c => c && re()); } else posPrices(ids).then(c => c && re()); });
  useEffect(() => { // free serial lists for tracked lines
    const need = [...new Set(POS.cart.filter(l => l.track !== 'QTY' && !POS.free[l.id]).map(l => l.id))]; if (!need.length) return;
    (async () => { for (const pid of need) { try { POS.free[pid] = await api('serial.free', { productId: pid }, { loader: false }); } catch (e) { POS.free[pid] = []; } } re(); })();
  });
  if (err) return <Alert severity="error">{err}</Alert>;
  if (!ready) return <><Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>POS – Quick Order</Typography><Skel /></>;
  const A = { re, add: pid => posAdd(pid, re), newOrder: () => { Object.assign(POS, { free: {}, cart: [], disc: 0, cust: null, pay: 'Cash', gst: false, step: 'shop' }); re(); } };
  const showCart = wide || POS.step === 'cart';
  const t = posTotals();
  return <Box sx={{ bgcolor: CR, m: { xs: -1.5, md: -3 }, p: wide ? 'clamp(8px,min(1.4vw,2vh),24px)' : 1.5, ...(wide ? { height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { minHeight: '100vh' }) }}>
    <TopBar A={A} />
    <Box sx={{ display: 'grid', gap: 'clamp(10px,1.4vw,20px)', gridTemplateColumns: wide ? 'minmax(0,1fr) clamp(300px,27vw,400px)' : 'minmax(0,1fr)', alignItems: wide ? 'stretch' : 'start', ...(wide ? { flex: 1, minHeight: 0 } : {}) }}>
      {(wide || POS.step !== 'cart') && <Center A={A} wide={wide} />}
      {showCart && <Cart A={A} wide={wide} />}
    </Box>
    {!wide && POS.step !== 'cart' && <Paper elevation={10} onClick={() => { POS.step = 'cart'; re(); window.scrollTo(0, 0); }} sx={{ position: 'fixed', left: 12, right: 12, bottom: 72, p: 1.6, borderRadius: 99, bgcolor: OR, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1100, cursor: 'pointer', px: 2.5 }}>
      <span>🛒 {t.count} item{t.count === 1 ? '' : 's'}</span><b>{inr(t.total)}</b><span>Checkout ›</span></Paper>}
  </Box>;
}
const CR = '#f6f3ea', LN = '#ead9cc', DK = '#1f2937';
const pill = on => ({ borderRadius: 99, textTransform: 'none', fontWeight: 700, px: 2, bgcolor: on ? OR : '#fff', color: on ? '#fff' : DK, border: '1px solid ' + (on ? OR : LN), boxShadow: 'none', '&:hover': { bgcolor: on ? OR : '#f9fafb', boxShadow: 'none' } });
function TopBar({ A }) {
  const h = posHeld(), today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const openHeld = i => { const hh = posHeld(), x = hh[i]; if (!x) return; if (POS.cart.length) hh.push({ at: Date.now(), cart: POS.cart, cust: POS.cust, disc: POS.disc, gst: POS.gst, mode: POS.mode, pay: POS.pay }); Object.assign(POS, { cart: x.cart, cust: x.cust, disc: x.disc, gst: x.gst, mode: x.mode, pay: x.pay }); hh.splice(i, 1); store.lset('pos_hold', JSON.stringify(hh.slice(0, 10))); A.re(); };
  const delHeld = i => { const hh = posHeld(); hh.splice(i, 1); store.lset('pos_hold', JSON.stringify(hh)); A.re(); };
  return <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center" justifyContent="space-between" sx={{ mb: 'clamp(6px,1.6vh,20px)', flex: 'none' }}>
    <Box><Typography fontWeight={900} sx={{ color: DK, lineHeight: 1.1, fontSize: 'clamp(19px,1.7vw,26px)' }}>Quick Order</Typography><Typography sx={{ color: OR, fontWeight: 700, fontSize: 'clamp(12px,1vw,16px)' }}>{today}</Typography></Box>
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
      {h.map((x, i) => <Chip key={i} sx={{ bgcolor: '#fff', border: '1px solid ' + LN, fontWeight: 700, height: 40, borderRadius: 99 }} label={`${x.cust ? x.cust.name : 'Held ' + (i + 1)} · ${x.cart.length}`} onClick={() => openHeld(i)} onDelete={() => delHeld(i)} />)}
      <Button sx={{ ...pill(false), height: 44 }} onClick={() => posHold(A)}>Hold</Button>
      <Button sx={{ ...pill(true), height: 44 }} onClick={A.newOrder}>＋ New Order</Button>
    </Stack>
  </Stack>;
}
/* big category tiles (Available / Need re-stock), like the reference design */
function CatTiles({ A, onPick }) {
  const cats = {}, inS = {}; POS.prods.forEach(p => { const c = p.Category || 'Other'; cats[c] = (cats[c] || 0) + 1; if (posAvail(p) > 0) inS[c] = (inS[c] || 0) + 1; });
  const all = [['all', 'All Products', POS.prods.length, POS.prods.filter(p => posAvail(p) > 0).length]].concat(Object.keys(cats).sort().map(c => [c, c, cats[c], inS[c] || 0]));
  return <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: .8, mb: 'clamp(6px,1.4vh,12px)', scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: LN, borderRadius: 9 } }}>
    {all.map(([k, label, n, av]) => { const on = POS.q.trim() ? k === 'all' : POS.cat === k, low = av === 0; return <Box key={k} onClick={() => { POS.cat = k; POS.q = ''; onPick(); A.re(); }}
      sx={{ flex: '0 0 auto', width: { xs: 140, md: 'clamp(128px,11vw,190px)' }, height: { xs: 100, md: 'clamp(66px,min(7.6vw,13vh),128px)' }, p: 1.2, borderRadius: '22px', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', scrollSnapAlign: 'start', bgcolor: on ? OR : '#fff', color: on ? '#fff' : DK, border: '1px solid ' + (on ? OR : LN), transition: 'all .15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(0,0,0,.06)' } }}>
      <Box component="span" sx={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, px: 1, py: .2, borderRadius: 99, position: 'relative', whiteSpace: 'nowrap', border: low ? 0 : '1px solid ' + (on ? '#fff' : DK), bgcolor: low ? '#f87171' : 'transparent', color: low ? '#fff' : 'inherit' }}>{low ? 'Need re-stock' : 'Available'}</Box>
      <Box sx={{ position: 'absolute', right: -6, bottom: -14, fontSize: { xs: 58, md: 72 }, opacity: on ? .35 : .18, filter: 'grayscale(.3)', lineHeight: 1 }}>{k === 'all' ? '🛍' : posIcon(k)}</Box>
      <Box sx={{ position: 'relative', minWidth: 0, maxWidth: '100%' }}><Typography fontWeight={800} noWrap sx={{ fontSize: { xs: 16, md: 'clamp(14px,min(1.3vw,2.6vh),21px)' }, lineHeight: 1.15 }}>{label}</Typography><Typography variant="caption" sx={{ opacity: .85, lineHeight: 1.2, display: 'block' }}>{n} items</Typography></Box>
    </Box>; })}
  </Box>;
}
function Center({ A, wide }) {
  const brands = Array.from(new Set(POS.prods.map(p => p.Brand).filter(Boolean))).sort();
  const [q, setQ] = useState(POS.q);
  const deb = useRef(debounce(v => { POS.q = v; A.re(); }, 150)).current;
  const l = posFiltered(), shown = l.slice(0, 60);
  const sel = { bgcolor: '#fff', borderRadius: 99, height: 'clamp(34px,5vh,40px)', fontSize: 14, fontWeight: 600, '& fieldset': { borderColor: LN } };
  const scan = () => openScanner(code => { const c = String(code).trim().toLowerCase(), hit = POS.prods.find(p => [p.Barcode, p.SKU].some(x => x && String(x).toLowerCase() === c)); if (hit) A.add(hit.ProductID); else toast('Not found: ' + code, 'bad'); }, 'Barcode scan');
  return <Box sx={wide ? { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' } : undefined}>
    <Box sx={{ flex: 'none' }}>
    <TextField fullWidth placeholder="Search name / model / SKU / barcode" value={q} onChange={e => { setQ(e.target.value); deb(e.target.value); }}
      onKeyDown={ev => { if (ev.key === 'Enter') { const code = q.trim().toLowerCase(), hit = POS.prods.find(p => [p.Barcode, p.SKU].some(x => x && String(x).toLowerCase() === code)); if (hit) { A.add(hit.ProductID); setQ(''); POS.q = ''; A.re(); } } }}
      InputProps={{ startAdornment: <Box component="span" sx={{ mr: 1, fontSize: 20 }}>🔍</Box>, endAdornment: <IconButton onClick={scan} title="Scan" sx={{ color: OR }}><QrCodeScannerIcon /></IconButton> }}
      sx={{ mb: 'clamp(6px,1.4vh,16px)', '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 99, height: { xs: 50, md: 'clamp(40px,min(3.6vw,7vh),58px)' }, fontSize: { xs: 16, md: 'clamp(14px,1.1vw,17px)' }, px: 1.5 }, '& fieldset': { borderColor: OR + '66' } }} />
    <CatTiles A={A} onPick={() => setQ('')} />
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 'clamp(8px,1.8vh,16px)' }}>
      <Select size="small" value={POS.brand} displayEmpty onChange={e => { POS.brand = e.target.value; A.re(); }} sx={{ ...sel, minWidth: 130 }}><MenuItem value="">All Brands</MenuItem>{brands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}</Select>
      <Select size="small" value={POS.stock} displayEmpty onChange={e => { POS.stock = e.target.value; A.re(); }} sx={{ ...sel, minWidth: 130 }}><MenuItem value="">All Stock</MenuItem><MenuItem value="in">In stock</MenuItem><MenuItem value="out">Out of stock</MenuItem><MenuItem value="fav">♥ Favourites</MenuItem></Select>
      <Select size="small" value={POS.sort} onChange={e => { POS.sort = e.target.value; A.re(); }} sx={{ ...sel, minWidth: 150 }}><MenuItem value="pop">Sort: Popular</MenuItem><MenuItem value="lo">Price low→high</MenuItem><MenuItem value="hi">Price high→low</MenuItem><MenuItem value="name">Name A–Z</MenuItem></Select>
      <Button sx={{ ...pill(false), height: 'clamp(34px,5vh,40px)' }} onClick={() => { POS.view = POS.view === 'grid' ? 'list' : 'grid'; A.re(); }}>{POS.view === 'grid' ? '☰ List' : '▦ Grid'}</Button>
      <Typography variant="caption" sx={{ alignSelf: 'center', ml: 'auto', color: '#6b7280' }}>{l.length} products</Typography>
    </Stack>
    </Box>
    <Box sx={wide ? { flex: 1, minHeight: 0, overflowY: 'auto', pr: .5, pb: 2, mr: -.5 } : { pb: 10 }}>
    {shown.length ? <Box sx={{ display: 'grid', gap: 'clamp(10px,1vw,16px)', gridTemplateColumns: POS.view === 'list' ? 'minmax(0,1fr)' : { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(auto-fill,minmax(clamp(150px,11.5vw,200px),1fr))' } }}>
      {shown.map(p => <PosCard key={p.ProductID} p={p} A={A} list={POS.view === 'list'} />)}
    </Box> : <Empty>No product found</Empty>}
    {l.length > shown.length && <Empty>Showing 60 of {l.length}. Search or choose a category to narrow down.</Empty>}
    </Box>
  </Box>;
}
/* product photo without a grey box (photo floats on the white card) */
function Photo({ id, h }) {
  const [u, setU] = useState(S.thumbs[id] || '');
  useEffect(() => { let on = true; if (S.thumbs[id] !== undefined) { setU(S.thumbs[id]); return; } loadThumbs([id]).then(t => { if (on) setU(t[id] || ''); }, () => { }); return () => { on = false; }; }, [id]);
  return <Box sx={{ height: h, width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' }}>{u ? <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', mixBlendMode: 'multiply' }} /> : <Box sx={{ width: h * .8, height: h * .8, borderRadius: 99, bgcolor: CR, display: 'grid', placeItems: 'center', fontSize: h > 80 ? 44 : 26, opacity: .6 }}>{posIcon((POS.prods.find(x => x.ProductID === id) || {}).Category || '')}</Box>}</Box>;
}
function PosCard({ p, A, list }) {
  const big = useMediaQuery('(min-width:1500px)');
  const av = posAvail(p), pr = posPriceOf(p), spec = [p.Brand, p.Model].filter(Boolean).join(' · ');
  const n = POS.cart.filter(x => x.id === p.ProductID).reduce((a, x) => a + x.qty, 0), first = POS.cart.findIndex(x => x.id === p.ProductID), last = POS.cart.map(x => x.id).lastIndexOf(p.ProductID);
  const fav = !!POS.fav[p.ProductID];
  const plus = <IconButton onClick={() => n ? posQty(first, 1, A) : A.add(p.ProductID)} sx={{ width: { xs: 42, md: 'clamp(38px,3vw,48px)' }, height: { xs: 42, md: 'clamp(38px,3vw,48px)' }, flex: 'none', fontSize: 24, fontWeight: 300, bgcolor: n ? OR : '#fff', color: n ? '#fff' : OR, border: '1.5px solid ' + OR, '&:hover': { bgcolor: n ? OR : '#f3f4f6' } }}>+</IconButton>;
  return <Paper elevation={0} sx={{ p: 'clamp(10px,1vw,14px)', position: 'relative', display: 'flex', flexDirection: list ? 'row' : 'column', alignItems: list ? 'center' : 'stretch', gap: list ? 1.5 : .5, borderRadius: '22px', border: '1.5px solid ' + (n ? OR : LN), bgcolor: '#fff', height: '100%', minWidth: 0, transition: 'all .15s', '&:hover': { boxShadow: '0 8px 22px rgba(0,0,0,.07)' } }}>
    <IconButton size="small" onClick={() => { POS.fav[p.ProductID] = !fav; if (fav) delete POS.fav[p.ProductID]; store.lset('pos_fav', JSON.stringify(POS.fav)); A.re(); }} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, color: fav ? OR : '#cbd5e1', fontSize: 18 }}>{fav ? '♥' : '♡'}</IconButton>
    {n > 0 && <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, minWidth: 26, height: 26, px: .6, borderRadius: 99, bgcolor: '#e5e7eb', color: OR, fontWeight: 800, fontSize: 13, display: 'grid', placeItems: 'center' }}>{n}</Box>}
    <Box sx={{ width: list ? 70 : '100%', flex: 'none', pt: list ? 0 : 1.5 }}><Photo id={p.ProductID} h={list ? 56 : big ? 120 : 92} /></Box>
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Typography fontWeight={800} title={p.Name} sx={{ fontSize: { xs: 14, md: 'clamp(13px,1vw,15px)' }, color: DK, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: list ? 0 : 38, lineHeight: 1.25, mt: list ? 0 : 1 }}>{p.Name}</Typography>
      {spec && <Typography variant="caption" sx={{ color: '#9ca3af', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{spec}</Typography>}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={.5} sx={{ mt: 'auto', pt: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 16, fontWeight: 700, color: pr ? '#4b5563' : '#b45309' }}>{pr ? inr(pr) : <span style={{ fontSize: 12 }}>Price not set</span>}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: av > 0 ? (av <= 3 ? '#d97706' : '#16a34a') : '#dc2626' }}>{av > 0 ? '● Stock ' + nf(av) : '● Out of stock'}</Typography>
        </Box>
        <Stack direction="row" gap={.6} alignItems="center">{n > 0 && <IconButton onClick={() => posQty(last, -1, A)} sx={{ width: 34, height: 34, border: '1.5px solid ' + LN, color: DK }}>−</IconButton>}{plus}</Stack>
      </Stack>
    </Box>
  </Paper>;
}
function posAdd(pid, re) {
  const p = POS.prods.find(x => x.ProductID === pid); if (!p) return; const ex = POS.cart.find(l => l.id === pid);
  const pr = posPriceOf(p), isQty = p.TrackingType === 'QTY';
  if (ex && isQty) ex.qty++;
  else if (ex && POS.cart.filter(l => l.id === pid).length >= posAvail(p)) return toast('Stock ma aatla j nang chhe', 'bad');
  else POS.cart.push({ id: pid, item: '', serial: '', name: p.Name, brand: p.Brand, model: p.Model, qty: 1, price: pr, disc: 0, track: p.TrackingType, av: posAvail(p), cost: (POS.price[pid] || {}).cost });
  if (posAvail(p) <= 0) toast(p.Name + ' is out of stock. Order will wait for stock.', 'bad');
  re();
}
function posQty(i, d, A) { const l = POS.cart[i]; if (!l) return; if (l.track !== 'QTY' && d > 0) return A.add(l.id); if (l.qty + d < 1) POS.cart.splice(i, 1); else l.qty = l.qty + d; A.re(); }

function Cart({ A, wide }) {
  const t = posTotals(), pays = ['Cash', 'UPI HDFC', 'UPI IDBI', 'Card', 'Bank Transfer', 'Credit / Udhar', 'Split'];
  const H = ({ children }) => <Typography sx={{ fontSize: 13, color: '#6b7280', fontWeight: 600, mt: 2, mb: .8 }}>{children}</Typography>;
  return <Paper elevation={0} sx={{ p: 'clamp(12px,1.3vw,20px)', borderRadius: '26px', border: '1px solid ' + LN, bgcolor: '#fff', ...(wide ? { height: '100%', overflowY: 'auto', minHeight: 0 } : {}) }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
      {!wide ? <IconButton onClick={() => { POS.step = 'shop'; A.re(); }} sx={{ border: '1px solid ' + LN }}>‹</IconButton> : <Box sx={{ width: 42, height: 42, borderRadius: 99, bgcolor: '#e5e7eb', display: 'grid', placeItems: 'center', fontSize: 20 }}>🧾</Box>}
      <Box sx={{ textAlign: 'right' }}><Typography fontWeight={800} sx={{ color: DK }}>{POS.mode === 'quote' ? 'Quotation' : POS.mode === 'order' ? 'Order' : 'Walk-in Sale'}</Typography><Typography variant="caption" sx={{ color: '#6b7280' }}>{t.count} item{t.count === 1 ? '' : 's'}</Typography></Box>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', bgcolor: CR, borderRadius: 99, p: .5, mt: 2 }}>
      {[['walkin', 'Walk-in'], ['order', 'Order'], ['quote', 'Quotation']].map(([k, lab]) => <Button key={k} onClick={() => { POS.mode = k; A.re(); }} sx={{ borderRadius: 99, textTransform: 'none', fontWeight: 700, py: 1, bgcolor: POS.mode === k ? OR : 'transparent', color: POS.mode === k ? '#fff' : DK, '&:hover': { bgcolor: POS.mode === k ? OR : '#efe9dc' } }}>{lab}</Button>)}
    </Box>
    <H>Customer</H>
    <CustBox A={A} />
    <Stack direction="row" justifyContent="space-between" alignItems="center"><H>Order list</H>{POS.cart.length > 0 && <Button size="small" color="error" sx={{ textTransform: 'none', mt: 1 }} onClick={() => { POS.cart = []; POS.disc = 0; A.re(); }}>🗑 Clear</Button>}</Stack>
    <Box sx={{ border: '1px solid ' + LN, borderRadius: '18px', px: 1.2, overflow: 'auto' }}>{POS.cart.length ? POS.cart.map((l, i) => <CartLine key={i} l={l} i={i} A={A} />) : <Box sx={{ py: 4, textAlign: 'center', color: '#9ca3af' }}><Box sx={{ fontSize: 36 }}>🛒</Box>Cart is empty. Tap + on a product.</Box>}</Box>
    <H>Payment Details</H>
    <Stack gap={.7}>
      <Row a="Subtotal" b={inr(t.gross)} /><Row a="Item discount" b={inr(t.ld)} />
      <Stack direction="row" justifyContent="space-between" alignItems="center"><span>Overall discount ₹</span><TextField size="small" sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: 99 } }} inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }} value={POS.disc || 0} onChange={e => { POS.disc = +e.target.value || 0; A.re(); }} /></Stack>
      <FormControlLabel control={<Checkbox checked={POS.gst} onChange={e => { POS.gst = e.target.checked; A.re(); }} sx={{ color: OR, '&.Mui-checked': { color: OR } }} />} label="GST 18% umero" />
      {POS.gst && <><Row a="CGST (9%)" b={inr(t.gst / 2)} /><Row a="SGST (9%)" b={inr(t.gst / 2)} /></>}
      <Box sx={{ borderTop: '1.5px dashed ' + LN, pt: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography fontWeight={700}>Total {POS.gst ? '(incl. GST)' : ''}</Typography><Typography sx={{ fontSize: 26, fontWeight: 900, color: OR }}>{inr(t.total)}</Typography></Box>
    </Stack>
    <H>Payment method</H>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>{pays.map(x => <Button key={x} size="small" onClick={() => { POS.pay = x; A.re(); }} sx={{ ...pill(POS.pay === x), px: 1, py: .8, fontSize: 13 }}>{x}</Button>)}</Box>
    <Stack gap={1} sx={{ mt: 2 }}>
      <Button size="large" variant="contained" sx={{ bgcolor: OR, borderRadius: 99, py: 1.5, fontWeight: 800, textTransform: 'none', fontSize: 16, boxShadow: 'none' }} onClick={() => posSave(POS.mode === 'walkin' ? 'walkin' : 'order', A)}>{POS.mode === 'walkin' ? 'Save Walk-in Sale' : 'Save Order'} · {inr(t.total)}</Button>
      <Button size="large" variant="contained" sx={{ bgcolor: DK, borderRadius: 99, py: 1.3, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }} onClick={() => posSave('invoice', A)}>🧾 Generate Invoice</Button>
      <Stack direction="row" gap={1}><Button fullWidth sx={pill(false)} onClick={() => posSave('quote', A)}>Save as Quotation</Button><Button fullWidth sx={pill(false)} onClick={() => posHold(A)}>Hold Order</Button></Stack>
    </Stack>
  </Paper>;
}
const Row = ({ a, b }) => <Stack direction="row" justifyContent="space-between"><span>{a}</span><b>{b}</b></Stack>;
function CartLine({ l, i, A }) {
  const [typed, setTyped] = useState(l.typed || l.serial || '');
  useEffect(() => { setTyped(l.typed || l.serial || ''); }, [l.typed, l.serial]);
  const free = (POS.free[l.id] || []).filter(x => x.itemId === l.item || !POS.cart.some(o => o.item === x.itemId));
  const desc = l.track === 'QTY' && !l.typed ? posDescSerials(l.id).filter(x => !POS.cart.some(o => o.typed === x)) : [];
  const showType = l.track !== 'QTY' || l.typed || l._sopen || posDescSerials(l.id).length;
  const onType = () => {
    const v = typed.trim(), V = v.toUpperCase(), f = (POS.free[l.id] || []).find(y => [y.serial, y.barcode, y.itemId].some(z => z && String(z).toUpperCase() === V));
    if (f && POS.cart.some(o => o !== l && o.item === f.itemId)) { toast('Aa serial pehla umeryo chhe', 'bad'); setTyped(''); return; }
    if (f) { l.item = f.itemId; l.serial = f.serial; l.typed = ''; } else { l.typed = v; if (l.track !== 'QTY' && v) { l.item = ''; toast('Aa serial stock list ma nathi – order ma note tarike lakhase.', ''); } }
    A.re();
  };
  const scan = () => openScanner(code => {
    const c = String(code).trim().toUpperCase(), f = (POS.free[l.id] || []).find(x => [x.serial, x.barcode, x.itemId].some(v => v && String(v).toUpperCase() === c));
    if (!f) return toast('Aa serial aa product na stock ma nathi: ' + code, 'bad');
    if (POS.cart.some(o => o !== l && o.item === f.itemId)) return toast('Aa serial pehla umeryo chhe', 'bad');
    l.item = f.itemId; l.serial = f.serial; A.re();
  }, 'Serial scan karo');
  return <Stack direction="row" gap={1.2} sx={{ py: 1.2, borderBottom: '1px dashed ' + LN }}>
    <Box sx={{ width: 64, height: 64, flex: 'none', borderRadius: '14px', bgcolor: CR, p: .6 }}><Photo id={l.id} h={52} /></Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="body2" fontWeight={800} sx={{ color: DK }}>{l.name}</Typography><Button size="small" sx={{ minWidth: 0, p: 0 }} onClick={() => { l._ed = !l._ed; A.re(); }}>✏ Edit</Button></Stack>
      <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">{inr(l.price)} <b style={{ color: OR }}>x{l.qty}</b>{l.disc ? ' · Disc ' + inr(l.disc) : ''}{l.model ? ' · ' + l.model : ''}</Typography><b>{inr(l.qty * l.price - (+l.disc || 0))}</b></Stack>
      {showType ? <TextField fullWidth size="small" sx={{ mt: .5 }} placeholder={l.track === 'QTY' ? '✍ Serial (hoy to j lakho)' : '✍ Serial number lakho'} value={typed} onChange={e => setTyped(e.target.value)} onBlur={onType} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} autoComplete="off" />
        : <Button size="small" sx={{ p: 0, mt: .5 }} onClick={() => { l._sopen = 1; A.re(); }}>+ Serial umero (hoy to)</Button>}
      {desc.length > 0 && <Stack direction="row" gap={.5} flexWrap="wrap" sx={{ mt: .5 }} alignItems="center"><small>Stock na serial:</small>{desc.slice(0, 12).map(x => <Chip key={x} size="small" label={x} onClick={() => { l.typed = x; A.re(); }} />)}</Stack>}
      {l.track !== 'QTY' && <Stack direction="row" gap={1} sx={{ mt: .5 }}><TextField select fullWidth size="small" value={l.item} onChange={e => { const f = (POS.free[l.id] || []).find(y => y.itemId === e.target.value); l.item = e.target.value; l.serial = f ? f.serial : ''; A.re(); }} SelectProps={{ displayEmpty: true }}>
        <MenuItem value="">{l.track === 'SERIAL' ? '⚠ Serial pasand karo' : 'Serial (optional)'}</MenuItem>{free.map(x => <MenuItem key={x.itemId} value={x.itemId}>{x.serial || x.itemId}</MenuItem>)}</TextField><IconButton onClick={scan}>📷</IconButton></Stack>}
      {l._ed && <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" sx={{ border: '1px solid #e5e7eb', borderRadius: 9 }}><IconButton size="small" onClick={() => posQty(i, -1, A)}>−</IconButton><b>{l.qty}</b><IconButton size="small" onClick={() => posQty(i, 1, A)}>+</IconButton></Stack>
        <TextField size="small" label="Price" inputProps={{ inputMode: 'decimal' }} value={l.price} onChange={e => { l.price = +e.target.value || 0; A.re(); }} />
        <TextField size="small" label="Disc ₹" inputProps={{ inputMode: 'decimal' }} value={l.disc || 0} onChange={e => { l.disc = +e.target.value || 0; A.re(); }} />
      </Stack>}
    </Box>
    <IconButton size="small" onClick={() => { POS.cart.splice(i, 1); A.re(); }}><CloseIcon fontSize="small" /></IconButton>
  </Stack>;
}
/* customer: type 10-digit mobile -> old customer fills in by itself, else enter new name */
const seqR = { n: 0 };
function CustBox({ A }) {
  const c = POS.cust;
  const [mo, setMo] = useState(c ? String(c.mobile || '').replace(/\D/g, '').slice(-10) : ''), [busyS, setBusyS] = useState(false);
  useEffect(() => { setMo(POS.cust ? String(POS.cust.mobile || '').replace(/\D/g, '').slice(-10) : ''); }, [POS.cust]);
  const onMob = async v => {
    const m = v.replace(/\D/g, '').slice(0, 10); setMo(m);
    if (m.length < 10) { if (POS.cust && String(POS.cust.mobile || '').slice(-10) !== m) { POS.cust = null; A.re(); } return; }
    const my = ++seqR.n; setBusyS(true);
    let r = []; try { r = await api('cust.search', { q: m }); } catch (e) { }
    if (my !== seqR.n) return; setBusyS(false);
    const x = (r || []).find(y => String(y.mobile || y.Mobile || '').replace(/\D/g, '').slice(-10) === m);
    POS.cust = x ? { name: x.name || x.Name, mobile: m, address: x.address || x.Address || '', id: x.id || x.CustomerID } : { name: '', mobile: m, address: '', _new: true };
    A.re(); if (x) toast('Customer: ' + POS.cust.name, 'ok');
  };
  return <Box>
    <Stack direction="row" gap={1}><TextField fullWidth id="posmob" placeholder="📱 Customer mobile number" inputProps={{ inputMode: 'numeric', maxLength: 10, style: { fontSize: 16, letterSpacing: 1 } }} value={mo} onChange={e => onMob(e.target.value)} autoComplete="off" sx={{ '& fieldset': { borderColor: '#d1d5db' } }} /><Button variant="outlined" onClick={() => posCustDialog(A)} title="Naam thi shodho">🔍</Button></Stack>
    <Box sx={{ mt: 1 }}>{busyS ? <small>⏳ Shodhe chhe…</small> : !c ? <Typography variant="caption" color="text.secondary">10 ank lakho – juno customer hashe to naam aapo-aap aavi jashe</Typography>
      : c._new ? <Paper variant="outlined" sx={{ p: 1, bgcolor: '#f3f4f6', borderColor: '#d1d5db' }}><Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 700 }}>🆕 Navo customer</Typography>
        <TextField fullWidth size="small" id="posnn" placeholder="Customer naam *" defaultValue={c.name} onChange={e => { c.name = e.target.value.trim(); }} sx={{ my: .5, bgcolor: '#fff' }} autoFocus />
        <TextField fullWidth size="small" placeholder="Address (optional)" defaultValue={c.address} onChange={e => { c.address = e.target.value.trim(); }} sx={{ bgcolor: '#fff' }} /></Paper>
        : <Paper variant="outlined" sx={{ p: 1, bgcolor: '#ecfdf5', borderColor: '#86efac', color: '#065f46', display: 'flex', justifyContent: 'space-between' }}><span>✅ <b>{c.name}</b>{c.address ? <small> · {c.address}</small> : null}</span><IconButton size="small" onClick={() => { POS.cust = null; setMo(''); A.re(); }}><CloseIcon fontSize="small" /></IconButton></Paper>}</Box>
  </Box>;
}
function CustSearch({ onUse }) {
  const [q, setQ] = useState(''), [r, setR] = useState(null), [nw, setNw] = useState({ n: '', m: '', a: '' });
  const run = useRef(debounce(async v => { if (v.trim().length < 2) return setR(null); try { setR(await api('cust.search', { q: v.trim() })); } catch (e) { } }, 250)).current;
  return <Stack gap={1.5}>
    <TextField autoFocus placeholder="Search existing customer by name / mobile" value={q} onChange={e => { setQ(e.target.value); run(e.target.value); }} />
    {r && (r.length ? r.slice(0, 8).map((c, i) => <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: .5, borderBottom: '1px solid #eee' }}><span><b>{c.name || c.Name}</b><br /><small>{c.mobile || c.Mobile || ''}</small></span><Button size="small" variant="contained" onClick={() => onUse({ name: c.name || c.Name, mobile: c.mobile || c.Mobile, address: c.address || c.Address || '', id: c.id || c.CustomerID })}>Use</Button></Stack>) : <small>No customer found</small>)}
    <b>New customer</b>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField fullWidth label="Name *" value={nw.n} onChange={e => setNw({ ...nw, n: e.target.value })} /><TextField fullWidth label="Mobile *" inputProps={{ inputMode: 'numeric', maxLength: 10 }} value={nw.m} onChange={e => setNw({ ...nw, m: e.target.value })} /></Stack>
    <TextField label="Address" value={nw.a} onChange={e => setNw({ ...nw, a: e.target.value })} />
    <Button variant="contained" onClick={() => { const n = nw.n.trim(); if (!n) return toast('Enter customer name', 'bad'); onUse({ name: n, mobile: nw.m.replace(/\D/g, ''), address: nw.a.trim() }); }}>Use this customer</Button>
  </Stack>;
}
function posCustDialog(A) { const d = openDialog('Customer', () => <CustSearch onUse={c => { POS.cust = c; d.close(); A.re(); }} />, { maxWidth: 'sm' }); }
function posHold(A) {
  if (!POS.cart.length) return toast('Cart is empty', 'bad');
  const h = posHeld(); h.unshift({ at: Date.now(), cart: POS.cart, cust: POS.cust, disc: POS.disc, gst: POS.gst, mode: POS.mode, pay: POS.pay }); store.lset('pos_hold', JSON.stringify(h.slice(0, 10)));
  A.newOrder(); toast('Order held. Open "Held orders" to continue.');
}
function posSave(k, A) {
  return work(async () => {
    if (!POS.cart.length) return toast('Cart is empty', 'bad'); const t = posTotals(), c = POS.cust;
    if (c && c._new && !c.name) { const n = document.getElementById('posnn'); if (n) n.focus(); return toast('Navo customer chhe – naam lakho', 'bad'); }
    if (!c || !c.name) { posCustDialog(A); return toast('Select or add a customer first', 'bad'); }
    if (k === 'quote') {
      const body = { name: c.name, mobile: c.mobile, address: c.address || '', customerId: c.id || '', gst: POS.gst, gstRate: 18, date: new Date().toISOString().slice(0, 10), billDisc: t.od, note: 'POS', lines: POS.cart.map(l => ({ kind: 'Product', part: '', productId: l.id, name: l.name, brand: l.brand, model: l.model, spec: '', qty: l.qty, unitPrice: l.price, lineDisc: l.disc || 0, cost: isAdmin() ? l.cost : undefined })) };
      const r = await api('quote.save', body, { rid: rid(), loader: true }); toast('Quotation ' + r.id + ' saved'); A.newOrder(); go('quote', { id: r.id }); return;
    }
    if (!/^\d{10}$/.test(String(c.mobile || '').replace(/\D/g, '').slice(-10))) { posCustDialog(A); return toast('Mobile number (10 digits) is needed for an order', 'bad'); }
    const miss = POS.cart.filter(l => l.track === 'SERIAL' && !l.item);
    if (miss.length && (k === 'walkin' || k === 'invoice')) throw new Error('"' + miss[0].name + '": ' + (miss[0].typed ? 'lakhelo serial stock ma nathi. Pehla Purchase ma aa serial thi maal chadavo, athva "Order" tab thi save karo.' : 'serial pasand karo athva lakho.'));
    const allSer = POS.cart.every(l => l.track === 'QTY' || l.item);
    const body = { status: allSer ? 'Reserved' : 'Pending', customerId: c.id || undefined, customer: { name: c.name, mobile: c.mobile, address: c.address || '' }, note: ((POS.cart.some(l => l.typed) ? 'SN: ' + POS.cart.filter(l => l.typed).map(l => l.name.split(' ').slice(0, 3).join(' ') + ' ' + l.typed).join(', ') + ' · ' : '') + 'POS ' + (k === 'walkin' ? 'walk-in' : k) + ' · Pay: ' + POS.pay + (t.od ? ' · Disc ' + t.od : '') + (POS.gst ? ' · GST 18%' : '')).slice(0, 200), lines: POS.cart.map(l => ({ productId: l.id, qty: l.qty, unitPrice: l.price, itemId: l.item || undefined })) };
    const r = await api('ord.create', body, { rid: rid(), loader: true }); toast('Order ' + r.orderId + ' saved'); A.newOrder();
    if (k === 'walkin' || k === 'invoice') { go('sales'); setTimeout(() => openOrder(r.orderId), 600); }
  });
}
