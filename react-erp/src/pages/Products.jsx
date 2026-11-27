import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Select, Stack, TextField, Typography, IconButton, Chip, Alert, Link } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { api, S, inr, nf, isAdmin, LI, LT, rid, toast, work, debounce, shrinkImage, pickFile, swrListeners } from '../lib/core.js';
import { PageHead, Skel, Pager, Thumb, openDialog, confirmBox, ProductPicker, Note, Loading, Empty } from '../lib/ui.jsx';
import { go } from '../lib/nav.js';

export const pf = { q: '', category: '', status: 'all', low: false, page: 1, size: 24 };
export const catItems = all => (all ? [<MenuItem key="" value="">{LT('all')}</MenuItem>] : []).concat((S.boot.categories || []).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>));

export default function Products() {
  const canAdd = isAdmin() || S.boot.staffAddProduct;
  const [f, setF] = useState({ ...pf }), [r, setR] = useState(null), [n, setN] = useState(0);
  const upd = (k, v) => { const x = { ...f, [k]: v, page: k === 'page' ? v : 1 }; Object.assign(pf, x); setF(x); };
  const qRef = useRef(debounce(v => upd('q', v), 250));
  useEffect(() => { let on = true; api('prod.list', { ...f }).then(x => { if (on) { setR(x); S.plist = x.rows; } }).catch(e => toast(e.message, 'bad')); return () => { on = false; }; }, [f.category, f.status, f.low, f.page, f.q, n]);
  useEffect(() => { const l = () => setN(x => x + 1); swrListeners.add(l); return () => swrListeners.delete(l); }, []);
  return <Box>
    <PageHead title={LI('products')}>
      <Button variant="outlined" onClick={() => photoQuick()}>📷 Photo vagar na</Button>
      {canAdd && <Button variant="contained" startIcon={<AddIcon />} onClick={() => openProduct(null, null, () => setN(x => x + 1))}>{LT('newproduct')}</Button>}
    </PageHead>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder={LT('search')} defaultValue={f.q} onChange={e => qRef.current(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.category} displayEmpty onChange={e => upd('category', e.target.value)} sx={{ minWidth: 150, bgcolor: '#fff' }}>{catItems(true)}</Select>
      <Select value={f.status} onChange={e => upd('status', e.target.value)} sx={{ minWidth: 120, bgcolor: '#fff' }}><MenuItem value="all">{LT('all')}</MenuItem><MenuItem value="active">{LT('active')}</MenuItem><MenuItem value="inactive">{LT('inactive')}</MenuItem></Select>
      <FormControlLabel control={<Checkbox checked={f.low} onChange={e => upd('low', e.target.checked)} />} label={LT('lowstock')} />
      <IconButton onClick={() => go('scan')}><QrCodeScannerIcon /></IconButton>
    </Stack>
    {!r ? <Skel /> : <>
      {r.rows.length ? <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(6,1fr)' } }}>
        {r.rows.map(x => { const low = x.ReorderLevel > 0 && x.stock.available <= x.ReorderLevel, sp = +x.SellPrice; return <Paper key={x.ProductID} onClick={() => openProduct(x.ProductID, null, () => setN(y => y + 1))} sx={{ p: 1.2, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
          <Box sx={{ aspectRatio: '1', mb: 1, '& > div': { width: '100% !important', height: '100% !important' } }}><Thumb id={x.ProductID} /></Box>
          <Typography variant="body2" fontWeight={700} sx={{ minHeight: 40, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{x.Name}</Typography>
          <Typography variant="caption" color="text.secondary">{x.Category}{x.Active === 'YES' ? '' : ' · ' + LT('inactive')}</Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: .5 }}><b>{sp > 0 ? '₹' + nf(sp) : ''}</b><Chip size="small" color={low || x.stock.available <= 0 ? 'error' : 'success'} label={`${nf(x.stock.available)} ${LT('stock')}`} /></Stack>
        </Paper>; })}
      </Box> : <Alert severity="info">No products</Alert>}
      <Pager res={r} onPage={p => upd('page', p)} />
    </>}
  </Box>;
}

/* ---------- product form (new / view / edit) ---------- */
export async function openProduct(id, prefill, onSaved) {
  let p;
  if (id) { try { p = await api('prod.get', { id }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); } }
  else p = Object.assign({ TrackingType: 'QTY', Active: 'YES', ReorderLevel: 0, SellPrice: 0, Category: S.boot.categories[0] }, prefill || {});
  const edit = isAdmin() || (!id && S.boot.staffAddProduct);
  const hasStock = id && (p.stock.physical + p.stock.sold + p.stock.returned + p.stock.damaged > 0);
  const v = { name: p.Name || '', category: p.Category || '', brand: p.Brand || '', model: p.Model || '', sku: p.SKU || '', barcode: p.Barcode || '', trackingType: p.TrackingType, reorderLevel: p.ReorderLevel, sellPrice: p.SellPrice, costPrice: p.CostPrice || 0, description: p.Description || '', active: p.Active === 'YES' ? 'YES' : 'NO' };
  const _rid = rid();
  const save = (close) => work(async () => {
    const body = { id: id || undefined, name: v.name, category: v.category, brand: v.brand, model: v.model, sku: v.sku, barcode: v.barcode, trackingType: v.trackingType, reorderLevel: v.reorderLevel, sellPrice: isAdmin() ? v.sellPrice : 0, costPrice: isAdmin() ? v.costPrice : undefined, description: v.description, active: id ? v.active === 'YES' : true };
    const r = await api('prod.save', body, { rid: _rid });
    toast('Saved', 'ok'); close(); S.thumbs = {};
    if (!id) openProduct(r.id, null, onSaved); else if (onSaved) onSaved();
  });
  openDialog(id ? p.Name : LT('newproduct'), () => <ProductForm p={p} id={id} v={v} edit={edit} hasStock={hasStock} />, {
    maxWidth: 'md', actions: close => <>
      {id && <Button startIcon={<PrintIcon />} onClick={() => { close(); go('print', { productIds: [id] }); }}>{LT('printsticker')}</Button>}
      <Button color="inherit" onClick={close}>{LT('close')}</Button>
      {edit && <Button variant="contained" onClick={() => save(close)}>{LT('save')}</Button>}
    </>
  });
}
function ProductForm({ p, id, v, edit, hasStock }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  const ro = !edit;
  const F = (k, label, o) => <TextField fullWidth label={label} value={v[k]} disabled={ro} onChange={e => set(k, e.target.value)} {...(o || {})} />;
  return <Stack gap={2} sx={{ pt: 1 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>{F('name', LT('name') + ' *')}<TextField select fullWidth label={LT('category') + ' *'} value={v.category} disabled={ro} onChange={e => set('category', e.target.value)}>{catItems(false)}</TextField></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>{F('brand', LT('brand'))}{F('model', LT('model'))}</Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>{F('sku', LT('sku'))}{F('barcode', LT('barcode') + ' (blank = auto)')}</Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
      <TextField select fullWidth label={LT('tracking')} value={v.trackingType} disabled={ro || hasStock} onChange={e => set('trackingType', e.target.value)}>
        <MenuItem value="SERIAL">Manufacturer serial number (Laptop, Monitor, Printer...)</MenuItem><MenuItem value="ITEMID">Internal Item ID for every piece (RAM, SSD...)</MenuItem><MenuItem value="QTY">Quantity only (Mouse, Cable...)</MenuItem></TextField>
      {F('reorderLevel', LT('reorder'), { type: 'number', inputProps: { min: 0 } })}
      {isAdmin() && F('sellPrice', 'Selling price (default) ₹', { type: 'number', inputProps: { min: 0 } })}
      {isAdmin() && F('costPrice', 'Cost price ₹ (only you see this)', { type: 'number', inputProps: { min: 0, step: 0.01 } })}
    </Stack>
    {F('description', LT('desc'), { multiline: true, minRows: 2 })}
    {id ? <>
      <TextField select label={LT('status')} value={v.active} disabled={ro} onChange={e => set('active', e.target.value)}><MenuItem value="YES">{LT('active')}</MenuItem><MenuItem value="NO">{LT('inactive')}</MenuItem></TextField>
      <Box><Typography variant="subtitle2" sx={{ mb: 1 }}>{LT('photo')} (max 6)</Typography><PhotoWidget pid={id} photos={p.photos} name={[p.Brand, p.Name].filter(Boolean).join(' ')} /></Box>
      <Alert severity="info">Stock: <b>{p.stock.available}</b> {LT('available')} · {p.stock.reserved} {LT('reserved')} · {p.stock.physical} {LT('physical')} · {p.stock.damaged} {LT('damaged')}</Alert>
    </> : <Alert severity="info">Save the product first, then add photos.</Alert>}
  </Stack>;
}

/* ---------- photos ---------- */
export function PhotoWidget({ pid, photos, name }) {
  S.phTh = S.phTh || {};
  const [cur, setCur] = useState(photos.slice()), [pending, setPending] = useState(0), [, setN] = useState(0);
  useEffect(() => {
    const miss = cur.filter(f => !S.phTh[f.id]).map(f => f.id);
    if (miss.length) api('photo.thumbs', { photoIds: miss }).then(m => { miss.forEach(i => { if (m[i]) S.phTh[i] = m[i]; }); setN(x => x + 1); }).catch(() => { });
  }, [cur]);
  const refresh = async () => { const p = await api('prod.get', { id: pid }); S.thumbs[pid] = undefined; setCur(p.photos); };
  const bg = async f => {
    setPending(x => x + 1);
    try {
      const full = await shrinkImage(f, 900, 0.7), thumb = await shrinkImage(f, 150, 0.6);
      const r = await api('photo.upload', { productId: pid, dataUrl: full, thumbUrl: thumb }, { rid: rid() });
      if (r.duplicate) toast('This photo is already saved', 'ok');
      else { S.phTh[r.photoId] = thumb; setCur(c => c.concat([{ id: r.photoId }])); toast('Photo saved', 'ok'); }
      S.thumbs[pid] = undefined;
    } catch (e) { toast(e.message || 'Photo upload failed', 'bad'); }
    setPending(x => x - 1);
  };
  useEffect(() => {
    const onP = e => { const it = [...((e.clipboardData || {}).items || [])].find(x => /^image\//.test(x.type)); if (it && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) { e.preventDefault(); bg(it.getAsFile()); } };
    document.addEventListener('paste', onP); return () => document.removeEventListener('paste', onP);
  }, []);
  const tile = { width: 92, height: 92, borderRadius: 2, overflow: 'hidden', position: 'relative', border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', bgcolor: '#f8fafc', cursor: 'pointer' };
  return <Box>
    <Stack direction="row" gap={1} flexWrap="wrap">
      {cur.map(f => <Box key={f.id} sx={tile} onClick={() => viewPhoto(pid, f.id, () => { S.phTh[f.id] = undefined; refresh(); })}>
        {S.phTh[f.id] ? <img src={S.phTh[f.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon color="disabled" />}
        {isAdmin() && <IconButton size="small" sx={{ position: 'absolute', top: 2, right: 2, bgcolor: '#fff' }} onClick={async e => { e.stopPropagation(); if (await confirmBox('Delete this photo?')) await work(async () => { await api('photo.delete', { photoId: f.id }, { rid: rid() }); S.thumbs[pid] = undefined; setCur(c => c.filter(x => x.id !== f.id)); }); }}><CloseIcon fontSize="small" /></IconButton>}
      </Box>)}
      {pending > 0 && <Box sx={{ ...tile, opacity: .6 }}><small>Uploading {pending}...</small></Box>}
      {cur.length + pending < 6 && <>
        <Box sx={tile} onClick={async () => { const f = await pickFile(true); if (f) bg(f); }}><Stack alignItems="center"><CameraAltIcon /><small>Camera</small></Stack></Box>
        <Box sx={tile} onClick={async () => { const f = await pickFile(false); if (f) bg(f); }}><Stack alignItems="center"><ImageIcon /><small>Gallery</small></Stack></Box>
        <Box component="a" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent((name || '') + ' product')}`} target="ccgimg" rel="noopener" sx={{ ...tile, textDecoration: 'none', color: 'inherit' }}><Stack alignItems="center"><span style={{ fontSize: 24 }}>🔍</span><small>Google</small></Stack></Box>
        <Box sx={tile} onClick={async () => { try { for (const it of await navigator.clipboard.read()) { const ty = it.types.find(x => /^image\//.test(x)); if (ty) return bg(new File([await it.getType(ty)], 'paste.png', { type: ty })); } toast('Copy karelu photo nathi. Google ma photo par right-click → Copy image karo.', 'bad'); } catch (e) { toast('Paste na chalyu. Ahi dabavi Ctrl+V karo.', 'bad'); } }}><Stack alignItems="center"><span style={{ fontSize: 24 }}>📋</span><small>Paste</small></Stack></Box>
      </>}
    </Stack>
    <Typography variant="caption" color="text.secondary">Tap a photo to see it big or replace it. 🔍 Google ma photo shodho → right-click → Copy image → 📋 Paste (athva Ctrl+V).</Typography>
  </Box>;
}
export async function uploadPhoto(pid, file, replaceId) {
  const full = await shrinkImage(file, 900, 0.7), thumb = await shrinkImage(file, 150, 0.6);
  const r = await api('photo.upload', { productId: pid, dataUrl: full, thumbUrl: thumb, replaceId: replaceId || undefined }, { rid: rid() });
  toast(r.duplicate ? 'This photo is already saved' : 'Photo saved', 'ok'); S.thumbs[pid] = undefined; return r;
}
function BigPhoto({ photoId }) {
  const [u, setU] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('photo.full', { photoId }).then(setU, e => setErr(e.message)); }, [photoId]);
  return err ? <Typography>{err}</Typography> : u ? <img src={u} alt="" style={{ width: '100%', borderRadius: 10 }} /> : <Loading />;
}
export function viewPhoto(pid, photoId, done) {
  const rep = (cap, close) => async () => { const f = await pickFile(cap); if (!f) return; await work(async () => { await uploadPhoto(pid, f, photoId); close(); done(); }); };
  openDialog(LT('photo'), () => <BigPhoto photoId={photoId} />, { maxWidth: 'sm', actions: close => <><Button startIcon={<CameraAltIcon />} onClick={rep(true, close)}>Replace (camera)</Button><Button startIcon={<ImageIcon />} onClick={rep(false, close)}>Replace (gallery)</Button></> });
}
function AddPhotoBody() {
  const [p, setP] = useState(null);
  return <Stack gap={2} sx={{ pt: 1 }}><ProductPicker autoFocus onPick={async x => { try { setP(null); setP(await api('prod.get', { id: x.ProductID }, { loader: true })); } catch (e) { toast(e.message, 'bad'); } }} />
    {p && <Box><b>{p.Name}</b><Box sx={{ mt: 1 }}><PhotoWidget key={p.ProductID} pid={p.ProductID} photos={p.photos} name={[p.Brand, p.Name].filter(Boolean).join(' ')} /></Box></Box>}</Stack>;
}
export function addPhotoDialog() { openDialog(LT('addphoto'), () => <AddPhotoBody />, { maxWidth: 'sm' }); }

/* ---------- quick photo mode: products without a photo, find on Google, paste with Ctrl+V ---------- */
async function phqLoad(cat) {
  const out = []; let page = 1, total = 1;
  while ((page - 1) * 50 < total && page <= 40) { const r = await api('prod.list', { size: 50, page, category: cat || '', status: 'active' }, { loader: false }); total = r.total; r.rows.forEach(x => { if (!x.photos) out.push({ id: x.ProductID, name: x.Name, cat: x.Category, brand: x.Brand, model: x.Model }); }); page++; }
  return out;
}
function PhotoQuick() {
  const [list, setList] = useState(null), [i, setI] = useState(0), [done, setDone] = useState(0), [st, setSt] = useState(''), [err, setErr] = useState('');
  const [q, setQ] = useState(''), [hits, setHits] = useState(null);
  const busyR = useRef(false), stRef = useRef({}); stRef.current = { list, i };
  useEffect(() => { phqLoad(pf.category).then(setList, e => setErr(e.message)); }, []);
  const save = async file => {
    const { list: l, i: k } = stRef.current; const p = l && l[k]; if (!p || busyR.current) return;
    busyR.current = true; setSt('⏳ Save thay chhe...');
    try { await uploadPhoto(p.id, file); setDone(x => x + 1); setI(x => x + 1); setSt(''); } catch (e) { setSt(''); toast(e.message || 'Photo save na thayo', 'bad'); }
    busyR.current = false;
  };
  useEffect(() => {
    const onPaste = e => { const it = [...((e.clipboardData || {}).items || [])].find(x => /^image\//.test(x.type)); if (it) { e.preventDefault(); save(it.getAsFile()); } else if (e.target && e.target.id === 'phqQ') return; else toast('Copy karelu photo nathi. Google ma photo par right-click → "Copy image" karo.', 'bad'); };
    document.addEventListener('paste', onPaste); return () => document.removeEventListener('paste', onPaste);
  }, []);
  const search = useRef(debounce(async (v, l) => {
    const qq = v.trim().toLowerCase(); if (qq.length < 2) { setHits(null); return; }
    const tk = qq.split(/\s+/), hit = l.filter(x => tk.every(t => (x.name + ' ' + (x.brand || '') + ' ' + (x.model || '') + ' ' + x.cat).toLowerCase().includes(t))).slice(0, 10).map(x => ({ x, has: false }));
    let more = [];
    if (hit.length < 5) { try { more = (await api('prod.quick', { q: v }, { loader: false })).filter(x => !hit.some(h => h.x.id === x.ProductID)).slice(0, 8).map(x => ({ x: { id: x.ProductID, name: x.Name, cat: x.Category, brand: x.Brand, model: x.Model }, has: true })); } catch (e) { } }
    setHits(hit.concat(more));
  }, 250)).current;
  const pick = h => { setQ(''); setHits(null); const k = list.findIndex(y => y.id === h.x.id); if (k >= 0) setI(k); else { const l = list.slice(); l.splice(i, 0, h.x); setList(l); } };
  if (err) return <Alert severity="error">{err}</Alert>;
  if (!list) return <Skel />;
  const p = list[i];
  if (!p) return <Alert severity="info" sx={{ fontSize: 16 }}>✅ {list.length ? 'Badha product joi lidha!' : 'Badha product ma photo chhe!'} {done ? done + ' photo save thaya.' : ''}</Alert>;
  const qtxt = [p.brand, p.name].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  return <Stack gap={1.5}>
    <Box sx={{ position: 'relative' }}><TextField fullWidth id="phqQ" placeholder="🔍 Product naam thi shodho (e.g. HDMI, WD 1TB)" value={q} onChange={e => { setQ(e.target.value); search(e.target.value, list); }} onKeyDown={e => { if (e.key === 'Enter' && hits && hits[0]) pick(hits[0]); }} />
      {hits && <Paper elevation={6} sx={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 5, maxHeight: 300, overflow: 'auto' }}>{hits.length ? hits.map((h, k) => <Box key={k} onClick={() => pick(h)} sx={{ p: 1.2, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}><b>{h.x.name}</b> <Chip size="small" label={h.has ? 'photo chhe – navo umero' : 'photo nathi'} /></Box>) : <Box sx={{ p: 1.2 }}><i>Koi product nathi malyu</i></Box>}</Paper>}</Box>
    <Chip label={`${i + 1} / ${list.length} · ${done} save thaya`} sx={{ alignSelf: 'flex-start' }} />
    <Typography variant="h6" fontWeight={800}>{p.name}</Typography><Chip size="small" label={p.cat} sx={{ alignSelf: 'flex-start' }} />
    <Button variant="contained" size="large" href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(qtxt + ' product')}`} target="ccgimg" rel="noopener">🔍 1. Google ma photo shodho</Button>
    <Box tabIndex={0} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(x => /^image\//.test(x.type)); if (f) save(f); else toast('Photo copy kari Ctrl+V karo (drag nahi chale).', 'bad'); }}
      sx={{ border: '3px dashed #2563eb', borderRadius: 3, p: 3, textAlign: 'center', bgcolor: '#eff6ff', outline: 'none' }}>
      <Typography fontSize={30}>📋</Typography><b>2. Photo copy kari ahi Ctrl+V dabavo</b><br /><small>Google ma photo par click → mota photo par right-click → "Copy image"</small>
      <Typography fontWeight={700} sx={{ mt: 1 }}>{st}</Typography></Box>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Button variant="outlined" onClick={() => setI(x => Math.max(0, x - 1))}>◀ Pachhu</Button>
      <Button variant="outlined" onClick={async () => { try { const items = await navigator.clipboard.read(); for (const it of items) { const ty = it.types.find(x => /^image\//.test(x)); if (ty) return save(new File([await it.getType(ty)], 'paste.png', { type: ty })); } toast('Copy karelu photo nathi.', 'bad'); } catch (e) { toast('Ahi Ctrl+V dabavo (ke "Allow" aapo)', 'bad'); } }}>📋 Paste</Button>
      <Button variant="outlined" onClick={async () => { const f = await pickFile(false); if (f) save(f); }}>🖼 File</Button>
      <Button variant="outlined" onClick={() => setI(x => x + 1)}>Skip ▶</Button>
    </Stack>
  </Stack>;
}
export function photoQuick() { openDialog('📷 Photo vagar na product', () => <PhotoQuick />, { maxWidth: 'sm' }); }
