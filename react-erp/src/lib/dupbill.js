/* Is this vendor invoice already entered? (matches bill number ignoring spaces/symbols/case) */
import { api } from './core.js';
const nz = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export async function findDupBill(vendor, billNo) {
  const b = nz(billNo); if (b.length < 3) return null;
  try {
    const r = await api('pur.list', { q: String(billNo).trim(), page: 1, size: 20 }, { loader: false, fresh: true });
    const hit = (r.rows || []).find(x => nz(x.billNo) === b);
    if (hit) return { id: hit.purchaseId, vendor: hit.vendor, date: hit.date, status: hit.status };
  } catch (e) { }
  return null;
}
export const dupText = d => `⚠ Aa invoice already entry thai gayo chhe: ${d.id} · ${d.vendor || ''}${d.date ? ' · ' + d.date : ''}. Pharithi entry na karo (double stock thai jase).`;
