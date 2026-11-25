/* ================= shared React UI pieces (MUI) ================= */
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  LinearProgress, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Paper, Skeleton,
  List, ListItemButton, ListItemText, Popper, ClickAwayListener, InputAdornment, useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SearchIcon from '@mui/icons-material/Search';
import { api, ui, nf, inr, esc, S, STAT_COLOR, STAT_KEY, LI, LT, loadThumbs, debounce, qLoadJs, pickFile, niceStep, shortNum, PAL, toast } from './core.js';

/* ---------- tiny global store helper ---------- */
function createStore(initial) {
  let state = initial; const subs = new Set();
  return {
    get: () => state,
    set: v => { state = typeof v === 'function' ? v(state) : v; subs.forEach(f => f()); },
    sub: f => { subs.add(f); return () => subs.delete(f); }
  };
}
const toastStore = createStore(null);
const busyStore = createStore(0);
const dlgStore = createStore([]);
let dlgSeq = 0;

ui.toast = (msg, type) => toastStore.set({ msg: String(msg || ''), type: type || '', k: Date.now() });
ui.busy = on => busyStore.set(n => Math.max(0, n + (on ? 1 : -1)));

/* openDialog(title, render(close) => node, { actions: close => node, maxWidth, sticky, onClose }) -> { close } */
export function openDialog(title, render, o) {
  o = o || {}; const id = ++dlgSeq;
  const close = () => { dlgStore.set(l => l.filter(d => d.id !== id)); if (o.onClose) o.onClose(); };
  dlgStore.set(l => l.concat([{ id, title, render, o, close }]));
  return { close };
}
export function confirmBox(msg) {
  return new Promise(res => {
    const d = openDialog(msg, () => null, { maxWidth: 'xs', sticky: true, actions: close => <><Button color="inherit" onClick={() => { d.close(); res(false); }}>{LT('cancel')}</Button><Button variant="contained" onClick={() => { d.close(); res(true); }}>OK</Button></> });
  });
}
/* ask for one line of text */
export function promptBox(title, label, initial) {
  return new Promise(res => {
    let v = initial || '';
    const d = openDialog(title, () => <TextField autoFocus fullWidth label={label} defaultValue={v} onChange={e => { v = e.target.value; }} sx={{ mt: 1 }} />, { maxWidth: 'xs', sticky: true, actions: () => <><Button color="inherit" onClick={() => { d.close(); res(null); }}>{LT('cancel')}</Button><Button variant="contained" onClick={() => { d.close(); res(v); }}>OK</Button></> });
  });
}

export function UiHost() {
  const t = useSyncExternalStore(toastStore.sub, toastStore.get);
  const b = useSyncExternalStore(busyStore.sub, busyStore.get);
  const dl = useSyncExternalStore(dlgStore.sub, dlgStore.get);
  const small = useMediaQuery('(max-width:700px)');
  return <>
    {b > 0 && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 3000 }} />}
    {dl.map(d => <Dialog key={d.id} open fullWidth fullScreen={small && d.o.full !== false && d.o.maxWidth !== 'xs'} maxWidth={d.o.maxWidth || 'md'} onClose={(e, why) => { if (d.o.sticky && why === 'backdropClick') return; d.close(); }} scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>{d.title}<IconButton onClick={d.close} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
      <DialogContent dividers><DlgBody d={d} /></DialogContent>
      {d.o.actions && <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>{d.o.actions(d.close)}</DialogActions>}
    </Dialog>)}
    <Snackbar open={!!t} key={t && t.k} autoHideDuration={t && t.type === 'bad' ? 6000 : 2800} onClose={(e, r) => { if (r !== 'clickaway') toastStore.set(null); }} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ zIndex: 4000 }}>
      {t ? <Alert variant="filled" severity={t.type === 'bad' ? 'error' : t.type === 'ok' ? 'success' : 'info'} onClose={() => toastStore.set(null)}>{t.msg}</Alert> : <span />}
    </Snackbar>
  </>;
}
function DlgBody({ d }) { return d.render(d.close) || null; }

/* ---------- page header ---------- */
export function PageHead({ title, children }) {
  return <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
    <Typography variant="h5" fontWeight={800}>{title}</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">{children}</Stack>
  </Stack>;
}
export function Skel() { return <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' } }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={90} />)}</Box>; }
export function Loading() { return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>; }
export function Empty({ children }) { return <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>{children || 'Nothing to show'}</Typography>; }
export function Note({ children, sev }) { return <Alert severity={sev || 'warning'} sx={{ my: 1 }}>{children}</Alert>; }
export function Section({ title, children, sx, right }) {
  return <Card sx={sx}><CardContent>{(title || right) && <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} gap={1} flexWrap="wrap"><Typography variant="subtitle1" fontWeight={800}>{title}</Typography>{right}</Stack>}{children}</CardContent></Card>;
}
export function Grid({ cols, children, gap, sx }) {
  const c = cols || 4;
  return <Box sx={{ display: 'grid', gap: gap || 2, gridTemplateColumns: { xs: c >= 3 ? '1fr 1fr' : '1fr', sm: `repeat(${Math.min(c, 2)},1fr)`, md: `repeat(${c},1fr)` }, ...(sx || {}) }}>{children}</Box>;
}
export function Pill({ s, label, color }) {
  return <Chip size="small" label={label || (STAT_KEY[s] ? LI(STAT_KEY[s]) : s)} color={color || STAT_COLOR[s] || 'default'} variant={STAT_COLOR[s] || color ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />;
}
export function Stat({ label, value, color, onClick }) {
  return <Paper variant="outlined" onClick={onClick} sx={{ p: 1.5, borderLeft: `4px solid ${color || '#1f6feb'}`, cursor: onClick ? 'pointer' : 'default' }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={800}>{value}</Typography></Paper>;
}
export function Kpi({ label, value, color, icon }) {
  return <Paper sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', borderTop: `3px solid ${color}` }}>
    <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: color + '22', color, display: 'grid', placeItems: 'center', flex: 'none' }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={800} noWrap>{value}</Typography></Box>
  </Paper>;
}

/* ---------- table ---------- */
/* cols: [{h, k:(row,i)=>node, align:'right', w}] */
export function DataTable({ cols, rows, onRow, empty, dense, sx, maxH }) {
  if (!rows || !rows.length) return <Paper variant="outlined"><Empty>{empty}</Empty></Paper>;
  return <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: maxH, ...(sx || {}) }}>
    <Table size={dense === false ? 'medium' : 'small'} stickyHeader={!!maxH}>
      <TableHead><TableRow>{cols.map((c, i) => <TableCell key={i} align={c.align} sx={{ fontWeight: 800, whiteSpace: 'nowrap', width: c.w }}>{c.h}</TableCell>)}</TableRow></TableHead>
      <TableBody>{rows.map((r, i) => <TableRow key={i} hover={!!onRow} onClick={onRow ? () => onRow(r, i) : undefined} sx={{ cursor: onRow ? 'pointer' : 'default' }}>
        {cols.map((c, j) => <TableCell key={j} align={c.align} sx={c.nw ? { whiteSpace: 'nowrap' } : undefined}>{c.k(r, i)}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  </TableContainer>;
}
export function Pager({ res, onPage }) {
  if (!res) return null;
  if (res.total <= res.size) return <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>{nf(res.total)}</Typography>;
  const pages = Math.ceil(res.total / res.size);
  return <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1} sx={{ mt: 1 }}>
    <Typography variant="caption">{nf(res.total)}</Typography>
    <Button size="small" variant="outlined" disabled={res.page <= 1} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onPage(res.page - 1); }}>‹</Button>
    <b>{res.page}/{pages}</b>
    <Button size="small" variant="outlined" disabled={res.page >= pages} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onPage(res.page + 1); }}>›</Button>
  </Stack>;
}
export const B = ({ children }) => <b>{children}</b>;
export const Sub = ({ children }) => children ? <><br /><Typography component="small" variant="caption" color="text.secondary">{children}</Typography></> : null;

/* ---------- product photo thumb (loads after the list shows) ---------- */
export function Thumb({ id, size }) {
  const [u, setU] = useState(S.thumbs[id] || '');
  useEffect(() => { let on = true; if (!id) return; if (S.thumbs[id] !== undefined) { setU(S.thumbs[id]); return; } loadThumbs([id]).then(t => { if (on) setU(t[id] || ''); }); return () => { on = false; }; }, [id]);
  const sz = size || 44;
  return <Box sx={{ width: sz, height: sz, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#f1f5f9', display: 'grid', placeItems: 'center', flex: 'none' }}>
    {u ? <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon sx={{ color: '#94a3b8' }} />}
  </Box>;
}
/* preload many thumbs at once (fewer server calls) */
export function useThumbs(ids) { useEffect(() => { if (ids && ids.length) loadThumbs(ids); }, [JSON.stringify(ids || [])]); }

/* ---------- charts (plain SVG, same as the live ERP) ---------- */
export function BarChart({ data, series, w, h }) {
  const W = w || 560, H = h || 210, pl = 44, pb = 26, pt = 8, n = data.length, ns = series.length;
  const max = Math.max(1, ...data.map(d => Math.max(...series.map(s => d[s.k] || 0)))), step = niceStep(max / 4), top = Math.ceil(max / step) * step;
  const lines = []; for (let v = 0; v <= top; v += step) lines.push(v);
  const gw = (W - pl - 10) / Math.max(1, n), bw = Math.min(22, (gw - 8) / ns);
  return <Box>
    <Stack direction="row" gap={2} sx={{ mb: .5 }}>{series.map(se => <Stack key={se.k} direction="row" alignItems="center" gap={.5}><Box sx={{ width: 10, height: 10, borderRadius: .5, bgcolor: se.c }} /><Typography variant="caption">{se.n}</Typography></Stack>)}</Stack>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {lines.map(v => { const y = H - pb - (v / top) * (H - pb - pt); return <g key={v}><line x1={pl} x2={W - 6} y1={y} y2={y} stroke="#e8edf6" /><text x={pl - 6} y={y + 4} fontSize="10" fill="#64748b" textAnchor="end">{shortNum(v)}</text></g>; })}
      {data.map((d, i) => <g key={i}>
        {series.map((se, j) => { const hh = ((d[se.k] || 0) / top) * (H - pb - pt), x = pl + i * gw + (gw - bw * ns) / 2 + j * bw; return <rect key={j} x={x} y={H - pb - hh} width={Math.max(1, bw - 2)} height={hh} rx="3" fill={se.c}><title>{`${d.label} ${se.n}: ${nf(d[se.k])}`}</title></rect>; })}
        <text x={pl + i * gw + gw / 2} y={H - 8} fontSize="10.5" fill="#64748b" textAnchor="middle">{d.label}</text>
      </g>)}
    </svg>
  </Box>;
}
export function Donut({ items, top, sub }) {
  const tot = items.reduce((a, b) => a + b.value, 0) || 1, R = 70, r = 46, cx = 90, cy = 90; let a0 = -Math.PI / 2;
  const paths = items.map((it, i) => {
    const a1 = a0 + (it.value / tot) * Math.PI * 2 - 0.0001, big = a1 - a0 > Math.PI ? 1 : 0, p = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    const el = items.length === 1 ? <circle key={i} cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke={PAL[i % 9]} strokeWidth={R - r} /> : <path key={i} d={`M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z`} fill={PAL[i % 9]}><title>{`${it.name}: ${nf(it.value)}`}</title></path>;
    a0 = a1 + 0.0001; return el;
  });
  return <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2}>
    <svg viewBox="0 0 180 180" width="170" height="170">{paths}<text x="90" y="88" textAnchor="middle" fontSize="19" fontWeight="800" fill="#14213d">{top}</text><text x="90" y="106" textAnchor="middle" fontSize="11" fill="#64748b">{sub}</text></svg>
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>{items.map((it, i) => <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: PAL[i % 9], display: 'inline-block' }} />{it.name} ({Math.round(it.value * 100 / tot)}%)</li>)}</Box>
  </Stack>;
}

/* ---------- product picker: type to search, or scan a barcode and press Enter ---------- */
export function ProductPicker({ onPick, placeholder, autoFocus }) {
  const [q, setQ] = useState(''), [rows, setRows] = useState(null);
  const anchor = useRef(null), seq = useRef(0);
  const run = useRef(debounce(async (v, my) => {
    if (v.length < 2) { setRows(null); return; }
    try { const r = await api('prod.quick', { q: v }); if (my === seq.current) setRows(r); } catch (e) { }
  }, 220)).current;
  const choose = (p, item) => { setRows(null); setQ(''); onPick(p, item); };
  const onKey = async e => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const code = q.trim(); if (!code) return;
    try {
      const r = await api('scan', { code });
      if (r.kind === 'UNKNOWN') { if (rows && rows.length === 1) return choose(rows[0], null); return toast('Not found: ' + code, 'bad'); }
      choose(Object.assign({}, r.product, { available: r.product.stock.available }), r.item);
    } catch (er) { toast(er.message, 'bad'); }
  };
  return <ClickAwayListener onClickAway={() => setRows(null)}><Box ref={anchor} sx={{ position: 'relative', flex: 1, minWidth: 220 }}>
    <TextField fullWidth size="small" autoFocus={autoFocus} value={q} placeholder={placeholder || LT('search')} autoComplete="off"
      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      onChange={e => { const v = e.target.value; setQ(v); run(v.trim(), ++seq.current); }} onKeyDown={onKey} />
    <Popper open={!!rows} anchorEl={anchor.current} placement="bottom-start" style={{ zIndex: 2000, width: anchor.current ? anchor.current.offsetWidth : 300 }}>
      <Paper elevation={6} sx={{ maxHeight: 360, overflow: 'auto' }}>
        <List dense>{rows && rows.length ? rows.map(p => <ListItemButton key={p.ProductID} onClick={() => choose(p, null)}>
          <ListItemText primary={<b>{p.Name}</b>} secondary={`${p.Category} · ${p.Brand} ${p.Model}`} />
          <Chip size="small" color={p.available > 0 ? 'success' : 'error'} label={nf(p.available)} />
        </ListItemButton>) : <ListItemButton disabled><ListItemText primary="No product found" /></ListItemButton>}</List>
      </Paper>
    </Popper>
  </Box></ClickAwayListener>;
}

/* ---------- barcode reader: phone's own reader, else free ZXing ---------- */
async function scDetector() {
  if ('BarcodeDetector' in window) return new window.BarcodeDetector();
  if (!window.ZXing) await qLoadJs(['https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js', 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js']);
  const Z = window.ZXing, hints = new Map(); hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  return {
    detect: async src => {
      const w0 = src.videoWidth || src.width, h0 = src.videoHeight || src.height; if (!w0 || !h0) return [];
      const still = !src.videoWidth;
      const regs = still ? [[0, 0, 1, 1], [0, .5, 1, .5], [0, .3, 1, .4], [.15, .5, .7, .3], [0, 0, 1, .5], [0, .65, 1, .35]] : [[0, 0, 1, 1]];
      const ks = still ? [1, 2, .5] : [1, .5];
      for (const g of regs) for (const kk of ks) {
        const sx = g[0] * w0, sy = g[1] * h0, sw = g[2] * w0, sh = g[3] * h0, k = Math.min(kk * (still ? 1.5 : 1), 1600 / Math.max(sw, sh), still ? 4 : 1);
        cv.width = Math.max(40, Math.round(sw * k)); cv.height = Math.max(40, Math.round(sh * k)); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
        try { const r = new Z.MultiFormatReader(); r.setHints(hints); const res = r.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))); if (res) return [{ rawValue: res.getText() }]; } catch (e) { }
      }
      return [];
    }
  };
}
function ScannerBody({ close, onCode, onPhoto }) {
  const [v, setV] = useState(''), [msg, setMsg] = useState(null), [cam, setCam] = useState(false);
  const vid = useRef(null), stream = useRef(null), timer = useRef(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); if (stream.current) stream.current.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => stop, []);
  const fin = x => { x = String(x || '').trim(); if (!x) return; stop(); close(); onCode(x); };
  const startCam = async () => {
    let det = null; try { det = await scDetector(); } catch (e) { det = null; }
    if (!det) { setMsg('Barcode reader load na thayu (internet check karo). Serial type karo.'); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      setCam(true); setMsg('Hold the barcode inside the picture.');
      setTimeout(async () => {
        const el = vid.current; if (!el) return; el.srcObject = stream.current; await el.play();
        timer.current = setInterval(async () => { try { const r = await det.detect(el); if (r.length) fin(r[0].rawValue); } catch (e) { } }, 350);
      }, 50);
      return;
    } catch (e) { stop(); }
    setMsg('Live camera is blocked here, so take a clear photo of the barcode.');
    const f = await pickFile(true); if (!f) return;
    try { const bmp = await createImageBitmap(f); const r = await det.detect(bmp); if (r.length) fin(r[0].rawValue); else setMsg('Barcode not found in photo. Move closer and try again, or type it.'); }
    catch (e) { setMsg('Could not read the photo. Type the number instead.'); }
  };
  const takePhoto = async () => {
    const f = await pickFile(true); if (!f) return;
    try { const det = await scDetector(), bmp = await createImageBitmap(f), r = await det.detect(bmp); if (r.length) return fin(r[0].rawValue); } catch (e) { }
    stop(); close(); onPhoto(f);
  };
  return <Box sx={{ textAlign: 'center' }}>
    <QrCodeScannerIcon sx={{ fontSize: 48, color: 'primary.main' }} />
    <Typography><b>Scan with Bluetooth scanner</b> or type code, then press Enter</Typography>
    <TextField autoFocus fullWidth value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fin(v); } }} placeholder="Barcode / Serial / Item ID" sx={{ maxWidth: 360, my: 1 }} inputProps={{ style: { textAlign: 'center', fontSize: 16 } }} />
    <Stack direction="row" gap={1} justifyContent="center"><Button variant="contained" onClick={() => fin(v)}>OK</Button><Button variant="outlined" startIcon={<CameraAltIcon />} onClick={startCam}>Camera</Button>
      {onPhoto && <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={takePhoto}>Photo lo</Button>}</Stack>
    {cam && <video ref={vid} playsInline muted style={{ width: '100%', maxWidth: 420, marginTop: 12, borderRadius: 12 }} />}
    {msg && <Alert severity="info" sx={{ mt: 1 }}>{msg}</Alert>}
  </Box>;
}
export function openScanner(onCode, title, onPhoto) { return openDialog(title || LT('scan'), close => <ScannerBody close={close} onCode={onCode} onPhoto={onPhoto} />, { maxWidth: 'sm' }); }

/* ---------- reload a page when a fresher saved copy arrives (instant screens) ---------- */
export function useAsync(fn, deps) {
  const [st, setSt] = useState({ data: null, err: null, loading: true, n: 0 });
  const reload = () => setSt(s => ({ ...s, n: s.n + 1 }));
  useEffect(() => {
    let on = true; setSt(s => ({ ...s, loading: true }));
    Promise.resolve().then(fn).then(d => { if (on) setSt(s => ({ ...s, data: d, err: null, loading: false })); }, e => { if (on) setSt(s => ({ ...s, err: e, loading: false })); });
    return () => { on = false; };
  }, [...(deps || []), st.n]);
  return { ...st, reload };
}
export { inr, nf, esc };
