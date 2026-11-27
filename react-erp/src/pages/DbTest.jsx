import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Alert, Paper } from '@mui/material';
import { api } from '../lib/core.js';
import { PageHead } from '../lib/ui.jsx';
import { supaSelect, supaOn, prodListDb } from '../lib/supa.js';

const time = async f => { const t = performance.now(); const r = await f(); return { ms: Math.round(performance.now() - t), r }; };
export default function DbTest() {
  const [out, setOut] = useState([]), [busy, setBusy] = useState(false), [on, setOn] = useState(supaOn()), [cmp, setCmp] = useState('');
  const flip = () => { const v = !on; try { localStorage.setItem('ccDb', v ? '1' : '0'); } catch (e) { } setOn(v); };
  const compare = async () => { setCmp('Check chale chhe...'); try { const a = await api('prod.list', { size: 50, page: 1, status: 'active' }, { loader: false, fresh: true }), b = await prodListDb({ size: 50, page: 1, status: 'active' }); let bad = 0; a.rows.forEach((x, i) => { const y = b.rows[i]; if (!y || x.ProductID !== y.ProductID || x.Name !== y.Name || +x.stock.available !== y.stock.available || +x.stock.physical !== y.stock.physical || (+x.photos || 0) !== y.photos || +x.SellPrice !== +y.SellPrice) bad++; }); setCmp('Sheets ' + a.total + ' / Database ' + b.total + ' products. Pehla 50 ma farak: ' + bad + (bad || a.total !== b.total ? ' ❌' : ' ✅ badhu sarkhu')); } catch (e) { setCmp('Error: ' + e.message); } };
  const run = async () => {
    setBusy(true); const o = [];
    try {
      for (let k = 1; k <= 3; k++) {
        const a = await time(() => api('prod.list', { size: 50, page: 1, status: 'active' }, { loader: false, fresh: true }));
        const b = await time(async () => { const p = await supaSelect('erp_product_master', { select: 'productid,name,category,brand,sellprice,active', limit: 50, order: 'name', filter: { active: 'eq.YES' } }); const ids = p.rows.map(x => x.productid); const s = await supaSelect('erp_stock_register', { select: 'productid,available,physical', filter: { productid: 'in.(' + ids.join(',') + ')' } }); return { p, s }; });
        o.push({ k, sheets: a.ms, db: b.ms, sRows: a.r.rows.length, dRows: b.r.p.rows.length, sTot: a.r.total, dTot: b.r.p.total });
      }
    } catch (e) { o.push({ err: e.message }); }
    setOut(o); setBusy(false);
  };
  return <Box><PageHead title="Database test (Admin)" />
    <Alert severity="info" sx={{ mb: 2 }}>Aa fakt test chhe. App haju Google Sheets thi j chale chhe. Button dabavo - Sheets vs Database nu speed (ms) ane product ni sankhya batavse.</Alert>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}><Button variant="outlined" onClick={compare}>Data sarkhavo (Sheets vs DB)</Button><Button variant={on ? 'contained' : 'outlined'} color={on ? 'success' : 'inherit'} onClick={flip}>Products page database thi: {on ? 'ON' : 'OFF'}</Button></Stack>{cmp && <Alert sx={{ mb: 2 }} severity="info">{cmp}</Alert>}
    <Button variant="contained" disabled={busy} onClick={run}>{busy ? 'Test chale chhe...' : 'Speed test chalavo'}</Button>
    <Stack gap={1} sx={{ mt: 2 }}>{out.map((x, i) => <Paper key={i} sx={{ p: 1.5 }}>{x.err ? <Typography color="error">{x.err}</Typography> : <Typography>Test {x.k}: <b>Sheets {x.sheets} ms</b> · <b>Database {x.db} ms</b> · products Sheets {x.sTot} / Database {x.dTot}</Typography>}</Paper>)}</Stack>
  </Box>;
}
