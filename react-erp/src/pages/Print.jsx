import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography, Tab, Tabs, Alert, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api, S, esc, LI, LT, rid, toast, work, barcodeSvg } from '../lib/core.js';
import { PageHead, Skel, DataTable, Pager, Section, Grid, openDialog, openScanner, ProductPicker, Empty } from '../lib/ui.jsx';
import { useList } from '../lib/hooks.js';

/* ---------- Print stickers (same label maths as the live ERP) ---------- */
export const PQ = { items: [], tpl: 'PRODUCT', size: (() => { try { const v = localStorage.getItem('ccStickerSize'); return v && /^\d+x\d+$/.test(v) ? v : '50x25'; } catch (e) { return '50x25'; } })(), tab: 'make' };
const SIZES = { '50x25': [50, 25], '50x30': [50, 30], '50x38': [50, 38], '50x40': [50, 40], '20x10': [20, 10] };
function fitBarcode(value, availMm) {
  const bc = barcodeSvg(value); let k = Math.floor(availMm * 8 / bc.modules); const small = k < 1; if (k < 1) k = 1;
  return { svg: bc.svg, w: bc.modules * k / 8, k, small };
}
function labelHtml(l, tpl, size) {
  const [W, H] = SIZES[size], big = W >= 40, f = H >= 35 ? 1.3 : 1, bh = Math.min(17, H - 16.5), pad = big ? 1.3 : 0.6, avail = W - pad * 2;
  const bc = fitBarcode(l.barcode, avail), name = esc(((l.name || '') + ' ' + (l.model || '')).trim());
  const svg = h => bc.svg.replace('<svg ', `<svg width="${bc.w}mm" height="${h}mm" `);
  let inner;
  if (tpl === 'BARCODE') inner = `<div style="margin:auto">${svg(big ? Math.min(25, H - 8) : 7)}</div>`;
  else if (big) inner = `<div style="font:700 ${7.5 * f}pt Arial;line-height:1">C COMPUTER</div><div style="font:${6.3 * f}pt Arial;line-height:1.1;height:2.3em;overflow:hidden;margin-top:.4mm">${name}</div>${l.serial ? `<div style="font:${5.8 * f}pt Arial;line-height:1.1">S/N: ${esc(l.serial)}</div>` : ''}<div style="margin:.6mm auto 0">${svg(bh)}</div><div style="font:${5.8 * f}pt Arial;text-align:center;line-height:1.1">${esc(l.itemId)}</div>`;
  else inner = `<div style="margin:auto">${svg(5.5)}</div><div style="font:4pt Arial;text-align:center;line-height:1.1">${esc(l.itemId)}</div>`;
  return `<div class="lbl" style="width:${W}mm;height:${H}mm;padding:${pad}mm;box-sizing:border-box;${tpl === 'BARCODE' ? 'justify-content:center' : ''}">${inner}</div>`;
}
export function doPrint(html, size) {
  const [W, H] = Array.isArray(size) ? size : SIZES[size];
  const one = (html.match(/class="lbl"/g) || []).length === 1;
  const old = document.getElementById('printFrame'); if (old) old.remove();
  const f = document.createElement('iframe'); f.id = 'printFrame'; f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);
  const d = f.contentWindow.document; d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Sticker</title><style>@page{size:${W}mm ${H}mm;margin:0}html,body{margin:0;padding:0;background:#fff;width:${W}mm}.lbl{page-break-after:always;break-after:page;overflow:hidden;background:#fff;color:#000;font-family:Arial,sans-serif;display:flex;flex-direction:column;justify-content:center}.lbl:last-child{page-break-after:auto;break-after:auto}.lbl svg{display:block}${one ? `html,body{height:${H - 0.4}mm;overflow:hidden}.lbl{height:${H - 0.4}mm!important}` : ''}</style></head><body>${html}</body></html>`);
  d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { } setTimeout(() => { try { f.remove(); } catch (e) { } }, 120000); }, 350);
}
export default function Print({ params }) {
  const [tab, setTab] = useState(PQ.tab), [, setN] = useState(0); const re = () => setN(n => n + 1);
  useEffect(() => { if (params.itemIds || params.productIds) { const p = { itemIds: params.itemIds, productIds: params.productIds }; params.itemIds = params.productIds = undefined; api('print.data', p, { loader: true }).then(rows => { rows.forEach(addPrintRow); re(); }).catch(e => toast(e.message, 'bad')); } }, []);
  return <Box>
    <PageHead title={LI('print')} />
    <Tabs value={tab} onChange={(e, v) => { PQ.tab = v; setTab(v); }} sx={{ mb: 2 }}><Tab value="make" label={LT('printsticker')} /><Tab value="hist" label="History" /></Tabs>
    {tab === 'make' ? <Make re={re} /> : <Hist />}
  </Box>;
}
function Make({ re }) {
  const add = rows => { rows.forEach(addPrintRow); re(); };
  const onPick = async (p, item) => {
    try {
      if (item) return add(await api('print.data', { itemIds: [item.itemId] }));
      if (p.TrackingType === 'QTY') return add(await api('print.data', { productIds: [p.ProductID] }));
      const r = await api('serial.list', { productId: p.ProductID, status: 'Available', size: 100 }, { loader: true });
      if (!r.rows.length) return toast('No available items for this product', 'bad');
      const sel = new Set(r.rows.map(i => i.itemId));
      openDialog(p.Name, () => <ChooseItems rows={r.rows} sel={sel} />, { maxWidth: 'sm', actions: close => <Button variant="contained" onClick={async () => { const ids = [...sel]; close(); if (ids.length) add(await api('print.data', { itemIds: ids }, { loader: true })); }}>OK</Button> });
    } catch (e) { toast(e.message, 'bad'); }
  };
  const total = PQ.items.reduce((a, i) => a + i.qty, 0);
  const go = () => work(async () => {
    const sm = PQ.size === '20x10' ? fitBarcode(PQ.items[0].barcode, 19).small : false; if (sm) toast('Barcode is too long for this label size', 'bad');
    const html = PQ.items.map(i => Array(i.qty).fill(labelHtml(i, PQ.tpl, PQ.size)).join('')).join('');
    await api('print.log', { refs: PQ.items.map(i => i.ref), size: PQ.size, template: PQ.tpl, qty: Math.max(...PQ.items.map(i => i.qty)) }, { rid: rid() });
    doPrint(html, PQ.size);
  });
  const test = () => { const [W, H] = SIZES[PQ.size], t = { barcode: '9000000001', name: 'TEST STICKER', model: 'Model X', serial: 'ABC123456', itemId: 'CC-ITM-00001' }; doPrint(`<div class="lbl" style="width:${W}mm;height:${H}mm;box-sizing:border-box;border:.3mm solid #000;position:relative">${labelHtml(t, 'PRODUCT', PQ.size).replace('class="lbl"', 'class="lbl" data-t')}</div>`, PQ.size); };
  return <Grid cols={2}>
    <Section title="1. Choose what to print">
      <ProductPicker placeholder="Search product (for qty items: mouse, cable...)" onPick={onPick} />
      <Button sx={{ my: 1 }} variant="outlined" startIcon={<QrCodeScannerIcon />} onClick={() => openScanner(async c => { try { const r = await api('scan', { code: c }, { loader: true }); add(await api('print.data', r.item ? { itemIds: [r.item.itemId] } : { productIds: [r.product.ProductID] })); } catch (e) { toast(e.message, 'bad'); } })}>{LT('scan')} item / barcode</Button>
      {PQ.items.length ? <DataTable rows={PQ.items} cols={[{ h: 'Label', k: i => <><b>{i.name}</b><br /><small>{i.serial || i.itemId}</small></> }, { h: 'Copies', k: i => <TextField size="small" type="number" sx={{ width: 80 }} inputProps={{ min: 1, max: 99 }} value={i.qty} onChange={e => { i.qty = Math.max(1, Math.min(99, +e.target.value || 1)); re(); }} /> }, { h: '', k: (i, n) => <IconButton color="error" size="small" onClick={() => { PQ.items.splice(n, 1); re(); }}><CloseIcon fontSize="small" /></IconButton>, align: 'right' }]} />
        : <Empty>Search a product, scan a serial, or pick items from Purchase / Serial screens.</Empty>}
    </Section>
    <Section title="2. Sticker options">
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <TextField select fullWidth label="Template" value={PQ.tpl} onChange={e => { PQ.tpl = e.target.value; re(); }}><MenuItem value="PRODUCT">A. Product sticker (name, model, serial, ID, barcode)</MenuItem><MenuItem value="BARCODE">B. Barcode only</MenuItem></TextField>
        <TextField select fullWidth label="Label size" value={PQ.size} onChange={e => { PQ.size = e.target.value; try { localStorage.setItem('ccStickerSize', PQ.size); } catch (x) { } re(); }}>{Object.keys(SIZES).map(k => <MenuItem key={k} value={k}>{k.replace('x', ' × ')} mm</MenuItem>)}</TextField>
      </Stack>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2 }}>3. {LT('preview')}</Typography>
      <Box>{PQ.items.length ? PQ.items.slice(0, 4).map((i, k) => <span key={k} className="prevlbl" style={{ zoom: SIZES[PQ.size][0] >= 40 ? 2.2 : 4 }} dangerouslySetInnerHTML={{ __html: labelHtml(i, PQ.tpl, PQ.size) }} />) : <Empty>Nothing to preview</Empty>}</Box>
      <Stack direction="row" gap={1} sx={{ mt: 2 }}><Button variant="contained" color="success" startIcon={<PrintIcon />} disabled={!PQ.items.length} onClick={go}>{LT('print1')} {total} label(s)</Button><Button variant="outlined" onClick={test}>Test sticker</Button></Stack>
      <Alert severity="warning" sx={{ mt: 1.5 }}>Printer: EXEO EX58L. Print from the print window: choose the EX58L printer, paper size = the label size shown here, margins = None, scale = 100%. See the printer guide.</Alert>
    </Section>
  </Grid>;
}
function ChooseItems({ rows, sel }) {
  const [, setN] = useState(0);
  return <><Alert severity="info">Choose items to print ({rows.length})</Alert><Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>{rows.map(i => <Box key={i.itemId}><FormControlLabel control={<Checkbox checked={sel.has(i.itemId)} onChange={e => { e.target.checked ? sel.add(i.itemId) : sel.delete(i.itemId); setN(n => n + 1); }} />} label={<>{i.serial || '-'} <small>({i.itemId})</small></>} /></Box>)}</Box></>;
}
function Hist() {
  const [r] = useList('print.history', {});
  return !r ? <Skel /> : <><DataTable rows={r.rows} empty="Nothing printed yet" cols={[{ h: LT('date'), k: p => p.dt.slice(0, 16) }, { h: 'Ref', k: p => p.ref }, { h: 'Template', k: p => p.template }, { h: 'Size', k: p => p.size }, { h: LT('qty'), k: p => p.qty, align: 'right' }, { h: 'By', k: p => p.by }]} /><Pager res={r} onPage={() => { }} /></>;
}
