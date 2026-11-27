import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Alert, Paper } from '@mui/material';
import { api } from '../lib/core.js';
import { PageHead } from '../lib/ui.jsx';
import { supaSelect } from '../lib/supa.js';

const time = async f => { const t = performance.now(); const r = await f(); return { ms: Math.round(performance.now() - t), r }; };
export default function DbTest() {
  const [out, setOut] = useState([]), [busy, setBusy] = useState(false);
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
    <Button variant="contained" disabled={busy} onClick={run}>{busy ? 'Test chale chhe...' : 'Speed test chalavo'}</Button>
    <Stack gap={1} sx={{ mt: 2 }}>{out.map((x, i) => <Paper key={i} sx={{ p: 1.5 }}>{x.err ? <Typography color="error">{x.err}</Typography> : <Typography>Test {x.k}: <b>Sheets {x.sheets} ms</b> · <b>Database {x.db} ms</b> · products Sheets {x.sTot} / Database {x.dTot}</Typography>}</Paper>)}</Stack>
  </Box>;
}
