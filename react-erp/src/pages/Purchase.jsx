import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, TextField, Typography, Card, CardContent, IconButton, Chip, Alert, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SaveIcon from '@mui/icons-material/SaveAlt';
import { api, S, inr, nf, isAdmin, isAcct, LI, LT, rid, toast, work, dtm, todayStr, shrinkImage, busy, pickFile } from '../lib/core.js';
import { uploadPhoto } from './Products.jsx';
import { PageHead, Skel, Pager, Thumb, DataTable, Stat, Grid, Pill, openDialog, openScanner, ProductPicker, Empty } from '../lib/ui.jsx';
import { useList, useFilter, useDebounced } from '../lib/hooks.js';
import { go, refresh } from '../lib/nav.js';
import { PurImportButtons } from './PurImport.jsx';

export const lineTrkNote = t => t === 'SERIAL' ? 'Serial number needed for each piece' : t === 'ITEMID' ? 'Each piece gets its own Item ID' : 'Quantity only';
export const splitSerials = v => String(v || '').split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
export const purf = { q: '', status: '', page: 1 };

export default function Purchase({ params }) {
  if (params.new) return <PurchaseForm params={params} />;
  return <PurchaseList />;
}
function PurchaseList() {
  const [f, set] = useFilter(purf);
  const [r] = useList('pur.list', f);
  const q = useDebounced(v => set('q', v));
  const a = isAdmin();
  return <Box>
    <PageHead title={LI('purchase')}>
      {(a || isAcct()) && <PurImportButtons />}
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => go('purchase', { new: 1 })}>{LT('newpurchase')}</Button>
    </PageHead>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <TextField placeholder={`${LT('vendor')} / ${LT('billno')}`} defaultValue={f.q} onChange={e => q(e.target.value)} sx={{ flex: 1, minWidth: 200, bgcolor: '#fff' }} />
      <Select value={f.status} displayEmpty onChange={e => set('status', e.target.value)} sx={{ minWidth: 150, bgcolor: '#fff' }}><MenuItem value="">{LT('all')}</MenuItem>{['Ordered', 'Partial', 'Received'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select>
    </Stack>
    {!r ? <Skel /> : <><DataTable rows={r.rows} empty="No purchases yet" onRow={p => openPurchase(p.purchaseId)} cols={[{ h: 'ID', k: p => p.purchaseId }, { h: LT('vendor'), k: p => <b>{p.vendor}</b> }, { h: LT('billno'), k: p => p.billNo }, { h: 'Vendor Bill Date', k: p => dtm(p.date), nw: true }, { h: 'Upload Date', k: p => dtm('', p.at), nw: true }, { h: LT('qty'), k: p => `${p.qtyReceived}/${p.qtyOrdered}`, align: 'right' }].concat(a ? [{ h: LT('total'), k: p => inr(p.amount), align: 'right' }] : []).concat([{ h: LT('status'), k: p => <Pill s={p.status} /> }])} /><Pager res={r} onPage={p => set('page', p)} /></>}
  </Box>;
}

/* ---------- new purchase ---------- */
function pickFiles(camera) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,application/pdf,.pdf';
    if (camera) i.setAttribute('capture', 'environment'); else i.multiple = true;
    i.onchange = () => res(Array.from(i.files || [])); i.click();
  });
}
export { pickFiles };
function readBillFile(f) {
  if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) return new Promise((resolve, reject) => {
    if (f.size > 5000000) return reject(new Error(f.name + ': PDF is bigger than 5 MB. Take a photo of the bill instead.'));
    const fr = new FileReader(); fr.onerror = () => reject(new Error('Could not read ' + f.name)); fr.onload = () => resolve(String(fr.result).replace(/^data:[^;]*;/, 'data:application/pdf;')); fr.readAsDataURL(f);
  });
  return shrinkImage(f, 1600, 0.8);
}
const CAT_GUESS = [[/monitor|led\b/i, 'Monitor'], [/\bssd\b/i, 'SSD'], [/\bram\b|ddr/i, 'RAM'], [/\bhdd\b|hard disk/i, 'HDD'], [/laptop|notebook/i, 'Laptop'], [/mouse/i, 'Mouse'], [/keyboard|\bkb\b/i, 'Keyboard'], [/printer|toner|cartridge/i, 'Printer'], [/cctv|dvr|nvr|camera/i, 'CCTV'], [/cable|lan|router|switch|wifi|wi-fi/i, 'Networking'], [/cabinet|desktop|\bpc\b/i, 'Desktop']];

function PurchaseForm({ params }) {
  const a = isAdmin();
  const PF = useRef(null);
  if (!PF.current) { PF.current = { rid: rid(), preSerial: params.serial || '' }; params.serial = ''; }
  const [head, setHead] = useState({ vendor: '', billNo: '', date: todayStr(), note: '' });
  const [lines, setLines] = useState([]), [bills, setBills] = useState([]), [pending, setPending] = useState([]), [msg, setMsg] = useState(null);
  const linesRef = useRef(lines); linesRef.current = lines;
  const addLine = (p, item) => {
    const ex = linesRef.current.find(l => l.productId === p.ProductID);
    if (ex && p.TrackingType === 'SERIAL' && item) return toast('Scan the NEW serial number, not an item already in stock', 'bad');
    if (ex) return toast('Product already in list', '');
    const l = { productId: p.ProductID, name: p.Name, tr: p.TrackingType, qo: 1, qr: 1, price: '', ser: PF.current.preSerial && p.TrackingType === 'SERIAL' ? PF.current.preSerial : '' }; PF.current.preSerial = '';
    setLines(x => x.concat([l]));
  };
  useEffect(() => { if (params.productId) { const id = params.productId; params.productId = ''; api('prod.get', { id }).then(p => addLine({ ProductID: p.ProductID, Name: p.Name, TrackingType: p.TrackingType, Category: p.Category })).catch(() => { }); } }, []);
  const updLine = (i, k, v) => setLines(ls => ls.map((l, j) => { if (j !== i) return l; const n = { ...l, [k]: v }; if (k === 'qo' && +n.qr > +n.qo) n.qr = n.qo; return n; }));
  const scanBills = async files => {
    const room = 6 - bills.length; let bl = bills.slice();
    if (files.length > room) { toast('Maximum 6 bill files', 'bad'); files = files.slice(0, Math.max(room, 0)); }
    let add = 0, ok = 0, info = ''; const fail = [], h = { ...head }, nl = linesRef.current.slice(), np = pending.slice();
    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      setMsg({ sev: 'info', t: `Reading bill ${k + 1} of ${files.length}... (10-20 seconds each)` });
      let url; try { url = await readBillFile(f); } catch (e) { fail.push(e.message); continue; }
      bl = bl.concat([{ name: f.name || ('bill ' + (bl.length + 1)), dataUrl: url, pdf: /^data:application\/pdf/.test(url) }]); setBills(bl);
      try {
        const r = await api('pur.scan', { dataUrl: url });
        ok++;
        if (r.vendor && !h.vendor) h.vendor = r.vendor;
        if (r.billNo && !h.billNo) h.billNo = r.billNo;
        if (r.date && ok === 1) h.date = r.date;
        r.lines.forEach(l => { if (nl.find(x => x.productId === l.productId)) return; nl.push({ productId: l.productId, name: l.name, tr: l.tracking, qo: l.qty, qr: l.qty, price: l.price, ser: (l.serials || []).join('\n') }); add++; });
        r.pending.forEach(u => np.push(u));
        info = `Vendor: ${h.vendor || '?'} · Bill no: ${h.billNo || '?'}`;
      } catch (e) { fail.push((f.name || 'file') + ': ' + (e.message || 'could not read')); }
    }
    setHead(h); setLines(nl); setPending(np);
    setMsg({ sev: 'info', t: <><b>{ok} bill file(s) read.</b> {info} · {add} product(s) added.<br />Please CHECK name, qty and price of every line before Save.{fail.length > 0 && <><br /><span style={{ color: '#b91c1c' }}>{fail.map((x, i) => <span key={i}>{x}<br /></span>)}</span></>}{np.length > 0 && <><br /><b>{np.length} bill item(s) need your choice</b> (not found exactly in your product list) - see below.</>}</> });
  };
  const pushPending = (i, prod) => {
    const p = pending[i];
    if (linesRef.current.find(x => x.productId === prod.ProductID)) toast('Product already in list', '');
    else setLines(ls => ls.concat([{ productId: prod.ProductID, name: prod.Name, tr: prod.TrackingType, qo: p.qty, qr: p.qty, price: p.price, ser: prod.TrackingType !== 'QTY' ? p.serials.join('\n') : '' }]));
    setPending(ps => ps.filter((x, j) => j !== i));
  };
  const newFromBill = i => {
    const p = pending[i], cats = S.boot.categories;
    let cat = (CAT_GUESS.find(g => g[0].test(p.text)) || [])[1]; if (!cats.includes(cat)) cat = cats.includes('Other') ? 'Other' : cats[0];
    const tr = p.serials.length ? 'SERIAL' : (['Monitor', 'Laptop', 'Desktop', 'Printer'].includes(cat) ? 'SERIAL' : (['SSD', 'RAM', 'HDD'].includes(cat) ? 'ITEMID' : 'QTY'));
    const v = { n: p.text, c: cat, t: tr };
    openDialog('New product from bill', () => <NewFromBill v={v} />, {
      maxWidth: 'sm', actions: close => <><Button color="inherit" onClick={close}>Cancel</Button><Button variant="contained" onClick={() => work(async () => {
        const r = await api('prod.save', { name: v.n, category: v.c, trackingType: v.t, reorderLevel: 0, sellPrice: 0, costPrice: p.price === '' ? undefined : p.price, description: 'Created from bill' });
        if (v.file) { try { await uploadPhoto(r.id, v.file); } catch (e) { toast('Product banyu, photo save na thayo: ' + e.message, 'bad'); } } close(); const pr = await api('prod.get', { id: r.id }); pushPending(i, pr); toast('Product created', 'ok');
      })}>Create & add</Button></>
    });
  };
  const save = () => work(async () => {
    const body = { vendor: head.vendor, billNo: head.billNo, date: head.date, note: head.note, bills: bills.map(b => ({ dataUrl: b.dataUrl })), lines: lines.map(l => ({ productId: l.productId, qtyOrdered: +l.qo, qtyReceived: +l.qr, price: +l.price, serials: splitSerials(l.ser) })) };
    const r = await api('pur.create', body, { rid: PF.current.rid });
    PF.current.rid = rid();
    openDialog('✓ ' + LT('newpurchase') + ' ' + r.purchaseId, () => <><Alert severity="info">Status: <Pill s={r.status} /> · {r.items.length} item(s) registered</Alert>{r.items.length > 0 && <DataTable rows={r.items} cols={[{ h: LT('itemid'), k: i => i.itemId }, { h: LT('serialno'), k: i => i.serial || '-' }, { h: LT('products'), k: i => i.productName }]} />}</>, {
      maxWidth: 'sm', sticky: true, onClose: () => go('purchase'), actions: close => <>{r.items.length > 0 && <Button variant="contained" startIcon={<PrintIcon />} onClick={() => { close(); setTimeout(() => go('print', { itemIds: r.items.map(i => i.itemId) }), 0); }}>{LT('printsticker')}</Button>}<Button onClick={close}>OK</Button></>
    });
  });
  const tot = a ? 'Total received: ' + inr(lines.reduce((s, l) => s + (+l.qr || 0) * (+l.price || 0), 0)) : 'Total pieces received: ' + lines.reduce((s, l) => s + (+l.qr || 0), 0);
  const H = (k, v) => setHead(h => ({ ...h, [k]: v }));
  return <Box>
    <PageHead title={LI('newpurchase')}><Button variant="outlined" onClick={() => go('purchase')}>{LT('cancel')}</Button></PageHead>
    <Card><CardContent><Stack gap={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth label={LT('vendor') + ' *'} value={head.vendor} onChange={e => H('vendor', e.target.value)} autoComplete="off" /><TextField fullWidth label={LT('billno') + ' *'} value={head.billNo} onChange={e => H('billNo', e.target.value)} /><TextField fullWidth type="date" label={LT('date')} InputLabelProps={{ shrink: true }} value={head.date} onChange={e => H('date', e.target.value)} /></Stack>
      <Typography variant="subtitle2">Bill - photo or PDF (you can choose many together)</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button variant="contained" size="large" startIcon={<ImageIcon />} onClick={async () => { const fs = await pickFiles(false); if (fs.length) work(() => scanBills(fs)); }}>Choose bill files (photo / PDF) - auto fill</Button>
        <Button variant="outlined" startIcon={<CameraAltIcon />} onClick={async () => { const fs = await pickFiles(true); if (fs.length) work(() => scanBills(fs)); }}>Camera</Button>
      </Stack>
      <Stack direction="row" gap={1} flexWrap="wrap">{bills.map((b, i) => <Chip key={i} label={(b.pdf ? '📄 ' : '🖼️ ') + b.name} onDelete={() => setBills(bills.filter((x, j) => j !== i))} />)}</Stack>
      {msg && <Alert severity={msg.sev}>{msg.t}</Alert>}
      {pending.map((p, i) => <PendingCard key={i} p={p} onUse={async pid => { if (!pid) return toast('Choose a product from the list first', 'bad'); try { const pr = await api('prod.get', { id: pid }, { loader: true }); pushPending(i, pr); } catch (e) { toast(e.message, 'bad'); } }} onNew={() => newFromBill(i)} onSkip={() => setPending(ps => ps.filter((x, j) => j !== i))} />)}
      {!a && <Typography variant="caption" color="text.secondary">Bill is private. Only Admin can open it.</Typography>}
    </Stack></CardContent></Card>
    <Card sx={{ mt: 2 }}><CardContent>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{LT('products')}</Typography>
      <ProductPicker placeholder="Search product or scan barcode to add" onPick={addLine} />
      <Box sx={{ mt: 2 }}>{lines.length ? lines.map((l, i) => <Paper key={l.productId} variant="outlined" sx={{ p: 1.5, mb: 1.2 }}>
        <Stack direction="row" gap={1.5} alignItems="center"><Thumb id={l.productId} /><Box sx={{ flex: 1 }}><b>{l.name}</b><br /><Chip size="small" label={lineTrkNote(l.tr)} /></Box><IconButton color="error" onClick={() => setLines(ls => ls.filter((x, j) => j !== i))}><CloseIcon /></IconButton></Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 1.5 }}>
          <TextField fullWidth type="number" label="Qty ordered" inputProps={{ min: 1 }} value={l.qo} onChange={e => updLine(i, 'qo', e.target.value)} />
          <TextField fullWidth type="number" label="Qty received now" inputProps={{ min: 0 }} value={l.qr} onChange={e => updLine(i, 'qr', e.target.value)} />
          <TextField fullWidth type="number" label={LT('price') + ' ₹ (per piece) *'} inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }} value={l.price} onChange={e => updLine(i, 'price', e.target.value)} />
        </Stack>
        {l.tr !== 'QTY' && <Box sx={{ mt: 1.5 }}>
          <TextField fullWidth multiline minRows={2} label={<>{l.tr === 'SERIAL' ? 'Serial numbers (one per line)' : 'Manufacturer serials (optional, one per line)'} — {splitSerials(l.ser).length} / {l.qr}</>} placeholder="Scan or type one serial per line" value={l.ser} onChange={e => updLine(i, 'ser', e.target.value)} />
          <Button size="small" startIcon={<QrCodeScannerIcon />} sx={{ mt: .5 }} onClick={() => openScanner(code => setLines(ls => ls.map((x, j) => j === i ? { ...x, ser: (x.ser ? x.ser.trim() + '\n' : '') + code } : x)), LT('scanserial'))}>{LT('scan')}</Button>
        </Box>}
      </Paper>) : <Empty>Search or scan a product to add it</Empty>}</Box>
    </CardContent></Card>
    <Card sx={{ mt: 2 }}><CardContent><Stack gap={2}>
      <TextField label="Note" value={head.note} onChange={e => H('note', e.target.value)} />
      {!a && <Alert severity="info">🔒 You type the purchase price once. After saving, only Admin can see it.</Alert>}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}><b>{tot}</b><Button variant="contained" color="success" size="large" startIcon={<SaveIcon />} onClick={save}>{LT('save')}</Button></Stack>
    </Stack></CardContent></Card>
  </Box>;
}
function PendingCard({ p, onUse, onNew, onSkip }) {
  const [sel, setSel] = useState('');
  return <Paper variant="outlined" sx={{ p: 1.5, border: '2px solid #f59e0b' }}>
    <div><b>Bill says:</b> {p.text}</div><small>Qty {p.qty}{p.price !== '' ? ' · Price ₹' + p.price + ' per piece' : ''}{p.serials.length ? ' · Serial: ' + p.serials.join(', ') : ''}</small>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mt: 1 }} alignItems={{ sm: 'center' }}>
      <TextField select fullWidth label="Same as which product in your list?" value={sel} onChange={e => setSel(e.target.value)}><MenuItem value="">- choose -</MenuItem>{p.cands.map(c => <MenuItem key={c.productId} value={c.productId}>{c.name}</MenuItem>)}</TextField>
      <Button variant="contained" onClick={() => onUse(sel)} sx={{ whiteSpace: 'nowrap' }}>Use this product</Button><Button variant="outlined" onClick={onNew} sx={{ whiteSpace: 'nowrap' }}>Create new product</Button><Button onClick={onSkip}>Skip</Button>
    </Stack>
    <Typography variant="caption" color="text.secondary">Not in the list? Search the product in the search box below, or press Create new product.</Typography>
  </Paper>;
}
function NewFromBill({ v }) {
  const [, setN] = useState(0); const set = (k, x) => { v[k] = x; setN(n => n + 1); };
  return <Stack gap={2} sx={{ pt: 1 }}><TextField label="Name *" value={v.n} onChange={e => set('n', e.target.value)} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField select fullWidth label="Category" value={v.c} onChange={e => set('c', e.target.value)}>{S.boot.categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
      <TextField select fullWidth label="Tracking" value={v.t} onChange={e => set('t', e.target.value)}><MenuItem value="SERIAL">Manufacturer serial number</MenuItem><MenuItem value="ITEMID">Internal Item ID</MenuItem><MenuItem value="QTY">Quantity only</MenuItem></TextField></Stack>
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Button variant="outlined" startIcon={<CameraAltIcon />} onClick={async () => { const f = await pickFile(true); if (f) set('file', f); }}>Camera</Button><Button variant="outlined" startIcon={<ImageIcon />} onClick={async () => { const f = await pickFile(false); if (f) set('file', f); }}>Gallery</Button>{v.file && <small>✓ Photo: {v.file.name || 'selected'}</small>}</Stack></Stack>;
}

/* ---------- open purchase: details, view bill, receive remaining goods ---------- */
export async function openPurchase(id) {
  let p; try { p = await api('pur.get', { id }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); }
  const a = isAdmin(), pend = p.lines.filter(l => l.qtyReceived < l.qtyOrdered);
  const rec = {}; pend.forEach(l => { rec[l.lineId] = { qty: 0, ser: '' }; });
  const _rid = rid();
  openDialog(p.purchaseId + ' · ' + p.vendor, () => <PurView p={p} a={a} pend={pend} rec={rec} />, {
    maxWidth: 'lg', actions: close => <>
      {a && p.hasBill && <Button onClick={() => viewBill(p.purchaseId)}>View bill</Button>}
      {p.items.length > 0 && <Button startIcon={<PrintIcon />} onClick={() => { close(); go('print', { itemIds: p.items.map(i => i.itemId) }); }}>{LT('printsticker')}</Button>}
      {pend.length > 0 && <Button variant="contained" color="success" onClick={() => work(async () => {
        const lines = pend.map(l => ({ lineId: l.lineId, qty: +rec[l.lineId].qty, serials: l.tracking !== 'QTY' ? splitSerials(rec[l.lineId].ser) : [] })).filter(l => l.qty > 0);
        if (!lines.length) throw new Error('Enter quantity to receive.');
        const r = await api('pur.receive', { purchaseId: p.purchaseId, lines }, { rid: _rid }); toast('Goods received', 'ok'); close(); if (S.route === 'purchase') refresh();
        if (r.items.length) openDialog('Print stickers?', () => <Typography>{r.items.length} new item(s) registered.</Typography>, { maxWidth: 'xs', actions: c2 => <><Button variant="contained" startIcon={<PrintIcon />} onClick={() => { c2(); go('print', { itemIds: r.items.map(i => i.itemId) }); }}>{LT('printsticker')}</Button><Button onClick={c2}>{LT('close')}</Button></> });
      })}>Receive goods</Button>}
    </>
  });
}
function PurView({ p, a, pend, rec }) {
  const [, setN] = useState(0);
  return <>
    <Grid cols={4} sx={{ mb: 2 }}><Stat label={LT('billno')} value={<span style={{ fontSize: 15 }}>{p.billNo}</span>} /><Stat label={LT('date')} value={<span style={{ fontSize: 15 }}>{dtm(p.date, p.at)}</span>} /><Stat label={LT('status')} value={<Pill s={p.status} />} />{a ? <Stat label={LT('total')} value={<span style={{ fontSize: 15 }}>{inr(p.total)}</span>} /> : <Stat label="By" value={<span style={{ fontSize: 15 }}>{p.by}</span>} />}</Grid>
    <DataTable rows={p.lines} cols={[{ h: LT('products'), k: l => l.name }, { h: LT('qty'), k: l => `${l.qtyReceived}/${l.qtyOrdered}`, align: 'right' }].concat(a ? [{ h: LT('price'), k: l => inr(l.price), align: 'right' }] : [])} />
    {p.items.length > 0 && <><Typography variant="h6" fontWeight={800} sx={{ my: 1.5 }}>{LI('items')}</Typography><DataTable rows={p.items} cols={[{ h: LT('itemid'), k: i => i.itemId }, { h: LT('serialno'), k: i => i.serial || '-' }, { h: LT('status'), k: i => <Pill s={i.status} /> }]} /></>}
    {pend.length > 0 && <><Typography variant="h6" fontWeight={800} sx={{ my: 1.5 }}>Receive remaining goods</Typography>
      {pend.map(l => <Paper key={l.lineId} variant="outlined" sx={{ p: 1.5, mb: 1 }}><b>{l.name}</b> <small>(pending {l.qtyOrdered - l.qtyReceived})</small>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 1 }}><TextField type="number" label="Receive now" inputProps={{ min: 0, max: l.qtyOrdered - l.qtyReceived }} value={rec[l.lineId].qty} onChange={e => { rec[l.lineId].qty = e.target.value; setN(n => n + 1); }} />
          {l.tracking !== 'QTY' && <TextField fullWidth multiline minRows={2} label="Serials (one per line)" value={rec[l.lineId].ser} onChange={e => { rec[l.lineId].ser = e.target.value; setN(n => n + 1); }} />}</Stack></Paper>)}</>}
  </>;
}
async function viewBill(id) {
  let us; try { us = await api('pur.bill', { id }, { loader: true }); } catch (e) { return toast(e.message, 'bad'); }
  openDialog('Bill', () => <>{us.map((u, i) => /^data:application\/pdf/.test(u) ? <Box key={i}><Button variant="contained" href={u} download="bill.pdf" target="_blank" sx={{ mb: 1 }}>📄 Open / download PDF bill</Button><iframe title="bill" src={u} style={{ width: '100%', height: '60vh', border: 0 }} /></Box> : <img key={i} src={u} alt="" style={{ width: '100%', marginBottom: 10 }} />)}</>);
}
